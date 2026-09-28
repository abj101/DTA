import { z } from "zod";

const studentName = z
  .string()
  .trim()
  .min(1, "Student full name is required")
  .max(120);

export const signupValidatePayloadSchema = z.object({
  name: studentName,
});

export const signupPayloadSchema = z.object({
  name: studentName,
  slotId: z.string().trim().min(1, "Pick a time slot").max(200),
  notes: z
    .string()
    .trim()
    .min(1, "Add a note so your tutor knows what you need")
    .max(500, "Keep notes under 500 characters"),
  /** Honeypot: must stay empty */
  website: z.string().max(500).optional(),
});

export type SignupPayload = z.infer<typeof signupPayloadSchema>;

export type SignupNameStatus = "valid" | "notFound" | "alreadyBooked";

export type SignupSlotView = {
  id: string;
  tutorName: string;
  start: string;
  /** Row header, e.g. "10:00 – 10:30 AM". */
  label: string;
  taken: boolean;
};

export type SignupSlotsResponse =
  | {
      ok: true;
      session: { date: string; time: string };
      tutors: { name: string; imageSrc: string; initials: string }[];
      slots: SignupSlotView[];
      /** Row header for the closing drop-in-only window, e.g. "11:30 – 12:00 PM". */
      dropInLabel: string;
    }
  | { ok: false; error: string };

export type SignupValidateResponse =
  | { ok: true; status: SignupNameStatus }
  | { ok: false; error: string };

export type SignupResponse =
  | {
      ok: true;
      status: "booked";
      tutorName: string;
      time: string;
      start: string;
      end: string;
      location: { venue: string; address: string | null; mapsHref: string | null };
    }
  | {
      ok: false;
      status?: "slotTaken" | "notFound" | "alreadyBooked";
      error: string;
    };
