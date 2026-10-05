import { NextResponse } from "next/server";

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

  const { name, slotId, notes, website } = parsed.data;
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
