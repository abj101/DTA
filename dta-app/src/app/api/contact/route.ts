import { NextResponse } from "next/server";

import { contactPayloadSchema } from "@/lib/contact-schema";
import { mailConfigured, sendNotification } from "@/lib/mailer";

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

  const parsed = contactPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: firstValidationMessage(parsed.error) },
      { status: 400 },
    );
  }

  const { name, email, grade, subject, message, website } = parsed.data;
  if (website?.trim()) {
    return NextResponse.json({ ok: false, error: "Invalid submission." }, { status: 400 });
  }

  if (!mailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Contact form is not configured yet. See SMTP settings in deployment docs.",
      },
      { status: 503 },
    );
  }

  const text = [
    `New message from dta-app contact form`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
    `Grade: ${grade}`,
    `Subject of interest: ${subject}`,
    ``,
    message,
  ].join("\n");

  try {
    await sendNotification({
      replyTo: email,
      subject: `[DTA contact] ${subject} · ${grade}`,
      text,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not send message. Try email or phone instead.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
