import { isFullPage, iteratePaginatedAPI, type PageObjectResponse } from "@notionhq/client";

import { isAccountable } from "@/lib/accounting-rows";
import {
  CHARGE_PROPS,
  chargeFromPage,
  chargeTitle,
  dashless,
  desiredFields,
  diffFields,
  managedProperties,
  mergeUserFields,
  newChargeProperties,
  pickSurvivor,
  removalAction,
  sessionHasPassed,
  sessionYmdIn,
  type Charge,
  flaggedFields,
} from "@/lib/charges";
import {
  getSessionPage,
  notion,
  resolveDataSourceId,
  toSession,
  type Session,
} from "@/lib/notion-sessions";
import { DTA_SCHEDULE_TZ } from "@/lib/pacific-date";

/** Which Notion database a page belongs to; the webhook routes on this. */
export type PageKind = "session" | "charge" | "student" | "other";

const SOURCES = {
  session: "NOTION_SESSIONS_DATA_SOURCE_ID",
  charge: "NOTION_CHARGES_DATA_SOURCE_ID",
  student: "NOTION_STUDENTS_DATA_SOURCE_ID",
} as const;

const resolved = new Map<string, Promise<string>>();

function dataSource(kind: keyof typeof SOURCES): Promise<string> {
  const configured = process.env[SOURCES[kind]]?.trim();
  if (!configured) return Promise.reject(new Error(`${SOURCES[kind]} is not set`));
  let id = resolved.get(configured);
  if (!id) {
    id = resolveDataSourceId(configured);
    resolved.set(configured, id);
  }
  return id;
}

/** False until NOTION_CHARGES_DATA_SOURCE_ID is set; the sheet then uses the legacy rows. */
export function chargesConfigured(): boolean {
  return Boolean(process.env[SOURCES.charge]?.trim());
}

/** Classifies a page by its parent database (data source ID or database ID). */
export async function pageKind(page: PageObjectResponse): Promise<PageKind> {
  const parent = page.parent as { data_source_id?: string; database_id?: string };
  const parents = [parent.data_source_id, parent.database_id]
    .filter((id): id is string => !!id)
    .map(dashless);
  for (const kind of ["session", "charge", "student"] as const) {
    const configured = process.env[SOURCES[kind]]?.trim();
    if (!configured) continue;
    const ids = [dashless(configured), dashless(await dataSource(kind))];
    if (parents.some((id) => ids.includes(id))) return kind;
  }
  return "other";
}

let botId: Promise<string | null> | null = null;

/** True when `id` is this integration's own bot user (so its webhook events are echoes). */
export async function isOwnBot(id: string): Promise<boolean> {
  botId ??= notion()
    .users.me({})
    .then((me) => dashless(me.id))
    .catch(() => null);
  return (await botId) === dashless(id);
}

async function queryCharges(filter?: Record<string, unknown>): Promise<Charge[]> {
  const data_source_id = await dataSource("charge");
  const charges: Charge[] = [];
  for await (const page of iteratePaginatedAPI(notion().dataSources.query, {
    data_source_id,
    ...(filter ? { filter: filter as never } : {}),
  })) {
    if (!isFullPage(page) || page.in_trash) continue;
    const charge = chargeFromPage(page);
    if (charge) charges.push(charge);
  }
  return charges;
}

/** Every live charge, grouped by dashless session ID (one fetch serves a whole sheet rebuild). */
export async function chargesBySession(): Promise<Map<string, Charge[]>> {
  const grouped = new Map<string, Charge[]>();
  for (const charge of await queryCharges()) {
    const id = dashless(charge.sessionId);
    grouped.set(id, [...(grouped.get(id) ?? []), charge]);
  }
  return grouped;
}

const chargesOfSession = (sessionId: string) =>
  queryCharges({ property: CHARGE_PROPS.session, relation: { contains: sessionId } });

const chargesOfStudent = (studentId: string) =>
  queryCharges({ property: CHARGE_PROPS.student, relation: { contains: studentId } });

/** Parses one charge page (also when trashed); null if it is not a complete charge. */
export async function getCharge(pageId: string): Promise<Charge | null> {
  try {
    const page = await notion().pages.retrieve({ page_id: pageId });
    return isFullPage(page) ? chargeFromPage(page) : null;
  } catch {
    return null;
  }
}

async function update(pageId: string, properties: Record<string, unknown>) {
  await notion().pages.update({ page_id: pageId, properties: properties as never });
}

const trash = (pageId: string) => notion().pages.update({ page_id: pageId, in_trash: true });

export type ReconcileResult = {
  /** Every charge page ID involved, including trashed ones (old sheet rows may link them). */
  chargeIds: string[];
  created: number;
  updated: number;
  trashed: number;
  flagged: number;
  merged: number;
};

/**
 * Brings a session's charges in line with its students: creates missing ones, refreshes
 * app-managed fields only where they differ (no-op diffs write nothing), merges duplicate
 * keys, and trashes or flags the charges of removed students.
 */
export async function reconcileSession(
  session: Session,
  now = new Date(),
  /** Pre-fetched charges of this session (the cron fetches the whole ledger once). */
  prefetched?: Charge[],
): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    chargeIds: [],
    created: 0,
    updated: 0,
    trashed: 0,
    flagged: 0,
    merged: 0,
  };
  const existing = prefetched ?? (await chargesOfSession(session.pageId));
  result.chargeIds.push(...existing.map((c) => c.pageId));

  const byKey = new Map<string, Charge[]>();
  for (const charge of existing) byKey.set(charge.key, [...(byKey.get(charge.key) ?? []), charge]);

  const accountable = isAccountable(session);
  const wanted = new Set<string>();
  const data_source_id = accountable ? await dataSource("charge") : "";

  if (accountable) {
    const ymd = sessionYmdIn(session.start!, DTA_SCHEDULE_TZ);
    const passed = sessionHasPassed(session.start!, now, DTA_SCHEDULE_TZ);
    for (const [index, studentId] of session.studentIds.entries()) {
      const key = `${dashless(session.pageId)}:${dashless(studentId)}`;
      wanted.add(key);
      const group = byKey.get(key) ?? [];
      let charge: Charge | null = null;
      if (group.length > 0) {
        const { keep, discard } = pickSurvivor(group);
        charge = keep;
        if (discard.length > 0) {
          const merge = mergeUserFields(keep, discard);
          if (Object.keys(merge).length > 0) {
            await update(keep.pageId, userProperties(merge));
            charge = {
              ...keep,
              adjustedRate: merge.adjustedRate ?? keep.adjustedRate,
              note: merge.note ?? keep.note,
              status: merge.status ?? keep.status,
            };
          }
          for (const dupe of discard) await trash(dupe.pageId);
          result.merged += discard.length;
        }
      }
      const fields = desiredFields(charge, {
        title: chargeTitle(session.students[index], ymd),
        currentRate: session.studentRates[index] ?? null,
        passed,
        ymd,
      });
      if (!charge) {
        const created = await notion().pages.create({
          parent: { data_source_id },
          properties: newChargeProperties({
            sessionId: session.pageId,
            studentId,
            fields,
          }) as never,
        });
        result.chargeIds.push(created.id);
        result.created++;
        continue;
      }
      const patch = diffFields(charge, fields);
      if (Object.keys(patch).length > 0) {
        await update(charge.pageId, managedProperties(patch));
        result.updated++;
      }
    }
  }

  for (const [key, group] of byKey) {
    if (wanted.has(key)) continue;
    const { keep, discard } = pickSurvivor(group);
    for (const dupe of discard) await trash(dupe.pageId);
    if (removalAction(keep) === "trash") {
      await trash(keep.pageId);
      result.trashed++;
    } else {
      const patch = diffFields(keep, flaggedFields(keep));
      if (Object.keys(patch).length > 0) {
        await update(keep.pageId, managedProperties(patch));
        result.flagged++;
      }
    }
  }
  return result;
}

function userProperties(fields: { adjustedRate?: number; note?: string; status?: string }) {
  const props: Record<string, unknown> = {};
  if (fields.adjustedRate !== undefined) {
    props[CHARGE_PROPS.adjustedRate] = { number: fields.adjustedRate };
  }
  if (fields.note !== undefined) {
    props[CHARGE_PROPS.note] = { rich_text: [{ text: { content: fields.note } }] };
  }
  if (fields.status !== undefined) props[CHARGE_PROPS.status] = { select: { name: fields.status } };
  return props;
}

/**
 * A student's page changed: re-follow the rate of their not-yet-frozen charges and refresh
 * titles. Returns the (live, accountable) sessions touched so their months can be rebuilt.
 */
export async function refreshStudentCharges(
  studentId: string,
  now = new Date(),
): Promise<Session[]> {
  const sessions = new Map<string, Session | null>();
  const touched: Session[] = [];
  for (const charge of await chargesOfStudent(studentId)) {
    if (!sessions.has(charge.sessionId)) {
      const page = await getSessionPage(charge.sessionId);
      sessions.set(charge.sessionId, page ? await toSession(page) : null);
    }
    const session = sessions.get(charge.sessionId);
    if (!session || !isAccountable(session)) continue;
    const index = session.studentIds.findIndex((id) => dashless(id) === dashless(studentId));
    if (index < 0) continue;
    touched.push(session);
    const ymd = sessionYmdIn(session.start!, DTA_SCHEDULE_TZ);
    const patch = diffFields(
      charge,
      desiredFields(charge, {
        title: chargeTitle(session.students[index], ymd),
        currentRate: session.studentRates[index] ?? null,
        passed: sessionHasPassed(session.start!, now, DTA_SCHEDULE_TZ),
        ymd,
      }),
    );
    if (Object.keys(patch).length > 0) await update(charge.pageId, managedProperties(patch));
  }
  return [...new Map(touched.map((s) => [s.pageId, s])).values()];
}
