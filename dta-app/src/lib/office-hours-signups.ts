import { createHash } from "node:crypto";

import { isFullPage, iteratePaginatedAPI } from "@notionhq/client";
import { unstable_cache } from "next/cache";

import { insertEventOnce, listEventsByPrivateProps } from "@/lib/gcal";
import { notion, plainText, resolveDataSourceId } from "@/lib/notion-sessions";
import {
  DROP_IN_MINUTES,
  formatClock,
  formatOfficeDate,
  formatOfficeTimeRange,
  officeHoursSlots,
  type OfficeHoursSession,
  type OfficeHoursSlot,
} from "@/lib/office-hours";
import type { SignupSlotsView } from "@/lib/office-hours-signup-schema";
import { DTA_SCHEDULE_TZ } from "@/lib/pacific-date";

/** Student Database property that marks who may book office hours. */
export const STUDENT_STATUS_PROP = "Status";
export const STUDENT_ACTIVE_VALUE = "Active";

const SIGNUP_SOURCE = "dta-office-hours-signup";
/** Invalidated by the Notion webhook whenever a page changes. */
export const ACTIVE_STUDENTS_TAG = "notion-active-students";

/** Google Calendar event colours: 9 = Blueberry, 2 = Sage. */
const TUTOR_COLOR_IDS: Record<string, string> = {
  "Ayush Bakhandi": "9",
  "Ayush Bandopadhyay": "2",
};

export function signupsConfigured(): boolean {
  return Boolean(
    process.env.OFFICE_HOURS_CALENDAR_ID?.trim() &&
      process.env.NOTION_STUDENTS_DATA_SOURCE_ID?.trim() &&
      process.env.NOTION_API_KEY?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim(),
  );
}

function calendarId(): string {
  const id = process.env.OFFICE_HOURS_CALENDAR_ID?.trim();
  if (!id) throw new Error("OFFICE_HOURS_CALENDAR_ID is not set");
  return id;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

let studentsDataSource: Promise<string> | null = null;

async function fetchActiveStudents(): Promise<[string, string][]> {
  const configured = process.env.NOTION_STUDENTS_DATA_SOURCE_ID?.trim();
  if (!configured) throw new Error("NOTION_STUDENTS_DATA_SOURCE_ID is not set");
  studentsDataSource ??= resolveDataSourceId(configured);
  const data_source_id = await studentsDataSource;

  const names = new Map<string, string>();
  for await (const page of iteratePaginatedAPI(notion().dataSources.query, {
    data_source_id,
  })) {
    if (!isFullPage(page) || page.in_trash) continue;
    const status = plainText(page.properties[STUDENT_STATUS_PROP]);
    if (status.trim().toLowerCase() !== STUDENT_ACTIVE_VALUE.toLowerCase()) continue;
    const name = plainText(
      Object.values(page.properties).find((prop) => prop.type === "title"),
    ).trim();
    if (name) names.set(normalizeName(name), name);
  }
  return [...names];
}

const cachedActiveStudents = unstable_cache(
  fetchActiveStudents,
  ["office-hours-active-students"],
  { tags: [ACTIVE_STUDENTS_TAG] },
);

/** Normalized name → name as written in Notion, for students with Status = Active. */
export async function getActiveStudentNames(): Promise<Map<string, string>> {
  return new Map(await cachedActiveStudents());
}

/** True when the student already holds a booking whose slot has not ended. */
export async function hasUpcomingSignup(studentName: string, now = new Date()): Promise<boolean> {
  const events = await listEventsByPrivateProps(
    calendarId(),
    { source: SIGNUP_SOURCE, studentKey: normalizeName(studentName) },
    now,
  );
  return events.length > 0;
}

export async function checkStudentName(
  name: string,
): Promise<{ status: "notFound" } | { status: "valid" | "alreadyBooked"; studentName: string }> {
  const studentName = (await getActiveStudentNames()).get(normalizeName(name));
  if (!studentName) return { status: "notFound" };
  return {
    status: (await hasUpcomingSignup(studentName)) ? "alreadyBooked" : "valid",
    studentName,
  };
}

/** "10:00 AM" in Pacific time. */
export function formatSlotClock(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DTA_SCHEDULE_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** "10:00 – 10:30 AM" in Pacific time; only the end carries AM/PM. */
export function formatSlotRange(start: Date, end: Date): string {
  const [s, e] = [start, end].map((date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: DTA_SCHEDULE_TZ,
      hour: "numeric",
      minute: "2-digit",
    }).formatToParts(date);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return { clock: `${part("hour")}:${part("minute")}`, period: part("dayPeriod") };
  });
  return `${s.clock} – ${e.clock} ${e.period}`;
}

/** Dialog layout for a session; `taken` marks booked slots (past slots are always taken). */
export function buildSlotsView(
  session: OfficeHoursSession,
  taken: ReadonlySet<string>,
  now = new Date(),
): SignupSlotsView {
  const start = new Date(session.start);
  const end = new Date(session.end);
  const dropInStart = new Date(end.getTime() - DROP_IN_MINUTES * 60 * 1000);
  return {
    ok: true,
    session: {
      date: formatOfficeDate(start),
      time: formatOfficeTimeRange(start, end),
    },
    dropInLabel: formatSlotRange(dropInStart, end),
    tutors: session.tutors.map(({ name, imageSrc, initials }) => ({
      name,
      imageSrc,
      initials,
    })),
    slots: officeHoursSlots(session, now).map((slot) => ({
      id: slot.id,
      tutorName: slot.tutorName,
      start: slot.start,
      label: formatSlotRange(new Date(slot.start), new Date(slot.end)),
      taken: slot.past || taken.has(slot.id),
    })),
  };
}

export async function listTakenSlotIds(session: OfficeHoursSession): Promise<Set<string>> {
  const events = await listEventsByPrivateProps(
    calendarId(),
    { source: SIGNUP_SOURCE },
    new Date(session.start),
    new Date(session.end),
  );
  return new Set(
    events.flatMap((event) => {
      const id = event.extendedProperties?.private?.slotId;
      return id ? [id] : [];
    }),
  );
}

function signupEventId(session: OfficeHoursSession, slot: OfficeHoursSlot): string {
  return createHash("sha1")
    .update(`${session.start}|${slot.tutorName}|${slot.start}`)
    .digest("hex");
}

export async function createSignup({
  session,
  slot,
  studentName,
  notes,
}: {
  session: OfficeHoursSession;
  slot: OfficeHoursSlot;
  studentName: string;
  notes?: string;
}): Promise<"created" | "exists"> {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const description = [
    notes?.trim() ? `Notes: ${notes.trim()}` : null,
    `Tutor: ${slot.tutorName}`,
    `Slot: ${formatOfficeDate(start)}, ${formatClock(start)} – ${formatClock(end)} PT`,
    "Booked via website",
  ]
    .filter(Boolean)
    .join("\n");

  return insertEventOnce(calendarId(), signupEventId(session, slot), {
    summary: studentName,
    description,
    start: { dateTime: slot.start, timeZone: DTA_SCHEDULE_TZ },
    end: { dateTime: slot.end, timeZone: DTA_SCHEDULE_TZ },
    colorId: TUTOR_COLOR_IDS[slot.tutorName],
    visibility: "private",
    extendedProperties: {
      private: {
        source: SIGNUP_SOURCE,
        studentKey: normalizeName(studentName),
        tutor: slot.tutorName,
        slotId: slot.id,
      },
    },
  });
}
