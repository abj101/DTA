import { auth, calendar, type calendar_v3 } from "@googleapis/calendar";

export type CalendarEvent = calendar_v3.Schema$Event;

let client: calendar_v3.Calendar | null = null;

function gcal(): calendar_v3.Calendar {
  if (client) return client;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!email || !key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are not set");
  }
  const jwt = new auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
  client = calendar({ version: "v3", auth: jwt });
  return client;
}

function status(error: unknown): number | undefined {
  const e = error as { status?: number; code?: number | string };
  return e.status ?? (typeof e.code === "number" ? e.code : Number(e.code) || undefined);
}

/** Update-then-insert so re-syncs are idempotent and cancelled events are revived. */
export async function upsertEvent(calendarId: string, eventId: string, event: CalendarEvent) {
  const requestBody = { ...event, id: eventId, status: "confirmed" };
  try {
    await gcal().events.update({ calendarId, eventId, requestBody });
  } catch (error) {
    if (status(error) !== 404) throw error;
    try {
      await gcal().events.insert({ calendarId, requestBody });
    } catch (insertError) {
      if (status(insertError) !== 409) throw insertError;
      await gcal().events.update({ calendarId, eventId, requestBody });
    }
  }
}

export async function deleteEvent(calendarId: string, eventId: string) {
  try {
    await gcal().events.delete({ calendarId, eventId });
  } catch (error) {
    const code = status(error);
    if (code !== 404 && code !== 410) throw error;
  }
}

/**
 * Insert-only: never overwrites a live event. A previously deleted event with the same ID
 * is revived so deleting a booking in Google Calendar frees its ID.
 */
export async function insertEventOnce(
  calendarId: string,
  eventId: string,
  event: CalendarEvent,
): Promise<"created" | "exists"> {
  const requestBody = { ...event, id: eventId, status: "confirmed" };
  try {
    await gcal().events.insert({ calendarId, requestBody });
    return "created";
  } catch (error) {
    if (status(error) !== 409) throw error;
  }
  const { data: existing } = await gcal().events.get({ calendarId, eventId });
  if (existing.status !== "cancelled") return "exists";
  await gcal().events.update({ calendarId, eventId, requestBody });
  return "created";
}

/** Non-cancelled events tagged with every `key=value` private extended property, ending after `timeMin`. */
export async function listEventsByPrivateProps(
  calendarId: string,
  props: Record<string, string>,
  timeMin: Date,
  timeMax?: Date,
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;
  do {
    const { data } = await gcal().events.list({
      calendarId,
      privateExtendedProperty: Object.entries(props).map(([k, v]) => `${k}=${v}`),
      timeMin: timeMin.toISOString(),
      timeMax: timeMax?.toISOString(),
      singleEvents: true,
      maxResults: 2500,
      pageToken,
    });
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);
  return events;
}

/** Event IDs of Notion-sourced events on `calendarId` that end on or after `since`. */
export async function listNotionEvents(calendarId: string, since: Date): Promise<string[]> {
  const events = await listEventsByPrivateProps(calendarId, { source: "notion" }, since);
  return events.flatMap((event) => (event.id ? [event.id] : []));
}
