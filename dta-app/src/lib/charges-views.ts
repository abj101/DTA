import { isFullPage, iteratePaginatedAPI } from "@notionhq/client";

import { CHARGE_PROPS } from "./charges.ts";
import { notion, resolveDataSourceId } from "./notion-sessions.ts";

/*
 * Tabs on the Session Charges table: "All" plus one per month ("Nov 2026"), each with the
 * same column order. Month tabs are added when a month first has charges; existing tabs are
 * never removed, and their column order is only set when the tab is created, so any later
 * changes you make in Notion stick.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ALL_VIEW = "All";

/** Visible columns, left to right; anything not listed follows, and HIDDEN ones are hidden. */
const COLUMN_ORDER = [
  CHARGE_PROPS.student,
  CHARGE_PROPS.status,
  CHARGE_PROPS.standardRate,
  CHARGE_PROPS.adjustedRate,
  CHARGE_PROPS.hours,
  CHARGE_PROPS.amount,
  CHARGE_PROPS.date,
  CHARGE_PROPS.session,
  CHARGE_PROPS.note,
  CHARGE_PROPS.title,
  CHARGE_PROPS.studentRemoved,
];
/** App bookkeeping columns, hidden from every tab. */
const HIDDEN: string[] = [CHARGE_PROPS.key];

/** "2026-11" -> "Nov 2026" */
export function monthViewName(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** First day of `month` and of the month after, as YYYY-MM-DD. */
export function monthRange(month: string): { start: string; next: string } {
  const [y, m] = month.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${y}-${pad(m)}-01`,
    next: m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`,
  };
}

type Ledger = { dataSourceId: string; databaseId: string; propertyIds: Map<string, string> };

let ledger: Promise<Ledger> | null = null;

function loadLedger(): Promise<Ledger> {
  const configured = process.env.NOTION_CHARGES_DATA_SOURCE_ID?.trim();
  if (!configured) return Promise.reject(new Error("NOTION_CHARGES_DATA_SOURCE_ID is not set"));
  ledger ??= (async () => {
    const dataSourceId = await resolveDataSourceId(configured);
    const source = await notion().dataSources.retrieve({ data_source_id: dataSourceId });
    const parent = (source as { parent?: { database_id?: string } }).parent;
    const properties = (source as { properties?: Record<string, { id: string }> }).properties ?? {};
    if (!parent?.database_id) throw new Error("Charges data source has no parent database");
    return {
      dataSourceId,
      databaseId: parent.database_id,
      propertyIds: new Map(Object.entries(properties).map(([name, p]) => [name, p.id])),
    };
  })().catch((error) => {
    ledger = null;
    throw error;
  });
  return ledger;
}

/** Rate x hours, $0 when Free (mirrors rowAmount); only reads the charge's own columns. */
export const AMOUNT_FORMULA =
  `if(format(prop("${CHARGE_PROPS.status}")) == "Free", 0, ` +
  `if(empty(prop("${CHARGE_PROPS.adjustedRate}")), prop("${CHARGE_PROPS.standardRate}"), prop("${CHARGE_PROPS.adjustedRate}")) * ` +
  `if(empty(prop("${CHARGE_PROPS.hours}")), 1, prop("${CHARGE_PROPS.hours}")))`;

/** Adds the Date, Hours and Amount columns to a ledger created before they existed. */
export async function ensureChargeColumns(): Promise<string[]> {
  const { dataSourceId, propertyIds } = await loadLedger();
  const missing: Record<string, unknown> = {};
  if (!propertyIds.has(CHARGE_PROPS.date)) missing[CHARGE_PROPS.date] = { date: {} };
  if (!propertyIds.has(CHARGE_PROPS.hours)) {
    missing[CHARGE_PROPS.hours] = { number: { format: "number" } };
  }
  const added: string[] = [];
  if (Object.keys(missing).length > 0) {
    await notion().dataSources.update({ data_source_id: dataSourceId, properties: missing as never });
    added.push(...Object.keys(missing));
    ledger = null;
  }
  // Amount is a convenience view of rate x hours; the sheet computes its own, so a formula
  // Notion rejects is logged, never fatal to the sync.
  if (!propertyIds.has(CHARGE_PROPS.amount)) {
    try {
      await notion().dataSources.update({
        data_source_id: dataSourceId,
        properties: { [CHARGE_PROPS.amount]: { formula: { expression: AMOUNT_FORMULA } } } as never,
      });
      added.push(CHARGE_PROPS.amount);
      ledger = null;
    } catch (error) {
      console.error("[charges] Amount formula column not added", error);
    }
  }
  return added;
}

function tableConfiguration(propertyIds: Map<string, string>) {
  const ordered = [
    ...COLUMN_ORDER,
    ...[...propertyIds.keys()].filter(
      (name) => !COLUMN_ORDER.includes(name as never) && !HIDDEN.includes(name as never),
    ),
    ...HIDDEN,
  ];
  return {
    type: "table" as const,
    frozen_column_index: 1,
    properties: ordered
      .filter((name) => propertyIds.has(name))
      .map((name) => ({
        property_id: propertyIds.get(name)!,
        visible: !HIDDEN.includes(name as never),
      })),
  };
}

async function listViews(databaseId: string): Promise<{ id: string; name: string }[]> {
  const views: { id: string; name: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await notion().views.list({ database_id: databaseId, start_cursor: cursor });
    for (const ref of page.results) {
      const view = await notion().views.retrieve({ view_id: ref.id });
      views.push({ id: view.id, name: "name" in view ? view.name : "" });
    }
    cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return views;
}

/** Months (YYYY-MM) that have at least one charge with a Date. */
export async function chargeMonths(): Promise<string[]> {
  const { dataSourceId } = await loadLedger();
  const months = new Set<string>();
  for await (const page of iteratePaginatedAPI(notion().dataSources.query, {
    data_source_id: dataSourceId,
  })) {
    if (!isFullPage(page) || page.in_trash) continue;
    const date = page.properties[CHARGE_PROPS.date];
    const start = date?.type === "date" ? date.date?.start : undefined;
    if (start) months.add(start.slice(0, 7));
  }
  return [...months].sort();
}

/**
 * Makes sure the "All" tab and a tab per month in `months` exist. The first tab becomes
 * "All" (newest first); month tabs are filtered to their month and sorted by date.
 * `reorder` also reapplies the column order to every existing tab.
 */
export async function ensureChargeViews(
  months: string[],
  { reorder = false }: { reorder?: boolean } = {},
): Promise<{ created: string[]; updated: string[] }> {
  const { dataSourceId, databaseId, propertyIds } = await loadLedger();
  const configuration = tableConfiguration(propertyIds);
  const views = await listViews(databaseId);
  const created: string[] = [];
  const updated: string[] = [];

  const all = views.find((v) => v.name === ALL_VIEW) ?? views[0];
  if (all && (reorder || all.name !== ALL_VIEW)) {
    await notion().views.update({
      view_id: all.id,
      name: ALL_VIEW,
      sorts: [{ property: CHARGE_PROPS.date, direction: "descending" }],
      configuration,
    } as never);
    updated.push(ALL_VIEW);
  }

  let after = all?.id;
  for (const month of [...new Set(months)].sort()) {
    const name = monthViewName(month);
    const existing = views.find((v) => v.name === name);
    if (existing) {
      if (reorder) {
        await notion().views.update({ view_id: existing.id, configuration } as never);
        updated.push(name);
      }
      after = existing.id;
      continue;
    }
    const { start, next } = monthRange(month);
    const view = await notion().views.create({
      data_source_id: dataSourceId,
      database_id: databaseId,
      name,
      type: "table",
      filter: {
        and: [
          { property: CHARGE_PROPS.date, date: { on_or_after: start } },
          { property: CHARGE_PROPS.date, date: { before: next } },
        ],
      },
      sorts: [{ property: CHARGE_PROPS.date, direction: "ascending" }],
      configuration,
      position: after ? { type: "after_view", view_id: after } : { type: "end" },
    } as never);
    after = view.id;
    created.push(name);
  }
  return { created, updated };
}
