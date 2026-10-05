import { auth, sheets, type sheets_v4 } from "@googleapis/sheets";

import {
  FREE_STATUS,
  rowAmount,
  sessionRows,
  type AccountingRow,
} from "@/lib/accounting-rows";
import { querySessions, type Session } from "@/lib/notion-sessions";
import { DTA_SCHEDULE_TZ, formatYmdInTimeZone } from "@/lib/pacific-date";

/**
 * Each month tab ("SEP 26") holds a "Session Tracking" table in columns A:E
 * (Date, Student, Tutor, Status, Amount) that this module owns entirely: a sync
 * rewrites the month's rows from Notion (one row per student), sizing the table
 * and tab to fit them.
 * Summary tables to the right read it via formulas. The tab's conditional formats are
 * replaced with the tutor row colors on every write.
 */
const TEMPLATE_TAB = "Template";
const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];
const COLUMN_COUNT = 5;
const ACCOUNTED_MEETING_TYPE = "Session";

/** Amount is formatted by its CURRENCY column type; the DATE column type does not format. */
const DATE_FORMAT = { type: "DATE", pattern: "m/d/yyyy" };
const CELL_FIELDS =
  "userEnteredValue,userEnteredFormat.numberFormat,userEnteredFormat.textFormat.link";

const STATUS_COLUMN = 3;

function rgb(hex: string): sheets_v4.Schema$Color {
  const [red, green, blue] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return { red, green, blue };
}

/*
 * Row colors are conditional formats because the table's alternating row colors hide
 * plain cell fills. The first matching rule wins, so Status rules precede tutor rules.
 */
/** Status cell colors ("light 2"). */
const STATUS_COLORS: Record<string, sheets_v4.Schema$Color> = {
  Settled: rgb("#B6D7A8"),
  Outstanding: rgb("#EA9999"),
  [FREE_STATUS]: rgb("#D9D9D9"),
};
/** Faded ("light 3") versions of each tutor's Notion option color. */
const TUTOR_ROW_COLORS: Record<string, sheets_v4.Schema$Color> = {
  "Ayush Bakhandi": rgb("#CFE2F3"),
  "Ayush Bandopadhyay": rgb("#FFF2CC"),
};

type Tab = {
  sheetId: number;
  title: string;
  index: number;
  rowCount: number;
  /** Rows the Template's summary tables need; the tab never shrinks below this. */
  minRowCount: number;
  ruleCount: number;
  table: { tableId: string; dataRows: number } | null;
  /** Summary table ranges on the Template: the layout every month tab should keep. */
  templateSummaries: sheets_v4.Schema$GridRange[];
  /** This tab's own summary tables, so a write can pin them back after the tab grows. */
  summaries: { tableId: string; range: sheets_v4.Schema$GridRange }[];
};

let client: sheets_v4.Sheets | null = null;

function gsheets(): sheets_v4.Sheets {
  if (client) return client;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!email || !key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are not set");
  }
  const jwt = new auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  client = sheets({ version: "v4", auth: jwt });
  return client;
}

function spreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ACCOUNTING_ID?.trim();
  if (!id) throw new Error("GOOGLE_SHEETS_ACCOUNTING_ID is not set");
  return id;
}

/** Pacific calendar day (YYYY-MM-DD) the session starts on. */
function sessionYmd(session: Session): string {
  const start = session.start!;
  return start.length === 10 ? start : formatYmdInTimeZone(new Date(start), DTA_SCHEDULE_TZ);
}

/** "YYYY-MM" */
function sessionMonth(session: Session): string {
  return sessionYmd(session).slice(0, 7);
}

function tabName(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTH_ABBR[Number(m) - 1]} ${y.slice(2)}`;
}

function tabMonth(title: string): string | null {
  const match = /^([A-Z]{3}) (\d{2})$/.exec(title);
  const index = match ? MONTH_ABBR.indexOf(match[1]) : -1;
  return index < 0 ? null : `20${match![2]}-${String(index + 1).padStart(2, "0")}`;
}

function isAccountable(session: Session): boolean {
  return !session.deleted && session.meetingType === ACCOUNTED_MEETING_TYPE && !!session.start;
}

/** Days since 1899-12-30, the Sheets date epoch. */
function sheetDate(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

function text(value: string): sheets_v4.Schema$ExtendedValue | undefined {
  return value ? { stringValue: value } : undefined;
}

/** A table row for one student in `entry`, or a cleared row when omitted. */
function row(entry?: AccountingRow): sheets_v4.Schema$RowData {
  const session = entry?.session;
  const total = entry ? rowAmount(entry) : null;
  return {
    values: [
      {
        userEnteredValue: session ? { numberValue: sheetDate(sessionYmd(session)) } : undefined,
        userEnteredFormat: { numberFormat: DATE_FORMAT },
      },
      {
        userEnteredValue: text(entry?.student ?? ""),
        userEnteredFormat: { textFormat: session ? { link: { uri: session.url } } : {} },
      },
      { userEnteredValue: text(session?.tutors.join(", ") ?? "") },
      { userEnteredValue: text(session?.status ?? "") },
      { userEnteredValue: total == null ? undefined : { numberValue: total } },
    ],
  };
}

async function batchUpdate(requests: sheets_v4.Schema$Request[]) {
  const { data } = await gsheets().spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: { requests },
  });
  return data;
}

async function loadTabs(): Promise<Tab[]> {
  const { data } = await gsheets().spreadsheets.get({
    spreadsheetId: spreadsheetId(),
    fields:
      "sheets(properties(sheetId,title,index,gridProperties.rowCount),tables(tableId,range),conditionalFormats(ranges))",
  });
  const sheets = data.sheets ?? [];
  const templateSummaries = (sheets.find((s) => s.properties?.title === TEMPLATE_TAB)?.tables ?? [])
    .filter((t) => (t.range?.startColumnIndex ?? 0) !== 0)
    .map((t) => t.range!);
  /* Keep the tab tall enough for the summaries even when the month has no sessions. */
  const minRowCount = Math.max(0, ...templateSummaries.map((r) => r.endRowIndex ?? 0));
  return sheets.map((sheet) => {
    const table = sheet.tables?.find((t) => (t.range?.startColumnIndex ?? 0) === 0);
    return {
      sheetId: sheet.properties?.sheetId ?? 0,
      title: sheet.properties?.title ?? "",
      index: sheet.properties?.index ?? 0,
      rowCount: sheet.properties?.gridProperties?.rowCount ?? 0,
      minRowCount,
      ruleCount: sheet.conditionalFormats?.length ?? 0,
      table: table?.tableId
        ? { tableId: table.tableId, dataRows: (table.range?.endRowIndex ?? 1) - 1 }
        : null,
      templateSummaries,
      summaries: (sheet.tables ?? [])
        .filter((t) => t !== table && !!t.tableId && !!t.range)
        .map((t) => ({ tableId: t.tableId!, range: t.range! })),
    };
  });
}

/** Months whose tab links a row to this Notion page. */
async function monthsContaining(pageId: string, tabs: Tab[]): Promise<string[]> {
  const monthTabs = tabs.filter((t) => tabMonth(t.title));
  if (monthTabs.length === 0) return [];
  const { data } = await gsheets().spreadsheets.get({
    spreadsheetId: spreadsheetId(),
    ranges: monthTabs.map((t) => `'${t.title}'!B2:B`),
    fields: "sheets(properties.title,data.rowData.values.userEnteredFormat.textFormat.link.uri)",
  });
  const id = pageId.replace(/-/g, "");
  return (data.sheets ?? [])
    .filter((sheet) =>
      sheet.data?.some((d) =>
        d.rowData?.some((r) =>
          r.values?.[0]?.userEnteredFormat?.textFormat?.link?.uri?.replace(/-/g, "").includes(id),
        ),
      ),
    )
    .map((sheet) => tabMonth(sheet.properties?.title ?? "")!);
}

/** Copies the Template tab into chronological position among the month tabs. */
async function createMonthTab(month: string, tabs: Tab[]): Promise<Tab> {
  const title = tabName(month);
  const template = tabs.find((t) => t.title === TEMPLATE_TAB);
  if (!template) throw new Error(`Accounting sheet has no "${TEMPLATE_TAB}" tab`);

  const months = tabs
    .map((t) => ({ tab: t, month: tabMonth(t.title) }))
    .filter((t): t is { tab: Tab; month: string } => t.month !== null)
    .sort((a, b) => a.tab.index - b.tab.index);
  const later = months.find((t) => t.month > month);
  const earlier = months.findLast((t) => t.month < month);
  const insertSheetIndex = later?.tab.index ?? (earlier ? earlier.tab.index + 1 : 0);

  try {
    await batchUpdate([
      { duplicateSheet: { sourceSheetId: template.sheetId, insertSheetIndex, newSheetName: title } },
    ]);
  } catch (error) {
    // A concurrent sync may have created it first.
    if (!(await loadTabs()).some((t) => t.title === title)) throw error;
  }
  const fresh = await loadTabs();
  tabs.splice(0, tabs.length, ...fresh);
  return fresh.find((t) => t.title === title)!;
}

/** Status cell and tutor row colors over the table's data rows. */
function colorRules(sheetId: number, dataRows: number): sheets_v4.Schema$ConditionalFormatRule[] {
  const rule = (
    [startColumnIndex, endColumnIndex]: [number, number],
    formula: string,
    rgbColor: sheets_v4.Schema$Color,
  ): sheets_v4.Schema$ConditionalFormatRule => ({
    ranges: [{ sheetId, startRowIndex: 1, endRowIndex: dataRows + 1, startColumnIndex, endColumnIndex }],
    booleanRule: {
      condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: formula }] },
      format: { backgroundColorStyle: { rgbColor } },
    },
  });
  return [
    ...Object.entries(STATUS_COLORS).map(([status, color]) =>
      rule([STATUS_COLUMN, STATUS_COLUMN + 1], `=$D2="${status}"`, color),
    ),
    ...Object.entries(TUTOR_ROW_COLORS).map(([tutor, color]) =>
      rule([0, COLUMN_COUNT], `=$C2="${tutor}"`, color),
    ),
  ];
}

/**
 * Sheets grows any table sitting flush with the tab bottom, filling its last formula down,
 * so a resize leaves runaway rows in the Earnings/Savings tables. Pin each summary table
 * back to the Template's range and clear the values that spilled below it.
 */
function resetSummaries(sheetId: number, tab: Tab, rowCount: number): sheets_v4.Schema$Request[] {
  const canonical = tab.templateSummaries;
  if (canonical.length === 0) return [];
  const requests: sheets_v4.Schema$Request[] = [];
  for (const summary of tab.summaries) {
    const range = canonical.find((r) => r.startColumnIndex === summary.range.startColumnIndex);
    if (!range || (range.endRowIndex ?? 0) >= (summary.range.endRowIndex ?? 0)) continue;
    requests.push({
      updateTable: { table: { tableId: summary.tableId, range: { ...range, sheetId } }, fields: "range" },
    });
  }
  const endRow = Math.max(0, ...canonical.map((r) => r.endRowIndex ?? 0));
  if (rowCount > endRow) {
    const startColumnIndex = Math.min(...canonical.map((r) => r.startColumnIndex ?? 0));
    const endColumnIndex = Math.max(...canonical.map((r) => r.endColumnIndex ?? 0));
    requests.push({
      updateCells: {
        start: { sheetId, rowIndex: endRow, columnIndex: startColumnIndex },
        rows: Array.from({ length: rowCount - endRow }, () => ({
          values: Array.from({ length: endColumnIndex - startColumnIndex }, () => ({})),
        })),
        fields: "userEnteredValue",
      },
    });
  }
  return requests;
}

/**
 * Rewrites a month's Session Tracking rows, sizing the table to one row per student
 * (one blank row when there are none) and trimming the tab to match.
 */
async function writeMonth(month: string, sessions: Session[], tabs: Tab[]) {
  let tab = tabs.find((t) => t.title === tabName(month));
  if (!tab) {
    if (sessions.length === 0) return;
    tab = await createMonthTab(month, tabs);
  }
  if (!tab.table) throw new Error(`"${tab.title}" has no table starting in column A`);

  const { sheetId } = tab;
  const sorted = [...sessions].sort((a, b) => Date.parse(a.start!) - Date.parse(b.start!));
  const entries = sessionRows(sorted);
  const dataRows = Math.max(entries.length, 1);
  const rowCount = Math.max(dataRows + 1, tab.minRowCount);
  const requests: sheets_v4.Schema$Request[] = [];

  for (let index = tab.ruleCount - 1; index >= 0; index--) {
    requests.push({ deleteConditionalFormatRule: { sheetId, index } });
  }
  if (rowCount > tab.rowCount) {
    requests.push({
      appendDimension: { sheetId, dimension: "ROWS", length: rowCount - tab.rowCount },
    });
  }
  if (dataRows !== tab.table.dataRows) {
    requests.push({
      updateTable: {
        table: {
          tableId: tab.table.tableId,
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: dataRows + 1,
            startColumnIndex: 0,
            endColumnIndex: COLUMN_COUNT,
          },
        },
        fields: "range",
      },
    });
  }
  if (rowCount < tab.rowCount) {
    requests.push({
      deleteDimension: {
        range: { sheetId, dimension: "ROWS", startIndex: rowCount, endIndex: tab.rowCount },
      },
    });
  }
  requests.push(...resetSummaries(sheetId, tab, rowCount));
  requests.push({
    updateCells: {
      start: { sheetId, rowIndex: 1, columnIndex: 0 },
      rows: Array.from({ length: rowCount - 1 }, (_, i) => row(entries[i])),
      fields: CELL_FIELDS,
    },
  });
  const rules = colorRules(sheetId, dataRows);
  rules.forEach((rule, index) => requests.push({ addConditionalFormatRule: { index, rule } }));

  await batchUpdate(requests);
  tab.rowCount = rowCount;
  tab.ruleCount = rules.length;
  tab.table.dataRows = dataRows;
}

function monthBounds(month: string): { since: Date; before: Date } {
  const [y, m] = month.split("-").map(Number);
  // Padded a day each side; rows are bucketed by Pacific date afterwards.
  return { since: new Date(Date.UTC(y, m - 1, 0)), before: new Date(Date.UTC(y, m, 2)) };
}

async function accountableSessions(since: Date, before?: Date): Promise<Session[]> {
  return (await querySessions(since, before)).filter(isAccountable);
}

async function rewriteMonth(month: string, tabs: Tab[]) {
  const { since, before } = monthBounds(month);
  const sessions = (await accountableSessions(since, before)).filter(
    (s) => sessionMonth(s) === month,
  );
  await writeMonth(month, sessions, tabs);
}

/** Rewrites every month tab this page is in now or was in before (webhook path). */
export async function syncSessionSheet(pageId: string, session: Session | null): Promise<string[]> {
  const tabs = await loadTabs();
  const months = new Set(await monthsContaining(pageId, tabs));
  if (session && isAccountable(session)) months.add(sessionMonth(session));
  for (const month of months) await rewriteMonth(month, tabs);
  return [...months].map(tabName);
}

/** Rewrites every month from `since`'s month onward, including existing tabs with no sessions. */
export async function syncAllSessionSheets(since: Date): Promise<string[]> {
  const tabs = await loadTabs();
  const firstMonth = formatYmdInTimeZone(since, DTA_SCHEDULE_TZ).slice(0, 7);
  const byMonth = new Map<string, Session[]>();
  for (const tab of tabs) {
    const month = tabMonth(tab.title);
    if (month && month >= firstMonth) byMonth.set(month, []);
  }
  for (const session of await accountableSessions(monthBounds(firstMonth).since)) {
    const month = sessionMonth(session);
    if (month >= firstMonth) byMonth.set(month, [...(byMonth.get(month) ?? []), session]);
  }
  const months = [...byMonth.keys()].sort();
  for (const month of months) await writeMonth(month, byMonth.get(month)!, tabs);
  return months.map(tabName);
}
