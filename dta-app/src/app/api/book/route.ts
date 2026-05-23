import { NextResponse } from "next/server";

import { bookingPayloadSchema, splitInviteeName } from "@/lib/booking-schema";
import { createEventInvitee, getCalendlyConfig } from "@/lib/calendly-server";
import { DTA_SCHEDULE_TZ } from "@/lib/pacific-date";

function firstValidationMessage(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input";
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected JSON body." }, { status: 400 });
  }

  const parsed = bookingPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: firstValidationMessage(parsed.error) },
      { status: 400 },
    );
  }

  const { startTime, name, email, website } = parsed.data;
  if (website?.trim()) {
    return NextResponse.json({ ok: false, error: "Invalid submission." }, { status: 400 });
  }

  const config = getCalendlyConfig();
  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Scheduling is not configured (missing CALENDLY_API_TOKEN or CALENDLY_EVENT_TYPE_UUID).",
      },
      { status: 503 },
    );
  }

  const { name: fullName, firstName, lastName } = splitInviteeName(name);
  const result = await createEventInvitee(config, {
    startTime,
    name: fullName,
    firstName,
    lastName,
    email,
    timezone: DTA_SCHEDULE_TZ,
  });

  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      console.error(
        "[book] Calendly auth/scope error",
        JSON.stringify({ status: result.status, detail: result.detail }, null, 2),
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "Scheduling API access denied. Ensure your Calendly token includes scheduled_events:write and your account has Scheduling API access (paid plan).",
          detail: result.detail,
        },
        { status: 503 },
      );
    }

    if (result.slotUnavailable) {
      return NextResponse.json(
        {
          ok: false,
          error: "That time was just booked. Pick another slot.",
          detail: result.detail,
        },
        { status: 409 },
      );
    }

    console.error(
      "[book] Calendly API error",
      JSON.stringify({ status: result.status, detail: result.detail }, null, 2),
    );
    return NextResponse.json(
      { ok: false, error: "Could not complete booking.", detail: result.detail },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    startTime: result.startTime,
    timezone: DTA_SCHEDULE_TZ,
    cancelUrl: result.cancelUrl,
    rescheduleUrl: result.rescheduleUrl,
  });
}
