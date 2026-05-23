import { z } from "zod";

export const bookingPayloadSchema = z.object({
  startTime: z
    .string()
    .min(1, "Choose a time slot.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid time slot."),
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(120, "Name is too long."),
  email: z.string().trim().email("Enter a valid email."),
  /** Honeypot — must be empty. */
  website: z.string().optional(),
});

export type BookingPayload = z.infer<typeof bookingPayloadSchema>;

export function splitInviteeName(fullName: string) {
  const name = fullName.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? name;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;
  return { name, firstName, lastName };
}
