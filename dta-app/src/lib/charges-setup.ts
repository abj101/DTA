import { CHARGE_PROPS, STATUS_OUTSTANDING } from "./charges.ts";
import { FREE_STATUS } from "./accounting-rows.ts";
import { notion, resolveDataSourceId, sessionsDataSourceId } from "./notion-sessions.ts";

/** Property on Session Calendar pages that lists their charges (the relation's other side). */
export const SESSION_CHARGES_BACKLINK = "Charges";

export type CreatedChargesDatabase = { databaseId: string; dataSourceId: string; url: string };

/** The page a data source's database lives in; null when it sits at the workspace top level. */
async function parentPage(dataSourceId: string): Promise<string | null> {
  const source = await notion().dataSources.retrieve({ data_source_id: dataSourceId });
  const databaseId = ((source as { parent?: unknown }).parent as { database_id?: string } | undefined)
    ?.database_id;
  if (!databaseId) return null;
  const db = await notion().databases.retrieve({ database_id: databaseId });
  const parent = (db as { parent?: { type: string; page_id?: string } }).parent;
  return parent?.type === "page_id" && parent.page_id ? parent.page_id : null;
}

/**
 * One-time setup: creates the "Session Charges" database in the page that holds the
 * Session Calendar (or Student) database, else at the workspace top level, with the exact
 * schema charges.ts expects. The Session relation is two-way, so each session page gains a "Charges" list.
 */
export async function createChargesDatabase(parentPageId?: string): Promise<CreatedChargesDatabase> {
  const studentsConfigured = process.env.NOTION_STUDENTS_DATA_SOURCE_ID?.trim();
  if (!studentsConfigured) throw new Error("NOTION_STUDENTS_DATA_SOURCE_ID is not set");
  const [sessionsSource, studentsSource] = await Promise.all([
    sessionsDataSourceId(),
    resolveDataSourceId(studentsConfigured),
  ]);

  const parent =
    parentPageId ?? (await parentPage(sessionsSource)) ?? (await parentPage(studentsSource));

  const created = await notion().databases.create({
    parent: parent ? { type: "page_id", page_id: parent } : { type: "workspace", workspace: true },
    title: [{ text: { content: "Session Charges" } }],
    is_inline: true,
    description: [
      {
        text: {
          content:
            "One charge per student per session. Standard Rate is set by the app; edit Adjusted Rate, Status and Note.",
        },
      },
    ],
    initial_data_source: {
      properties: {
        [CHARGE_PROPS.title]: { title: {} },
        [CHARGE_PROPS.session]: {
          relation: {
            data_source_id: sessionsSource,
            type: "dual_property",
            dual_property: { synced_property_name: SESSION_CHARGES_BACKLINK },
          },
        },
        [CHARGE_PROPS.student]: {
          relation: { data_source_id: studentsSource, type: "single_property", single_property: {} },
        },
        [CHARGE_PROPS.status]: {
          select: {
            options: [
              { name: STATUS_OUTSTANDING, color: "red" },
              { name: "Settled", color: "green" },
              { name: FREE_STATUS, color: "gray" },
            ],
          },
        },
        [CHARGE_PROPS.standardRate]: { number: { format: "dollar" } },
        [CHARGE_PROPS.adjustedRate]: { number: { format: "dollar" } },
        [CHARGE_PROPS.note]: { rich_text: {} },
        [CHARGE_PROPS.studentRemoved]: { checkbox: {} },
        [CHARGE_PROPS.key]: { rich_text: {} },
      },
    },
  });

  const dataSourceId = ("data_sources" in created && created.data_sources[0]?.id) || "";
  if (!dataSourceId) throw new Error("Notion did not return a data source for the new database");
  return { databaseId: created.id, dataSourceId, url: "url" in created ? created.url : "" };
}

/** Pages shared with the integration, as candidate homes for the new database. */
export async function accessiblePages(): Promise<{ id: string; title: string; url: string }[]> {
  const { results } = await notion().search({
    filter: { property: "object", value: "page" },
    page_size: 50,
  });
  return results.flatMap((page) => {
    if (!("properties" in page)) return [];
    const title = Object.values(page.properties).find((p) => p.type === "title");
    const text = title?.type === "title" ? title.title.map((t: { plain_text: string }) => t.plain_text).join("") : "";
    const parent = (page as { parent?: { type?: string } }).parent?.type;
    return parent === "data_source_id" || parent === "database_id"
      ? []
      : [{ id: page.id, title: text || "Untitled", url: "url" in page ? String(page.url) : "" }];
  });
}

/** Shows the ledger as a table inside its parent page rather than as a link to a subpage. */
export async function makeChargesInline(): Promise<{ databaseId: string; isInline: boolean }> {
  const configured = process.env.NOTION_CHARGES_DATA_SOURCE_ID?.trim();
  if (!configured) throw new Error("NOTION_CHARGES_DATA_SOURCE_ID is not set");
  const source = await notion().dataSources.retrieve({
    data_source_id: await resolveDataSourceId(configured),
  });
  const databaseId = ((source as { parent?: unknown }).parent as { database_id?: string } | undefined)
    ?.database_id;
  if (!databaseId) throw new Error("Charges data source has no parent database");
  const db = await notion().databases.update({ database_id: databaseId, is_inline: true });
  return { databaseId, isInline: "is_inline" in db ? Boolean(db.is_inline) : true };
}
