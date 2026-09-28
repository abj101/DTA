import { NextResponse } from "next/server";

import {
  DROP_IN_MINUTES,
  formatOfficeDate,
  formatOfficeTimeRange,
  getOfficeHours,
  mainSession,
  officeHoursSlots,
} from "@/lib/office-hours";
import type { SignupSlotsResponse } from "@/lib/office-hours-signup-schema";
import {
  formatSlotRange,
  listTakenSlotIds,
  signupsConfigured,
} from "@/lib/office-hours-signups";

export async function GET() {
  if (!signupsConfigured()) {
    return NextResponse.json<SignupSlotsResponse>(
      { ok: false, error: "Signups are not configured yet." },
      { status: 503 },
    );
  }

  const session = mainSession(await getOfficeHours());
  if (!session || session.tutors.length === 0) {
    return NextResponse.json<SignupSlotsResponse>(
      { ok: false, error: "No office hours session is open for signups." },
      { status: 404 },
    );
  }

  let taken: Set<string>;
  try {
    taken = await listTakenSlotIds(session);
  } catch (error) {
    console.error("[office-hours] list taken slots failed", error);
    return NextResponse.json<SignupSlotsResponse>(
      { ok: false, error: "Could not load open slots. Try again in a moment." },
      { status: 502 },
    );
  }

  const start = new Date(session.start);
  const end = new Date(session.end);
  const dropInStart = new Date(end.getTime() - DROP_IN_MINUTES * 60 * 1000);
  return NextResponse.json<SignupSlotsResponse>({
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
    slots: officeHoursSlots(session).map((slot) => ({
      id: slot.id,
      tutorName: slot.tutorName,
      start: slot.start,
      label: formatSlotRange(new Date(slot.start), new Date(slot.end)),
      taken: slot.past || taken.has(slot.id),
    })),
  });
}
