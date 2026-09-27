import { deleteEvent, listNotionEvents, upsertEvent, type CalendarEvent } from "@/lib/gcal";
import {
  getSessionPage,
  isSessionPage,
  querySessions,
  toSession,
  type Session,
} from "@/lib/notion-sessions";
import { DTA_SCHEDULE_TZ } from "@/lib/pacific-date";

/** Keyed by the Notion "Primary Tutor" option name. */
export const TUTORS = {
  "Ayush Bandopadhyay": { calendarEnv: "GCAL_CALENDAR_ID_AYUSH_BANDOPADHYAY" },
  "Ayush Bakhandi": { calendarEnv: "GCAL_CALENDAR_ID_AYUSH_BAKHANDI" },
} as const;

/**
 * Notion "Meeting Type" option color -> Google Calendar event colorId, shared by every
 * tutor calendar. Google colors: 1 Lavender, 2 Sage, 3 Grape, 4 Flamingo, 5 Banana,
 * 6 Tangerine, 7 Peacock, 8 Graphite, 9 Blueberry, 10 Basil, 11 Tomato.
 */
const MEETING_TYPE_COLORS: Record<string, string> = {
  default: "8",
  gray: "8",
  brown: "6",
  orange: "6",
  yellow: "5",
  green: "10",
  blue: "9",
  purple: "3",
  pink: "4",
  red: "11",
};

/** Used when a session has no Meeting Type, so both calendars still match. */
const FALLBACK_COLOR_ID = "8";

type TutorCalendar = { tutor: string; calendarId: string };

/** Days of past sessions the full resync reconciles. */
const RESYNC_LOOKBACK_DAYS = 30;

function tutorCalendars(): TutorCalendar[] {
  const calendars = Object.entries(TUTORS).flatMap(([tutor, { calendarEnv }]) => {
    const calendarId = process.env[calendarEnv]?.trim();
    return calendarId ? [{ tutor, calendarId }] : [];
  });
  if (calendars.length === 0) {
    throw new Error("No tutor calendar IDs are set (GCAL_CALENDAR_ID_*)");
  }
  return calendars;
}

/** Google event IDs allow base32hex (0-9, a-v); a dashless Notion UUID fits. */
function eventIdFor(pageId: string): string {
  return pageId.replace(/-/g, "").toLowerCase();
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function eventTimes(session: Session): Pick<CalendarEvent, "start" | "end"> | null {
  const { start, end } = session;
  if (!start) return null;

  if (start.length === 10) {
    return {
      start: { date: start },
      end: { date: addDays((end ?? start).slice(0, 10), 1) },
    };
  }

  const timeZone = session.timeZone ?? DTA_SCHEDULE_TZ;
  const endDateTime =
    end && end.length > 10 ? end : new Date(Date.parse(start) + 60 * 60 * 1000).toISOString();
  return {
    start: { dateTime: start, timeZone },
    end: { dateTime: endDateTime, timeZone },
  };
}

function description(session: Session): string {
  return [
    `Student: ${session.students.join(", ") || "—"}`,
    `Primary Tutor: ${session.tutors.join(", ")}`,
    ...session.details.map((d) => `${d.label}: ${d.value}`),
    "",
    `Notion: ${session.url}`,
  ].join("\n");
}

export type SyncResult = {
  pageId: string;
  title?: string;
  action: "upserted" | "deleted" | "skipped";
  calendars?: string[];
  reason?: string;
};

/**
 * Writes the session into each selected tutor's calendar and removes it from the rest.
 * `existing` (calendarId -> event IDs) lets the full resync skip deletes that would no-op.
 */
async function applySession(
  session: Session,
  calendars: TutorCalendar[],
  existing?: Map<string, Set<string>>,
): Promise<SyncResult> {
  const eventId = eventIdFor(session.pageId);
  const times = session.deleted ? null : eventTimes(session);
  const targets = times
    ? calendars.filter((c) => session.tutors.includes(c.tutor))
    : [];

  for (const cal of calendars) {
    if (targets.includes(cal)) {
      await upsertEvent(cal.calendarId, eventId, {
        ...times,
        summary: session.title,
        description: description(session),
        colorId:
          MEETING_TYPE_COLORS[session.meetingTypeColor ?? ""] ?? FALLBACK_COLOR_ID,
        extendedProperties: {
          private: { source: "notion", notionPageId: session.pageId },
        },
      });
    } else if (!existing || existing.get(cal.calendarId)?.has(eventId)) {
      await deleteEvent(cal.calendarId, eventId);
    }
  }

  if (targets.length > 0) {
    return {
      pageId: session.pageId,
      title: session.title,
      action: "upserted",
      calendars: targets.map((t) => t.tutor),
    };
  }
  const reason = session.deleted
    ? "deleted in Notion"
    : !times
      ? "no date"
      : session.tutors.length === 0
        ? "no primary tutor"
        : `no calendar configured for ${session.tutors.join(", ")}`;
  return { pageId: session.pageId, title: session.title, action: "skipped", reason };
}

/** Sync a single Notion page (webhook path). */
export async function syncSession(pageId: string): Promise<SyncResult> {
  const calendars = tutorCalendars();
  const page = await getSessionPage(pageId);

  if (!page) {
    const eventId = eventIdFor(pageId);
    await Promise.all(calendars.map((c) => deleteEvent(c.calendarId, eventId)));
    return { pageId, action: "deleted", reason: "page not found" };
  }
  if (!(await isSessionPage(page))) {
    return { pageId, action: "skipped", reason: "not in Session Calendar" };
  }
  return applySession(await toSession(page), calendars);
}

/** Reconcile every recent session, then delete Notion-tagged events with no matching page. */
export async function syncAllSessions() {
  const calendars = tutorCalendars();
  const since = new Date(Date.now() - RESYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [sessions, ...eventIds] = await Promise.all([
    querySessions(since),
    ...calendars.map((c) => listNotionEvents(c.calendarId, since)),
  ]);
  const existing = new Map(calendars.map((c, i) => [c.calendarId, new Set(eventIds[i])]));

  const results: SyncResult[] = [];
  for (const session of sessions) {
    results.push(await applySession(session, calendars, existing));
  }

  const liveIds = new Set(sessions.map((s) => eventIdFor(s.pageId)));
  let orphansDeleted = 0;
  for (const cal of calendars) {
    for (const id of existing.get(cal.calendarId) ?? []) {
      if (!liveIds.has(id)) {
        await deleteEvent(cal.calendarId, id);
        orphansDeleted++;
      }
    }
  }

  return {
    since: since.toISOString(),
    upserted: results.filter((r) => r.action === "upserted").length,
    skipped: results.filter((r) => r.action === "skipped"),
    orphansDeleted,
  };
}
