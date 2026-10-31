import { patchEvent, listEventsByPrivateProps } from "@/lib/gcal";
import { buildIcs } from "@/lib/ics-invite";
import { sendNotification } from "@/lib/mailer";
import { formatOfficeDate, formatOfficeTimeRange, getOfficeHours, mapsSearchHref, type OfficeHoursResult } from "@/lib/office-hours";
import { formatSlotClock, signupsConfigured } from "@/lib/office-hours-signups";

let pending: Promise<{ sent: number; skipped: boolean }> | null = null;

/** Coalesce concurrent checks in this server process. */
export function notifyOfficeHoursChanges(data?: OfficeHoursResult) {
  if (!pending) pending = checkOfficeHoursChanges(data).finally(() => { pending = null; });
  return pending;
}

/** Check saved snapshots after the calendar feed changes; only acknowledge successful emails. */
async function checkOfficeHoursChanges(current?: OfficeHoursResult) {
  if (!signupsConfigured()) return { sent: 0, skipped: true };
  const calendarId = process.env.OFFICE_HOURS_CALENDAR_ID!.trim();
  const data = current ?? await getOfficeHours();
  if (data.status !== "ok") throw new Error("Office hours feed unavailable or empty");
  const bookings = await listEventsByPrivateProps(calendarId, { source: "dta-office-hours-signup" }, new Date());
  let sent = 0;
  let failed = 0;
  for (const booking of bookings) {
    const props = booking.extendedProperties?.private;
    if (!booking.id || !props?.studentEmail || !props.sessionId || !props.tutor || !booking.start?.dateTime || !booking.end?.dateTime) continue;
    const session = data.sessions.find((item) => item.id === props.sessionId);
    if (!session) continue;
    const location = JSON.stringify([session.venue, session.address]);
    if (props.sessionStart === session.start && props.sessionEnd === session.end && props.sessionLocation === location) continue;
    try {
      await sendNotification({
        to: props.studentEmail,
        subject: "DTA office hours have changed",
        text: `Hi ${booking.summary || "there"},\n\nThe office hours session you signed up for has changed.\n\nOffice hours: ${formatOfficeDate(new Date(session.start))}, ${formatOfficeTimeRange(new Date(session.start), new Date(session.end))}\nLocation: ${[session.venue, session.address].filter(Boolean).join(", ")}\n\nYour booked slot has not been changed and is still ${formatOfficeDate(new Date(booking.start.dateTime))} at ${formatSlotClock(new Date(booking.start.dateTime))} PT. Please contact us if you need to reschedule. An updated calendar file is attached.`,
        attachments: [{
          filename: "dta-office-hours.ics",
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
          content: buildIcs({
            uid: `${new Date(booking.start.dateTime).toISOString()}-${props.tutor.replace(/\s+/g, "-")}@dublintutoring`,
            sequence: Math.floor(Date.now() / 1000),
            start: booking.start.dateTime,
            end: booking.end.dateTime,
            summary: `DTA office hours with ${props.tutor}`,
            description: `Office hours slot with ${props.tutor}, booked on the DTA website. Office hours: ${formatOfficeDate(new Date(session.start))}, ${formatOfficeTimeRange(new Date(session.start), new Date(session.end))}.`,
            location: [session.venue, session.address].filter(Boolean).join(", "),
            url: session.mapsQuery && session.address ? mapsSearchHref(session.mapsQuery) : undefined,
          }),
        }],
      });
      await patchEvent(calendarId, booking.id, { extendedProperties: { private: { ...props, sessionStart: session.start, sessionEnd: session.end, sessionLocation: location } } });
      sent++;
    } catch (error) {
      failed++;
      console.error("[office-hours] change notification failed", error);
    }
  }
  if (failed) throw new Error(`${failed} office hours change notification(s) failed`);
  return { sent, skipped: false };
}
