import { CHARGE_PROPS, STATUS_OUTSTANDING } from "./charges.ts";
import { FREE_STATUS } from "./accounting-rows.ts";
import { notion, resolveDataSourceId, sessionsDataSourceId } from "./notion-sessions.ts";

/** Property on Session Calendar pages that lists their charges (the relation's other side). */
export const SESSION_CHARGES_BACKLINK = "Charges";

export type CreatedChargesDatabase = { databaseId: string; dataSourceId: string; url: string };

/**
 * One-time setup: creates the "Session Charges" database next to the Session Calendar
 * database (same parent page), with the exact schema charges.ts expects. The Session
 * relation is two-way, so each session page gains a "Charges" list.
 */
export async function createChargesDatabase(): Promise<CreatedChargesDatabase> {
  const studentsConfigured = process.env.NOTION_STUDENTS_DATA_SOURCE_ID?.trim();
  if (!studentsConfigured) throw new Error("NOTION_STUDENTS_DATA_SOURCE_ID is not set");
  const [sessionsSource, studentsSource] = await Promise.all([
    sessionsDataSourceId(),
    resolveDataSourceId(studentsConfigured),
  ]);

  const source = await notion().dataSources.retrieve({ data_source_id: sessionsSource });
  const databaseId = ((source as { parent?: unknown }).parent as { database_id?: string } | undefined)?.database_id;
  if (!databaseId) throw new Error("Session Calendar data source has no parent database");
  const sessionsDb = await notion().databases.retrieve({ database_id: databaseId });
  const parent = (sessionsDb as { parent?: { type: string; page_id?: string } }).parent;
  if (parent?.type !== "page_id" || !parent.page_id) {
    throw new Error(`Session Calendar is not inside a page (parent: ${parent?.type ?? "unknown"})`);
  }

  const created = await notion().databases.create({
    parent: { type: "page_id", page_id: parent.page_id },
    title: [{ text: { content: "Session Charges" } }],
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
