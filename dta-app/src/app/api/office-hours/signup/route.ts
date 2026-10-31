import { NextResponse } from "next/server";

import { buildIcs } from "@/lib/ics-invite";
import { sendNotification } from "@/lib/mailer";
import {
  formatOfficeDate,
  getOfficeHours,
  mainSession,
  mapsSearchHref,
  officeHoursSlots,
} from "@/lib/office-hours";
import {
  signupPayloadSchema,
  type SignupResponse,
} from "@/lib/office-hours-signup-schema";
import {
  checkStudentName,
  createSignup,
  formatSlotClock,
  signupsConfigured,
} from "@/lib/office-hours-signups";

const SLOT_TAKEN = "That slot was just taken — pick another.";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json<SignupResponse>(
      { ok: false, error: "Expected JSON body." },
      { status: 400 },
    );
  }

  const parsed = signupPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json<SignupResponse>(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, email, slotId, notes, website } = parsed.data;
  if (website?.trim()) {
    return NextResponse.json<SignupResponse>(
      { ok: false, error: "Invalid submission." },
      { status: 400 },
    );
  }

  if (!signupsConfigured()) {
    return NextResponse.json<SignupResponse>(
      { ok: false, error: "Signups are not configured yet." },
      { status: 503 },
    );
  }

  const session = mainSession(await getOfficeHours());
  const slot = session ? officeHoursSlots(session).find((s) => s.id === slotId) : undefined;
  if (!session || !slot || slot.past) {
    return NextResponse.json<SignupResponse>(
      { ok: false, status: "slotTaken", error: SLOT_TAKEN },
      { status: 409 },
    );
  }

  let emailSent = false;
  try {
    const check = await checkStudentName(name);
    if (check.status === "notFound") {
      return NextResponse.json<SignupResponse>(
        {
          ok: false,
          status: "notFound",
          error: "We couldn't find an active student with that name.",
        },
        { status: 403 },
      );
    }
    if (check.status === "alreadyBooked") {
      return NextResponse.json<SignupResponse>(
        {
          ok: false,
          status: "alreadyBooked",
          error: "You already have an upcoming office hours signup.",
        },
        { status: 409 },
      );
    }

    const result = await createSignup({
      session,
      slot,
      studentName: check.studentName,
      email,
      notes,
    });
    if (result === "exists") {
      return NextResponse.json<SignupResponse>(
        { ok: false, status: "slotTaken", error: SLOT_TAKEN },
        { status: 409 },
      );
    }

    // Best-effort notification; a mail failure must never fail the booking.
    const start = new Date(slot.start);
    try {
      await sendNotification({
        subject: `[DTA office hours] ${check.studentName} · ${formatOfficeDate(start)} ${formatSlotClock(start)}`,
        text: [
          "New office hours signup",
          "",
          `Student: ${check.studentName}`,
          `Email: ${email}`,
          `Tutor: ${slot.tutorName}`,
          `When: ${formatOfficeDate(start)}, ${formatSlotClock(start)} PT`,
          `Venue: ${session.venue}`,
          notes?.trim() ? `Notes: ${notes.trim()}` : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      });
    } catch (error) {
      console.error("[office-hours] signup notification failed", error);
    }
    try {
      await sendNotification({
        to: email,
        subject: "Your DTA office hours confirmation",
        text: `Hi ${check.studentName},\n\nYou are booked for office hours with ${slot.tutorName} on ${formatOfficeDate(start)} at ${formatSlotClock(start)} PT.\n\nLocation: ${[session.venue, session.address].filter(Boolean).join(", ")}\n\nYour calendar event is attached.`,
        attachments: [{
          filename: "dta-office-hours.ics",
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
          content: buildIcs({
            uid: `${slot.start}-${slot.tutorName.replace(/\s+/g, "-")}@dublintutoring`,
            start: slot.start, end: slot.end,
            summary: `DTA office hours with ${slot.tutorName}`,
            description: `Office hours slot with ${slot.tutorName}, booked on the DTA website.`,
            location: [session.venue, session.address].filter(Boolean).join(", "),
            url: session.mapsQuery && session.address ? mapsSearchHref(session.mapsQuery) : undefined,
          }),
        }],
      });
      emailSent = true;
    } catch (error) {
      console.error("[office-hours] confirmation email failed", error);
    }
  } catch (error) {
    console.error("[office-hours] signup failed", error);
    return NextResponse.json<SignupResponse>(
      { ok: false, error: "Could not complete your signup. Try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json<SignupResponse>({
    ok: true,
    status: "booked",
    emailSent,
    tutorName: slot.tutorName,
    time: formatSlotClock(new Date(slot.start)),
    start: slot.start,
    end: slot.end,
    location: {
      venue: session.venue,
      address: session.address,
      mapsHref:
        session.mapsQuery && session.address ? mapsSearchHref(session.mapsQuery) : null,
    },
  });
}
