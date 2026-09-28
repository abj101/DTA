import { NextResponse } from "next/server";

import {
  signupValidatePayloadSchema,
  type SignupValidateResponse,
} from "@/lib/office-hours-signup-schema";
import { checkStudentName, signupsConfigured } from "@/lib/office-hours-signups";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json<SignupValidateResponse>(
      { ok: false, error: "Expected JSON body." },
      { status: 400 },
    );
  }

  const parsed = signupValidatePayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json<SignupValidateResponse>(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  if (!signupsConfigured()) {
    return NextResponse.json<SignupValidateResponse>(
      { ok: false, error: "Signups are not configured yet." },
      { status: 503 },
    );
  }

  try {
    const { status } = await checkStudentName(parsed.data.name);
    return NextResponse.json<SignupValidateResponse>({ ok: true, status });
  } catch (error) {
    console.error("[office-hours] validate failed", error);
    return NextResponse.json<SignupValidateResponse>(
      { ok: false, error: "Could not check that name. Try again in a moment." },
      { status: 502 },
    );
  }
}
