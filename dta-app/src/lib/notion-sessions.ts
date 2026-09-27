import {
  APIErrorCode,
  Client,
  isFullPage,
  isNotionClientError,
  iteratePaginatedAPI,
  type PageObjectResponse,
} from "@notionhq/client";

/** Property names in the Notion "Session Calendar" data source. */
export const SESSION_PROPS = {
  title: "Session",
  date: "Date",
  tutors: "Primary Tutor",
  students: "Student",
  meetingType: "Meeting Type",
  /** Rendered into the event description, in this order, when non-empty. */
  extra: ["Subject", "Meeting Type", "Topics", "Status"],
} as const;

export type Session = {
  pageId: string;
  url: string;
  deleted: boolean;
  title: string;
  /** Notion ISO date or datetime; a date-only value means an all-day session. */
  start: string | null;
  end: string | null;
  timeZone: string | null;
  tutors: string[];
  students: string[];
  /** Notion option color of the Meeting Type select (e.g. "green"), if set. */
  meetingTypeColor: string | null;
  details: { label: string; value: string }[];
};

type Property = PageObjectResponse["properties"][string];

let client: Client | null = null;

function notion(): Client {
  const auth = process.env.NOTION_API_KEY?.trim();
  if (!auth) throw new Error("NOTION_API_KEY is not set");
  client ??= new Client({ auth });
  return client;
}

function normalizeId(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

let dataSourceId: Promise<string> | null = null;

/** Accepts either the database ID (from the Notion URL) or its data source ID. */
export function sessionsDataSourceId(): Promise<string> {
  const configured = process.env.NOTION_SESSIONS_DATA_SOURCE_ID?.trim();
  if (!configured) {
    return Promise.reject(new Error("NOTION_SESSIONS_DATA_SOURCE_ID is not set"));
  }
  dataSourceId ??= notion()
    .dataSources.retrieve({ data_source_id: configured })
    .then(() => configured)
    .catch(() =>
      notion()
        .databases.retrieve({ database_id: configured })
        .then((db) => ("data_sources" in db && db.data_sources[0]?.id) || configured),
    );
  return dataSourceId;
}

export async function isSessionPage(page: PageObjectResponse): Promise<boolean> {
  const parent = page.parent as { data_source_id?: string; database_id?: string };
  const target = normalizeId(await sessionsDataSourceId());
  const configured = normalizeId(process.env.NOTION_SESSIONS_DATA_SOURCE_ID ?? "");
  return [parent.data_source_id, parent.database_id].some(
    (id) => id && [target, configured].includes(normalizeId(id)),
  );
}

function plainText(prop: Property | undefined): string {
  if (!prop) return "";
  switch (prop.type) {
    case "title":
      return prop.title.map((t) => t.plain_text).join("");
    case "rich_text":
      return prop.rich_text.map((t) => t.plain_text).join("");
    case "select":
      return prop.select?.name ?? "";
    case "status":
      return prop.status?.name ?? "";
    case "multi_select":
      return prop.multi_select.map((o) => o.name).join(", ");
    case "number":
      return prop.number == null ? "" : String(prop.number);
    case "checkbox":
      return prop.checkbox ? "Yes" : "No";
    case "url":
      return prop.url ?? "";
    case "email":
      return prop.email ?? "";
    case "phone_number":
      return prop.phone_number ?? "";
    default:
      return "";
  }
}

async function pageTitle(pageId: string, cache: Map<string, string>): Promise<string> {
  const cached = cache.get(pageId);
  if (cached !== undefined) return cached;
  const page = await notion().pages.retrieve({ page_id: pageId });
  const title = isFullPage(page)
    ? plainText(Object.values(page.properties).find((p) => p.type === "title"))
    : "";
  cache.set(pageId, title);
  return title;
}

export async function toSession(
  page: PageObjectResponse,
  studentCache: Map<string, string> = new Map(),
): Promise<Session> {
  const props = page.properties;
  const date = props[SESSION_PROPS.date];
  const tutors = props[SESSION_PROPS.tutors];
  const students = props[SESSION_PROPS.students];
  const meetingType = props[SESSION_PROPS.meetingType];

  const studentNames =
    students?.type === "relation"
      ? (
          await Promise.all(students.relation.map((r) => pageTitle(r.id, studentCache)))
        ).filter(Boolean)
      : [];

  return {
    pageId: page.id,
    url: page.url,
    deleted: page.in_trash || page.archived,
    title: plainText(props[SESSION_PROPS.title]) || "Untitled session",
    start: date?.type === "date" ? (date.date?.start ?? null) : null,
    end: date?.type === "date" ? (date.date?.end ?? null) : null,
    timeZone: date?.type === "date" ? (date.date?.time_zone ?? null) : null,
    tutors:
      tutors?.type === "multi_select"
        ? tutors.multi_select.map((o) => o.name)
        : tutors?.type === "select" && tutors.select
          ? [tutors.select.name]
          : [],
    students: studentNames,
    meetingTypeColor: meetingType?.type === "select" ? (meetingType.select?.color ?? null) : null,
    details: SESSION_PROPS.extra
      .map((label) => ({ label, value: plainText(props[label]) }))
      .filter((d) => d.value),
  };
}

/** Returns null when the page is gone or no longer shared with the integration. */
export async function getSessionPage(pageId: string): Promise<PageObjectResponse | null> {
  try {
    const page = await notion().pages.retrieve({ page_id: pageId });
    return isFullPage(page) ? page : null;
  } catch (error) {
    if (isNotionClientError(error) && error.code === APIErrorCode.ObjectNotFound) {
      return null;
    }
    throw error;
  }
}

/** All non-trashed sessions whose date is on or after `since`. */
export async function querySessions(since: Date): Promise<Session[]> {
  const data_source_id = await sessionsDataSourceId();
  const studentCache = new Map<string, string>();
  const sessions: Session[] = [];
  for await (const page of iteratePaginatedAPI(notion().dataSources.query, {
    data_source_id,
    filter: { property: SESSION_PROPS.date, date: { on_or_after: since.toISOString() } },
  })) {
    if (isFullPage(page)) sessions.push(await toSession(page, studentCache));
  }
  return sessions;
}
