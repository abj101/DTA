import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { ACTIVE_STUDENTS_TAG } from "@/lib/office-hours-signups";
import { syncSession } from "@/lib/session-sync";

export const maxDuration = 60;

type NotionWebhookEvent = {
  verification_token?: string;
  type?: string;
  entity?: { id: string; type: string };
};

function validSignature(body: string, header: string | null, token: string): boolean {
  if (!header) return false;
  const expected = `sha256=${createHmac("sha256", token).update(body).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const body = await req.text();

  let event: NotionWebhookEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "Expected JSON body." }, { status: 400 });
  }

  // One-time subscription handshake: copy this token into NOTION_WEBHOOK_VERIFICATION_TOKEN.
  if (event.verification_token) {
    console.log(`[notion-webhook] verification_token: ${event.verification_token}`);
    return NextResponse.json({ ok: true });
  }

  const token = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "NOTION_WEBHOOK_VERIFICATION_TOKEN is not set." },
      { status: 503 },
    );
  }
  if (!validSignature(body, req.headers.get("x-notion-signature"), token)) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  if (!event.type?.startsWith("page.") || event.entity?.type !== "page") {
    return NextResponse.json({ ok: true, ignored: event.type ?? "unknown" });
  }

  // Cheap to refetch, so any page change refreshes the office hours roster.
  revalidateTag(ACTIVE_STUDENTS_TAG, { expire: 0 });

  try {
    const result = await syncSession(event.entity.id);
    console.log(`[notion-webhook] ${event.type}`, result);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error(`[notion-webhook] sync failed for ${event.entity.id}`, error);
    return NextResponse.json({ ok: false, error: "Sync failed." }, { status: 500 });
  }
}
