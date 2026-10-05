import nodemailer from "nodemailer";

/** SMTP settings shared by every outbound notification (see SMTP_* in .env.example). */
function config() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  return {
    host,
    port,
    secure:
      process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465,
    user,
    pass: process.env.SMTP_PASS?.trim(),
    to: process.env.CONTACT_TO_EMAIL?.trim(),
    from: process.env.CONTACT_FROM?.trim() ?? user,
  };
}

export function mailConfigured(): boolean {
  const { host, to, from } = config();
  return Boolean(host && to && from);
}

/** Sends one plain-text email to the notification inbox. Throws if SMTP is unset or sending fails. */
export async function sendNotification({
  subject,
  text,
  replyTo,
}: {
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const { host, port, secure, user, pass, to, from } = config();
  if (!host || !to || !from) throw new Error("SMTP is not configured");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  await transporter.sendMail({ from, to, replyTo, subject, text });
}
