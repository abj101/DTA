import { isFullPage, iteratePaginatedAPI } from "@notionhq/client";

import { FREE_STATUS, LEGACY_FREE_STATUS, isAccountable } from "./accounting-rows.ts";
import { CHARGE_PROPS, dashless, statusColumnName } from "./charges.ts";
import { SESSION_CHARGES_BACKLINK } from "./charges-setup.ts";
import { chargesBySession } from "./notion-charges.ts";
import { notion, resolveDataSourceId, sessionsDataSourceId, toSession } from "./notion-sessions.ts";
import { ensureSessionStatusColumns } from "./session-status-columns.ts";

/*
 * One-time setup for two-way status columns: renames the "N/A" option to "Free" (keeping
 * every value), adds "Status 2"... and the hidden "Status Sync" column to the Session
 * Calendar, adds the read-only "Payment" summary, and removes the charges' unused internal
 * "Session Status Applied" column. Safe to re-run: finished steps are skipped.
 */

const OLD_CHARGE_APPLIED = "Session Status Applied";
export const PAYMENT_PROP = "Payment";

/**
 * One word when every charge agrees ("Settled", "Outstanding", "Free"); otherwise each
 * student's status, e.g. "Ana: Settled · Ben: Outstanding". Blank when there are no charges.
 */
export const PAYMENT_FORMULA = `let(
  charges, prop("${SESSION_CHARGES_BACKLINK}"),
  statuses, map(charges, format(current.prop("${CHARGE_PROPS.status}"))),
  if(empty(charges), "",
    if(length(unique(statuses)) == 1, first(statuses),
      join(map(charges, first(split(current.prop("${CHARGE_PROPS.title}"), " — ")) + ": " + format(current.prop("${CHARGE_PROPS.status}"))), " · ")))
)`;

type Option = { id: string; name: string; color?: string };
type Props = Record<string, { id: string; type: string; select?: { options?: Option[] } }>;

export type StatusMigrationReport = {
  /** Select columns that still have an "N/A" option, with how it will be renamed. */
  renameFree: string[];
  sessionHasPayment: boolean;
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
    sessionHasPayment: PAYMENT_PROP in sessionProps,
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

/** Renames N/A to Free in a select, keeping every option (by id) and so every value. */
async function renameLegacyFree(dataSourceId: string, all: Props, names: string[]) {
  const properties: Record<string, unknown> = {};
  for (const name of names) {
    const options = all[name]?.select?.options ?? [];
    if (options.some((o) => o.name === FREE_STATUS)) {
      throw new Error(`${name} already has both "${FREE_STATUS}" and "${LEGACY_FREE_STATUS}" options`);
    }
    properties[name] = {
      select: {
        options: options.map((o) => ({
          id: o.id,
          name: o.name === LEGACY_FREE_STATUS ? FREE_STATUS : o.name,
          color: o.color,
        })),
      },
    };
  }
  if (Object.keys(properties).length > 0) {
    await notion().dataSources.update({ data_source_id: dataSourceId, properties: properties as never });
  }
}

/** Applies the schema changes; the caller then runs a full reconcile to fill the columns. */
export async function applyStatusMigration(): Promise<{ done: string[]; report: StatusMigrationReport }> {
  const report = await planStatusMigration();
  const sessionsId = await sessionsDataSourceId();
  const chargesId = await chargesSource();
  const done: string[] = [];

  const sessionProps = await props(sessionsId);
  const sessionRenames = selectsWithLegacyFree(sessionProps, statusColumnNames(sessionProps));
  await renameLegacyFree(sessionsId, sessionProps, sessionRenames);
  const chargeProps = await props(chargesId);
  const chargeRenames = selectsWithLegacyFree(chargeProps, [CHARGE_PROPS.status]);
  await renameLegacyFree(chargesId, chargeProps, chargeRenames);
  if (sessionRenames.length + chargeRenames.length > 0) done.push(`renamed N/A to Free: ${report.renameFree.join(", ")}`);

  const added = await ensureSessionStatusColumns(report.maxStudents);
  if (added.length > 0) done.push(`added session columns: ${added.join(", ")}`);

  if (!report.sessionHasPayment) {
    await notion().dataSources.update({
      data_source_id: sessionsId,
      properties: { [PAYMENT_PROP]: { formula: { expression: PAYMENT_FORMULA } } },
    } as never);
    done.push(`added ${PAYMENT_PROP}`);
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
