import { z } from "zod";

export const contactTopics = ["general", "order", "branch", "business", "franchise", "other"] as const;
export type ContactTopic = (typeof contactTopics)[number];

/** Error codes map to localized messages in the dictionaries. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "name_required").max(120, "too_long"),
  email: z.email("email_invalid").max(200, "too_long"),
  phone: z
    .string()
    .trim()
    .max(30, "too_long")
    .refine((v) => v === "" || /^[+()\d\s.-]{7,}$/.test(v), "phone_invalid")
    .optional()
    .default(""),
  topic: z.enum(contactTopics, "topic_required"),
  company: z.string().trim().max(160, "too_long").optional().default(""),
  branch: z.string().trim().max(120, "too_long").optional().default(""),
  message: z.string().trim().min(10, "message_short").max(4000, "too_long"),
  consent: z.literal(true, "consent_required"),
  lang: z.enum(["fr", "en"]).default("fr"),
  /** Honeypot: must stay empty. */
  website: z.string().max(0, "spam").optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
