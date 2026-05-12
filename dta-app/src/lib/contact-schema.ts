import { z } from "zod";

import { GRADE_LEVELS, SUBJECTS } from "@/lib/contact-fields";

export const contactPayloadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email").max(320),
  grade: z.enum(GRADE_LEVELS),
  subject: z.enum(SUBJECTS),
  message: z.string().trim().min(1, "Message is required").max(10_000),
  /** Honeypot: must stay empty */
  website: z.string().max(500).optional(),
});

export type ContactPayload = z.infer<typeof contactPayloadSchema>;
