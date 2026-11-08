import { isFullPage, iteratePaginatedAPI } from "@notionhq/client";

import { isAccountable } from "./accounting-rows.ts";
import { CHARGE_PROPS } from "./charges.ts";
import { SESSION_CHARGES_BACKLINK } from "./charges-setup.ts";
import { notion, plainText, resolveDataSourceId, sessionsDataSourceId, toSession } from "./notion-sessions.ts";

/*
 * One-time move of payment status off sessions: adds a read-only "Payment" formula to the
 * Session Calendar (summarising its charges' Status), then deletes the session "Status"
 * column and the charges' internal "Session Status Applied" column.
 */

const OLD_SESSION_STATUS = "Status";
const OLD_CHARGE_APPLIED = "Session Status Applied";
export const PAYMENT_PROP = "Payment";

/**
 * "Settled" / "Outstanding" / "N/A" when every charge agrees; otherwise each student's
 * status, e.g. "Ana: Settled · Ben: Outstanding". Blank when the session has no charges.
 */
export const PAYMENT_FORMULA = `let(
  charges, prop("${SESSION_CHARGES_BACKLINK}"),
  statuses, map(charges, format(current.prop("${CHARGE_PROPS.status}"))),
  if(empty(charges), "",
    if(length(unique(statuses)) == 1, first(statuses),
      join(map(charges, first(split(current.prop("${CHARGE_PROPS.title}"), " — ")) + ": " + format(current.prop("${CHARGE_PROPS.status}"))), " · ")))
)`;

export type StatusMigrationReport = {
  sessionHasStatus: boolean;
  sessionHasPayment: boolean;
  chargesHaveApplied: boolean;
  /** Sessions with no charges (not Meeting Type "Session") whose Status would be lost. */
  unbilledWithStatus: { title: string; date: string | null; status: string; url: string }[];
};

async function sourceProperties(dataSourceId: string): Promise<Record<string, { type: string }>> {
  const source = await notion().dataSources.retrieve({ data_source_id: dataSourceId });
  return (source as { properties?: Record<string, { type: string }> }).properties ?? {};
}

function chargesSource(): Promise<string> {
  const configured = process.env.NOTION_CHARGES_DATA_SOURCE_ID?.trim();
  if (!configured) return Promise.reject(new Error("NOTION_CHARGES_DATA_SOURCE_ID is not set"));
  return resolveDataSourceId(configured);
}

/** Read-only: what the migration would change, and anything that blocks it. */
export async function planStatusMigration(): Promise<StatusMigrationReport> {
  const sessions = await sessionsDataSourceId();
  const [sessionProps, chargeProps] = await Promise.all([
    sourceProperties(sessions),
    sourceProperties(await chargesSource()),
  ]);
  const report: StatusMigrationReport = {
    sessionHasStatus: OLD_SESSION_STATUS in sessionProps,
    sessionHasPayment: PAYMENT_PROP in sessionProps,
    chargesHaveApplied: OLD_CHARGE_APPLIED in chargeProps,
    unbilledWithStatus: [],
  };
  if (!report.sessionHasStatus) return report;

  const studentCache = new Map();
  for await (const page of iteratePaginatedAPI(notion().dataSources.query, {
    data_source_id: sessions,
  })) {
    if (!isFullPage(page)) continue;
    const status = plainText(page.properties[OLD_SESSION_STATUS]);
    if (!status) continue;
    const session = await toSession(page, studentCache);
    if (session.deleted || isAccountable(session)) continue;
    report.unbilledWithStatus.push({ title: session.title, date: session.start, status, url: session.url });
  }
  return report;
}

/**
 * Adds Payment, then deletes the old columns. Refuses while any session without charges still
 * has a Status value, so nothing is lost silently. Safe to re-run: finished steps are skipped.
 */
export async function applyStatusMigration(): Promise<{ done: string[]; report: StatusMigrationReport }> {
  const report = await planStatusMigration();
  if (report.unbilledWithStatus.length > 0) {
    throw new Error(
      `${report.unbilledWithStatus.length} session(s) without charges still have a Status; resolve them first`,
    );
  }
  const sessions = await sessionsDataSourceId();
  const done: string[] = [];
  if (!report.sessionHasPayment) {
    await notion().dataSources.update({
      data_source_id: sessions,
      properties: { [PAYMENT_PROP]: { formula: { expression: PAYMENT_FORMULA } } },
    } as never);
    done.push(`added ${PAYMENT_PROP}`);
  }
  if (report.sessionHasStatus) {
    await notion().dataSources.update({
      data_source_id: sessions,
      properties: { [OLD_SESSION_STATUS]: null },
    } as never);
    done.push(`deleted session ${OLD_SESSION_STATUS}`);
  }
  if (report.chargesHaveApplied) {
    await notion().dataSources.update({
      data_source_id: await chargesSource(),
      properties: { [OLD_CHARGE_APPLIED]: null },
    } as never);
    done.push(`deleted charge ${OLD_CHARGE_APPLIED}`);
  }
  return { done, report };
}
