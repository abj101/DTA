import { NextResponse } from "next/server";

import { getOfficeHours, mainSession } from "@/lib/office-hours";
import type { SignupSlotsResponse } from "@/lib/office-hours-signup-schema";
import {
  buildSlotsView,
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

  return NextResponse.json<SignupSlotsResponse>(buildSlotsView(session, taken));
}
