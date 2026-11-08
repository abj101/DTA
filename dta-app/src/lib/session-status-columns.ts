import { FREE_STATUS } from "./accounting-rows.ts";
import { STATUS_OUTSTANDING, STATUS_SYNC_PROP, statusColumnName } from "./charges.ts";
import { notion, sessionsDataSourceId } from "./notion-sessions.ts";

/*
 * Keeps the Session Calendar's per-student status columns ("Status", "Status 2", ...), the
 * hidden "Status Sync" column in place. Columns are added when a session first has that many
 * students and are never removed.
 */

type SelectOption = { name: string; color?: string };
type SourceProps = Record<string, { type: string; select?: { options?: SelectOption[] } }>;

const DEFAULT_OPTIONS: SelectOption[] = [
  { name: STATUS_OUTSTANDING, color: "red" },
  { name: "Settled", color: "green" },
  { name: FREE_STATUS, color: "gray" },
];

let known: Promise<SourceProps> | null = null;

function sessionProps(): Promise<SourceProps> {
  known ??= sessionsDataSourceId()
    .then((id) => notion().dataSources.retrieve({ data_source_id: id }))
    .then((source) => (source as { properties?: SourceProps }).properties ?? {})
    .catch((error) => {
      known = null;
      throw error;
    });
  return known;
}

/** Forgets the cached Session Calendar schema (after another module changed it). */
export function resetSessionColumnsCache(): void {
  known = null;
}

/** Ensures status columns for `count` students plus the sync column; returns any added. */
export async function ensureSessionStatusColumns(count: number): Promise<string[]> {
  const props = await sessionProps();
  const options = (props[statusColumnName(0)]?.select?.options ?? DEFAULT_OPTIONS).map(
    ({ name, color }) => ({ name, color }),
  );
  const missing: Record<string, unknown> = {};
  for (let i = 0; i < Math.max(count, 1); i++) {
    if (!(statusColumnName(i) in props)) missing[statusColumnName(i)] = { select: { options } };
  }
  if (!(STATUS_SYNC_PROP in props)) missing[STATUS_SYNC_PROP] = { rich_text: {} };
  if (Object.keys(missing).length === 0) return [];
  await notion().dataSources.update({
    data_source_id: await sessionsDataSourceId(),
    properties: missing as never,
  });
  known = null;
  return Object.keys(missing);
}

/** Writes a session's status columns and sync record. */
export async function writeSessionStatuses(
  pageId: string,
  columns: (string | null)[],
  sync: string,
): Promise<void> {
  const text = (value: string) => ({ rich_text: value ? [{ text: { content: value } }] : [] });
  const properties: Record<string, unknown> = {
    [STATUS_SYNC_PROP]: text(sync),
  };
  columns.forEach((value, i) => {
    properties[statusColumnName(i)] = { select: value ? { name: value } : null };
  });
  await notion().pages.update({ page_id: pageId, properties: properties as never });
}
