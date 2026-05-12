import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

import { contactPayloadSchema } from "@/lib/contact-schema";

function firstValidationMessage(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input";
}

function smtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim();
  const from =
    process.env.CONTACT_FROM?.trim() ?? process.env.SMTP_USER?.trim();
  return Boolean(host && to && from);
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

  if (!smtpConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Contact form is not configured yet. See SMTP settings in deployment docs.",
      },
      { status: 503 },
    );
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    port === 465;

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const to = process.env.CONTACT_TO_EMAIL!.trim();
  const from =
    process.env.CONTACT_FROM?.trim() ?? process.env.SMTP_USER!.trim();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      user && pass
        ? {
            user,
            pass,
          }
        : undefined,
  });

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
    await transporter.sendMail({
      from,
      to,
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
