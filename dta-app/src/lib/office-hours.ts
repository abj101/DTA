import IcalExpander from "ical-expander";

import {
  DTA_SCHEDULE_TZ,
  formatYmdInTimeZone,
  getZonedWeekdaySun0,
  zonedDayUtcIsoRange,
} from "@/lib/pacific-date";
import { isStaticExport } from "@/lib/static-export";

export const OFFICE_HOURS_WINDOW_DAYS = 21;
export const LOCATION_TBA = "Location TBA";

/** Public Google Calendar iCal. Override with OFFICE_HOURS_ICS_URL if the feed moves. */
export const DEFAULT_OFFICE_HOURS_ICS_URL =
  "https://calendar.google.com/calendar/ical/b5273f9eaf0272b27ea58ad9c27a60daffbaa417742ac9605724f4170bbf2bde%40group.calendar.google.com/public/basic.ics";

export const OFFICE_HOURS_TUTORS = [
  {
    name: "Ayush Bakhandi",
    imageSrc: "/founders/ayush-bakhandi-portrait.png",
    initials: "AB",
  },
  {
    name: "Ayush Bandopadhyay",
    imageSrc: "/founders/ayush-bandopadhyay-portrait.jpg",
    initials: "AB",
  },
] as const;

export type OfficeHoursTutor = (typeof OFFICE_HOURS_TUTORS)[number];

export type OfficeHoursSession = {
  id: string;
  title: string;
  start: string;
  end: string;
  venue: string;
  address: string | null;
  mapsQuery: string | null;
  happeningNow: boolean;
  tutors: OfficeHoursTutor[];
};

/** Names in the ICS DESCRIPTION, comma-separated. Missing name → that tutor is not at the event. */
export function tutorsFromDescription(
  description: string | undefined | null,
): OfficeHoursTutor[] {
  const hay = (description ?? "").toLowerCase();
  return OFFICE_HOURS_TUTORS.filter((tutor) =>
    hay.includes(tutor.name.toLowerCase()),
  );
}

export type OfficeHoursResult =
  | {
      status: "ok";
      thisWeek: OfficeHoursSession | null;
      nextWeek: OfficeHoursSession | null;
    }
  | { status: "empty" }
  | { status: "error" }
  | { status: "static" };

type IcalDate = { toJSDate: () => Date };

type IcalEventLike = {
  uid?: string;
  summary?: string;
  location?: string;
  description?: string;
  recurrenceId?: IcalDate;
  startDate: IcalDate;
  endDate: IcalDate;
  component?: { getFirstPropertyValue: (name: string) => unknown };
  isRecurrenceException?: () => boolean;
};

type IcalOccurrenceLike = {
  startDate: IcalDate;
  endDate: IcalDate;
  recurrenceId?: IcalDate;
  item: IcalEventLike;
};

type TimedOccurrence = {
  uid: string;
  recurrenceKey: string;
  isException: boolean;
  title: string;
  location: string;
  description: string;
  start: Date;
  end: Date;
  status: string;
  classification: string;
};

function icalText(event: IcalEventLike, name: string): string {
  const value = event.component?.getFirstPropertyValue(name);
  return typeof value === "string" ? value : "";
}

function eventStatus(event: IcalEventLike): string {
  const value = icalText(event, "status");
  return value ? value.toUpperCase() : "CONFIRMED";
}

function eventClass(event: IcalEventLike): string {
  return icalText(event, "class").toUpperCase();
}

function recurrenceKeyFrom(date: Date): string {
  return formatYmdInTimeZone(date, DTA_SCHEDULE_TZ);
}

function fromEvent(event: IcalEventLike & { uid?: string; recurrenceId?: IcalDate }): TimedOccurrence {
  const start = event.startDate.toJSDate();
  const recId = event.recurrenceId?.toJSDate();
  return {
    uid: event.uid ?? "",
    recurrenceKey: recurrenceKeyFrom(recId ?? start),
    isException: Boolean(recId),
    title: event.summary?.trim() || "Office Hours",
    location: event.location ?? "",
    description: event.description?.trim() || icalText(event, "description"),
    start,
    end: event.endDate.toJSDate(),
    status: eventStatus(event),
    classification: eventClass(event),
  };
}

function fromOccurrence(occurrence: IcalOccurrenceLike & { recurrenceId?: IcalDate }): TimedOccurrence {
  const start = occurrence.startDate.toJSDate();
  const recId = occurrence.recurrenceId?.toJSDate();
  return {
    uid: occurrence.item.uid ?? "",
    recurrenceKey: recurrenceKeyFrom(recId ?? start),
    isException: Boolean(occurrence.item.recurrenceId),
    title: occurrence.item.summary?.trim() || "Office Hours",
    location: occurrence.item.location ?? "",
    description: occurrence.item.description?.trim() || icalText(occurrence.item, "description"),
    start,
    end: occurrence.endDate.toJSDate(),
    status: eventStatus(occurrence.item),
    classification: eventClass(occurrence.item),
  };
}

function isTba(raw: string): boolean {
  const t = raw.trim();
  return t.length === 0 || /^tbd$/i.test(t) || /^tba$/i.test(t);
}

export function parseLocation(raw: string | undefined | null): {
  venue: string;
  address: string | null;
  mapsQuery: string | null;
} {
  if (!raw || isTba(raw)) {
    return { venue: LOCATION_TBA, address: null, mapsQuery: null };
  }

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const venue = parts[0] ?? LOCATION_TBA;
  const stateIdx = parts.findIndex((part) =>
    /^[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?$/.test(part),
  );
  const city = stateIdx > 0 ? parts[stateIdx - 1] ?? null : null;
  const streetParts = stateIdx > 1 ? parts.slice(1, stateIdx - 1) : [];
  const street = streetParts.join(", ") || null;
  const address =
    [street, city].filter(Boolean).join(", ") || null;
  const mapsQuery = parts
    .filter((part) => !/^(USA|US)$/i.test(part))
    .join(", ");

  return { venue, address, mapsQuery };
}

export function mapsSearchHref(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function formatClock(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DTA_SCHEDULE_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value;
  if (!hour || !minute || !dayPeriod) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: DTA_SCHEDULE_TZ,
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  if (minute === "00") return `${hour} ${dayPeriod}`;
  return `${hour}:${minute} ${dayPeriod}`;
}

export function formatOfficeDate(start: Date): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: DTA_SCHEDULE_TZ,
    weekday: "long",
  }).format(start);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    timeZone: DTA_SCHEDULE_TZ,
    month: "short",
    day: "numeric",
  }).format(start);
  return `${weekday}, ${monthDay}`;
}

export function formatOfficeTimeRange(start: Date, end: Date): string {
  return `${formatClock(start)} – ${formatClock(end)} PT`;
}

function addCalendarDaysYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day + days);
  const next = new Date(utc);
  const y = String(next.getUTCFullYear());
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday-start week bounds in `timeZone`. */
function zonedMondayWeekBounds(now: Date, timeZone: string) {
  const todayYmd = formatYmdInTimeZone(now, timeZone);
  const sun0 = getZonedWeekdaySun0(now, timeZone);
  const daysFromMonday = sun0 === 0 ? 6 : sun0 - 1;
  const mondayYmd = addCalendarDaysYmd(todayYmd, -daysFromMonday);
  const nextMondayYmd = addCalendarDaysYmd(mondayYmd, 7);
  const weekAfterYmd = addCalendarDaysYmd(mondayYmd, 14);

  return {
    thisWeekStart: new Date(zonedDayUtcIsoRange(mondayYmd, timeZone).start),
    nextWeekStart: new Date(zonedDayUtcIsoRange(nextMondayYmd, timeZone).start),
    weekAfterStart: new Date(zonedDayUtcIsoRange(weekAfterYmd, timeZone).start),
  };
}

function firstInRange(
  sessions: OfficeHoursSession[],
  rangeStart: Date,
  rangeEnd: Date,
): OfficeHoursSession | null {
  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  return (
    sessions.find((session) => {
      const start = new Date(session.start).getTime();
      return start >= startMs && start < endMs;
    }) ?? null
  );
}
function toSession(item: TimedOccurrence, now: Date): OfficeHoursSession {
  const { venue, address, mapsQuery } = parseLocation(item.location);
  return {
    id: item.start.toISOString(),
    title: item.title,
    start: item.start.toISOString(),
    end: item.end.toISOString(),
    venue,
    address,
    mapsQuery,
    happeningNow: now >= item.start && now < item.end,
    tutors: tutorsFromDescription(item.description),
  };
}

/** Website signups are private events; the public feed shows them as bare "Busy" blocks. */
function isSignupEvent(item: TimedOccurrence): boolean {
  if (item.classification === "PRIVATE" || item.classification === "CONFIDENTIAL") {
    return true;
  }
  return item.title.toLowerCase() === "busy" && !item.description.trim();
}

function mergeOccurrences(items: TimedOccurrence[]): TimedOccurrence[] {
  const byKey = new Map<string, TimedOccurrence>();
  for (const item of items) {
    const key = `${item.uid}::${item.recurrenceKey}`;
    const prev = byKey.get(key);
    if (!prev || (item.isException && !prev.isException)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

function collectOccurrences(
  ics: string,
  now: Date,
  windowEnd: Date,
): TimedOccurrence[] {
  const expander = new IcalExpander({
    ics,
    maxIterations: 200,
    skipInvalidDates: true,
  });
  const rangeStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const { events, occurrences } = expander.between(rangeStart, windowEnd);

  const rawExceptions = (
    expander as unknown as { events: IcalEventLike[] }
  ).events.filter((event) => event.isRecurrenceException?.());

  const merged = mergeOccurrences([
    ...(events as IcalEventLike[]).map(fromEvent),
    ...(occurrences as IcalOccurrenceLike[]).map(fromOccurrence),
    ...rawExceptions.map(fromEvent),
  ]);

  return merged.filter((item) => {
    if (item.status === "CANCELLED") return false;
    if (isSignupEvent(item)) return false;
    if (!(item.end instanceof Date) || Number.isNaN(item.end.getTime())) {
      return false;
    }
    return item.end.getTime() > now.getTime() && item.start.getTime() <= windowEnd.getTime();
  });
}

export const SIGNUP_SLOT_MINUTES = 30;
export const SIGNUP_SLOTS_PER_TUTOR = 3;
/** Final stretch of each session is drop-in only. */
export const DROP_IN_MINUTES = 30;

export type OfficeHoursSlot = {
  id: string;
  tutorName: string;
  start: string;
  end: string;
  past: boolean;
};

/** The session the page features (and the only one open for signups). */
export function mainSession(
  data: OfficeHoursResult,
): OfficeHoursSession | null {
  if (data.status !== "ok") return null;
  return data.thisWeek ?? data.nextWeek;
}

export function slotId(tutorName: string, start: Date): string {
  return `${start.toISOString()}|${tutorName}`;
}

/** Bookable 30-minute slots per tutor from the session start, stopping before the drop-in window. */
export function officeHoursSlots(
  session: OfficeHoursSession,
  now = new Date(),
): OfficeHoursSlot[] {
  const sessionStart = new Date(session.start).getTime();
  const bookableEnd =
    new Date(session.end).getTime() - DROP_IN_MINUTES * 60 * 1000;
  const slotMs = SIGNUP_SLOT_MINUTES * 60 * 1000;
  const slots: OfficeHoursSlot[] = [];
  for (const tutor of session.tutors) {
    for (let i = 0; i < SIGNUP_SLOTS_PER_TUTOR; i++) {
      const start = new Date(sessionStart + i * slotMs);
      const end = new Date(start.getTime() + slotMs);
      if (end.getTime() > bookableEnd) break;
      slots.push({
        id: slotId(tutor.name, start),
        tutorName: tutor.name,
        start: start.toISOString(),
        end: end.toISOString(),
        past: now >= start,
      });
    }
  }
  return slots;
}

export async function getOfficeHours(
  now = new Date(),
): Promise<OfficeHoursResult> {
  if (isStaticExport) {
    return { status: "static" };
  }

  const url =
    process.env.OFFICE_HOURS_ICS_URL?.trim() || DEFAULT_OFFICE_HOURS_ICS_URL;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "text/calendar, text/plain, */*",
        "User-Agent": "DublinTutoringAssociation/1.0",
      },
    });
    if (!res.ok) {
      console.error("office-hours: ICS HTTP", res.status);
      return { status: "error" };
    }

    const ics = await res.text();
    if (!ics.includes("BEGIN:VCALENDAR")) {
      console.error("office-hours: ICS body missing VCALENDAR");
      return { status: "error" };
    }

    const windowEnd = new Date(
      now.getTime() + OFFICE_HOURS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const sessions = collectOccurrences(ics, now, windowEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((item) => toSession(item, now));

    const { thisWeekStart, nextWeekStart, weekAfterStart } =
      zonedMondayWeekBounds(now, DTA_SCHEDULE_TZ);
    const thisWeek = firstInRange(sessions, thisWeekStart, nextWeekStart);
    const nextWeek = firstInRange(sessions, nextWeekStart, weekAfterStart);

    if (!thisWeek && !nextWeek) {
      return { status: "empty" };
    }

    return { status: "ok", thisWeek, nextWeek };
  } catch (error) {
    console.error("office-hours: ICS fetch failed", error);
    return { status: "error" };
  }
}
