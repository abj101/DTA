import { auth, sheets } from "@googleapis/sheets";
import { isFullPage, iteratePaginatedAPI } from "@notionhq/client";

/*
 * Relative `.ts` imports keep this module loadable by plain node (scripts/backfill-charges.mjs)
 * as well as by Next (the /api/admin/charges-backfill route).
 */
import { isAccountable } from "./accounting-rows.ts";
import {
  STATUS_OUTSTANDING,
  backfillSeed,
  chargeFromPage,
  chargeKey,
  chargeTitle,
  dashless,
  newChargeProperties,
  sessionYmdIn,
} from "./charges.ts";
import { notion, querySessions, resolveDataSourceId, type Session } from "./notion-sessions.ts";
import { DTA_SCHEDULE_TZ } from "./pacific-date.ts";

export type BackfillCreate = {
  session: Session;
  student: string;
  studentId: string;
  ymd: string;
  seed: number | null;
  status: string;
};

export type BackfillPlan = {
  /** CSV report, one line per session x student. */
  csv: string;
  creates: BackfillCreate[];
  existingCount: number;
  flagged: { mismatch: number; noRate: number };
  /** Null when NOTION_CHARGES_DATA_SOURCE_ID is unset (dry run only: nothing exists yet). */
  chargesSource: string | null;
  warnings: string[];
};

/** Month-tab Amount cells keyed by `<dashless session id>|<student, lowercase>`. */
async function sheetAmounts(warnings: string[]): Promise<Map<string, number>> {
  const id = process.env.GOOGLE_SHEETS_ACCOUNTING_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const amounts = new Map<string, number>();
  if (!id || !email || !key) {
    warnings.push("Google Sheets variables missing: seeding from current Session Rate only.");
    return amounts;
  }
  const api = sheets({
    version: "v4",
    auth: new auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    }),
  });
  const { data: meta } = await api.spreadsheets.get({
    spreadsheetId: id,
    fields: "sheets.properties.title",
  });
  const tabs = (meta.sheets ?? [])
    .map((s) => s.properties?.title ?? "")
    .filter((t) => /^[A-Z]{3} \d{2}$/.test(t));
  if (tabs.length === 0) return amounts;
  const { data } = await api.spreadsheets.get({
    spreadsheetId: id,
    ranges: tabs.map((t) => `'${t}'!A2:E`),
    fields: "sheets(data.rowData.values(userEnteredValue,userEnteredFormat.textFormat.link.uri))",
  });
  for (const sheet of data.sheets ?? []) {
    for (const rowData of sheet.data?.[0]?.rowData ?? []) {
      const cells = rowData.values ?? [];
      const uri = cells[1]?.userEnteredFormat?.textFormat?.link?.uri ?? "";
      const sessionId = /[0-9a-f]{32}$/i.exec(dashless(uri))?.[0];
      const student = cells[1]?.userEnteredValue?.stringValue?.trim().toLowerCase();
      const amount = cells[4]?.userEnteredValue?.numberValue;
      if (sessionId && student && amount != null) amounts.set(`${sessionId}|${student}`, amount);
    }
  }
  return amounts;
}

async function existingKeys(dataSourceId: string | null): Promise<Set<string>> {
  const keys = new Set<string>();
  if (!dataSourceId) return keys;
  for await (const page of iteratePaginatedAPI(notion().dataSources.query, {
    data_source_id: dataSourceId,
  })) {
    if (!isFullPage(page) || page.in_trash) continue;
    const charge = chargeFromPage(page);
    if (charge) keys.add(charge.key);
  }
  return keys;
}

const csvCell = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const HEADER = [
  "action",
  "session_id",
  "session",
  "date",
  "student",
  "student_id",
  "sheet_amount",
  "current_rate",
  "standard_rate_seed",
  "flag",
  "status",
  "session_url",
];

/** Read-only: works out every charge the backfill would create. Writes nothing. */
export async function planBackfill(since: Date): Promise<BackfillPlan> {
  const warnings: string[] = [];
  const configured = process.env.NOTION_CHARGES_DATA_SOURCE_ID?.trim();
  if (!configured) {
    warnings.push("NOTION_CHARGES_DATA_SOURCE_ID is not set: treating the ledger as empty.");
  }
  const chargesSource = configured ? await resolveDataSourceId(configured) : null;
  const [sessions, amounts, existing] = await Promise.all([
    querySessions(since),
    sheetAmounts(warnings),
    existingKeys(chargesSource),
  ]);

  const lines = [HEADER.join(",")];
  const creates: BackfillCreate[] = [];
  const flagged = { mismatch: 0, noRate: 0 };
  let existingCount = 0;

  for (const session of sessions.filter(isAccountable)) {
    const ymd = sessionYmdIn(session.start!, DTA_SCHEDULE_TZ);
    for (const [i, student] of session.students.entries()) {
      const studentId = session.studentIds[i];
      const sheetAmount =
        amounts.get(`${dashless(session.pageId)}|${student.trim().toLowerCase()}`) ?? null;
      const currentRate = session.studentRates[i] ?? null;
      const { seed, mismatch } = backfillSeed(session.status, sheetAmount, currentRate);
      const exists = existing.has(chargeKey(session.pageId, studentId));
      const status = session.status ?? STATUS_OUTSTANDING;
      const flag = mismatch ? "MISMATCH" : seed == null ? "NO_RATE" : "";
      if (flag === "MISMATCH") flagged.mismatch++;
      if (flag === "NO_RATE") flagged.noRate++;
      lines.push(
        [
          exists ? "skip (already exists)" : "create",
          session.pageId,
          session.title,
          ymd,
          student,
          studentId,
          sheetAmount,
          currentRate,
          seed,
          flag,
          status,
          session.url,
        ]
          .map(csvCell)
          .join(","),
      );
      if (exists) existingCount++;
      else creates.push({ session, student, studentId, ymd, seed, status });
    }
  }

  return { csv: lines.join("\n") + "\n", creates, existingCount, flagged, chargesSource, warnings };
}

/** Creates the planned charges. Requires the Charges data source to be configured. */
export async function applyBackfill(
  plan: BackfillPlan,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  if (!plan.chargesSource) throw new Error("NOTION_CHARGES_DATA_SOURCE_ID is not set");
  let done = 0;
  for (const c of plan.creates) {
    await notion().pages.create({
      parent: { data_source_id: plan.chargesSource },
      properties: newChargeProperties({
        sessionId: c.session.pageId,
        studentId: c.studentId,
        fields: { title: chargeTitle(c.student, c.ymd), standardRate: c.seed, studentRemoved: false },
        status: c.status,
      }) as never,
    });
    onProgress?.(++done, plan.creates.length);
  }
  return done;
}

/** Raw charge pages vs distinct keys in the ledger; a gap means duplicates for the cron to merge. */
export async function ledgerCounts(): Promise<{ pages: number; keys: number; unparsed: number }> {
  const configured = process.env.NOTION_CHARGES_DATA_SOURCE_ID?.trim();
  if (!configured) throw new Error("NOTION_CHARGES_DATA_SOURCE_ID is not set");
  const keys = new Set<string>();
  let pages = 0;
  let unparsed = 0;
  for await (const page of iteratePaginatedAPI(notion().dataSources.query, {
    data_source_id: await resolveDataSourceId(configured),
  })) {
    if (!isFullPage(page) || page.in_trash) continue;
    pages++;
    const charge = chargeFromPage(page);
    if (charge) keys.add(charge.key);
    else unparsed++;
  }
  return { pages, keys: keys.size, unparsed };
}
