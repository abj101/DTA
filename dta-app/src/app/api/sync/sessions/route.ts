import { NextResponse } from "next/server";

import { syncAllSessions } from "@/lib/session-sync";

export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not set." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await syncAllSessions();
    console.log("[session-sync] full resync", summary);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[session-sync] full resync failed", error);
    return NextResponse.json({ ok: false, error: "Resync failed." }, { status: 500 });
  }
}
