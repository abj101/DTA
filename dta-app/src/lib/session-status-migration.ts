import { isFullPage, iteratePaginatedAPI } from "@notionhq/client";

import { FREE_STATUS, LEGACY_FREE_STATUS, isAccountable } from "./accounting-rows.ts";
import { CHARGE_PROPS, PAYMENT_PROP, dashless, statusColumnName } from "./charges.ts";
import { chargesBySession } from "./notion-charges.ts";
import { notion, resolveDataSourceId, sessionsDataSourceId, toSession } from "./notion-sessions.ts";
import { ensureSessionStatusColumns, resetSessionColumnsCache } from "./session-status-columns.ts";

/*
 * One-time setup for two-way status columns: moves every "N/A" value to "Free", adds
 * "Status 2"... and the hidden "Status Sync" columns to the Session Calendar, removes the old
 * "Payment" summary column, and removes the charges' unused internal "Session Status Applied" column. Safe to
 * re-run: finished steps are skipped.
 */

const OLD_CHARGE_APPLIED = "Session Status Applied";
type Option = { id: string; name: string; color?: string };
type Props = Record<string, { id: string; type: string; select?: { options?: Option[] } }>;

export type StatusMigrationReport = {
  /** Select columns that still have an "N/A" option, with how it will be renamed. */
  renameFree: string[];
  /** A leftover "Payment" column (the summary is now computed from the status columns). */
  hasPaymentColumn: boolean;
  chargesHaveApplied: boolean;
  maxStudents: number;
  /**
   * Billed sessions whose status column disagrees with the matching student's charge. On the
   * first sync the charge wins, so these columns would change.
   */
  mismatches: { title: string; date: string | null; column: string; session: string; charge: string }[];
};

async function props(dataSourceId: string): Promise<Props> {
  const source = await notion().dataSources.retrieve({ data_source_id: dataSourceId });
  return (source as { properties?: Props }).properties ?? {};
}

function chargesSource(): Promise<string> {
  const configured = process.env.NOTION_CHARGES_DATA_SOURCE_ID?.trim();
  if (!configured) return Promise.reject(new Error("NOTION_CHARGES_DATA_SOURCE_ID is not set"));
  return resolveDataSourceId(configured);
}

function selectsWithLegacyFree(all: Props, names: string[]): string[] {
  return names.filter((name) =>
    all[name]?.select?.options?.some((o) => o.name === LEGACY_FREE_STATUS),
  );
}

function statusColumnNames(all: Props): string[] {
  const names: string[] = [];
  for (let i = 0; statusColumnName(i) in all; i++) names.push(statusColumnName(i));
  return names;
}

/** Read-only: what the setup would change. */
export async function planStatusMigration(): Promise<StatusMigrationReport> {
  const sessionsId = await sessionsDataSourceId();
  const chargesId = await chargesSource();
  const [sessionProps, chargeProps, ledger] = await Promise.all([
    props(sessionsId),
    props(chargesId),
    chargesBySession(),
  ]);
  const report: StatusMigrationReport = {
    renameFree: [
      ...selectsWithLegacyFree(sessionProps, statusColumnNames(sessionProps)).map((n) => `Session Calendar · ${n}`),
      ...selectsWithLegacyFree(chargeProps, [CHARGE_PROPS.status]).map((n) => `Session Charges · ${n}`),
    ],
    hasPaymentColumn: PAYMENT_PROP in sessionProps,
    chargesHaveApplied: OLD_CHARGE_APPLIED in chargeProps,
    maxStudents: 0,
    mismatches: [],
  };

  const free = (s: string | null) => (s === LEGACY_FREE_STATUS ? FREE_STATUS : s);
  const studentCache = new Map();
  for await (const page of iteratePaginatedAPI(notion().dataSources.query, {
    data_source_id: sessionsId,
  })) {
    if (!isFullPage(page)) continue;
    const session = await toSession(page, studentCache);
    if (session.deleted || !isAccountable(session)) continue;
    report.maxStudents = Math.max(report.maxStudents, session.studentIds.length);
    if (session.statusSync) continue;
    const charges = ledger.get(dashless(session.pageId)) ?? [];
    session.studentIds.forEach((id, i) => {
      const charge = charges.find((c) => dashless(c.studentId) === dashless(id));
      const column = free(session.statusColumns[i] ?? session.statusColumns[0] ?? null);
      const chargeStatus = free(charge?.status ?? null);
      if (charge && column && column !== chargeStatus) {
        report.mismatches.push({
          title: session.title,
          date: session.start,
          column: statusColumnName(i),
          session: column,
          charge: chargeStatus ?? "",
        });
      }
    });
  }
  return report;
}

/**
 * Moves a select from N/A to Free: adds a Free option, rewrites every N/A value to Free, then
 * drops the N/A option. (Notion's API doesn't rename options in place.) Returns pages changed.
 */
async function replaceLegacyFree(dataSourceId: string, all: Props, names: string[]): Promise<number> {
  if (names.length === 0) return 0;
  const withFree: Record<string, unknown> = {};
  for (const name of names) {
    const options = all[name]?.select?.options ?? [];
    const legacy = options.find((o) => o.name === LEGACY_FREE_STATUS);
    withFree[name] = {
      select: {
        options: [
          ...options.map((o) => ({ id: o.id, name: o.name, color: o.color })),
          ...(options.some((o) => o.name === FREE_STATUS)
            ? []
            : [{ name: FREE_STATUS, color: legacy?.color ?? "gray" }]),
        ],
      },
    };
  }
  await notion().dataSources.update({ data_source_id: dataSourceId, properties: withFree as never });

  const legacyPages = async (name: string) => {
    const ids: string[] = [];
    for await (const page of iteratePaginatedAPI(notion().dataSources.query, {
      data_source_id: dataSourceId,
      filter: { property: name, select: { equals: LEGACY_FREE_STATUS } },
    })) {
      ids.push(page.id);
    }
    return ids;
  };
  let changed = 0;
  for (const name of names) {
    // Collected first: editing while paging through a filtered query can skip pages.
    for (const page_id of await legacyPages(name)) {
      await notion().pages.update({
        page_id,
        properties: { [name]: { select: { name: FREE_STATUS } } },
      } as never);
      changed++;
    }
    const left = await legacyPages(name);
    if (left.length > 0) {
      throw new Error(`${left.length} page(s) still have ${name} = ${LEGACY_FREE_STATUS}; N/A option kept`);
    }
  }

  const fresh = await props(dataSourceId);
  const withoutLegacy: Record<string, unknown> = {};
  for (const name of names) {
    withoutLegacy[name] = {
      select: {
        options: (fresh[name]?.select?.options ?? [])
          .filter((o) => o.name !== LEGACY_FREE_STATUS)
          .map((o) => ({ id: o.id, name: o.name, color: o.color })),
      },
    };
  }
  await notion().dataSources.update({ data_source_id: dataSourceId, properties: withoutLegacy as never });
  return changed;
}

/** Applies the schema changes; the caller then runs a full reconcile to fill the columns. */
export async function applyStatusMigration(): Promise<{ done: string[]; report: StatusMigrationReport }> {
  const report = await planStatusMigration();
  const sessionsId = await sessionsDataSourceId();
  const chargesId = await chargesSource();
  const done: string[] = [];

  // Payment is no longer stored on sessions; the calendar computes it from the status columns.
  if (report.hasPaymentColumn) {
    await notion().dataSources.update({
      data_source_id: sessionsId,
      properties: { [PAYMENT_PROP]: null },
    } as never);
    done.push(`removed ${PAYMENT_PROP} column`);
  }
  // Columns first (Status 2...), so a new Status 2 that copied N/A is converted too.
  resetSessionColumnsCache();
  const added = await ensureSessionStatusColumns(report.maxStudents);
  if (added.length > 0) done.push(`added session columns: ${added.join(", ")}`);

  const sessionProps = await props(sessionsId);
  const sessionMoved = await replaceLegacyFree(
    sessionsId,
    sessionProps,
    selectsWithLegacyFree(sessionProps, statusColumnNames(sessionProps)),
  );
  const chargeProps = await props(chargesId);
  const chargeMoved = await replaceLegacyFree(
    chargesId,
    chargeProps,
    selectsWithLegacyFree(chargeProps, [CHARGE_PROPS.status]),
  );
  if (report.renameFree.length > 0) {
    done.push(`N/A -> Free on ${sessionMoved} session and ${chargeMoved} charge value(s): ${report.renameFree.join(", ")}`);
  }


  if (report.chargesHaveApplied) {
    await notion().dataSources.update({
      data_source_id: chargesId,
      properties: { [OLD_CHARGE_APPLIED]: null },
    } as never);
    done.push(`removed charge column ${OLD_CHARGE_APPLIED}`);
  }
  return { done, report };
}
