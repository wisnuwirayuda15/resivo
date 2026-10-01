import { z } from "zod";

import type { ResumeTarget } from "./records";

/**
 * A version's target, as the two files that carry one validate it.
 *
 * The backup and the resume bundle both store a resume's row fields beside its
 * document, and both need to refuse a target that is not what the app writes
 * before it reaches the database. One schema here so they cannot disagree. The
 * link is held to http and https: it is shown as a link, and a stored value is
 * as untrusted as a file's.
 */
export const resumeTargetSchema: z.ZodType<ResumeTarget> = z.object({
  company: z.string().max(200),
  role: z.string().max(200),
  url: z
    .string()
    .max(2048)
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "A posting link starts with http:// or https://",
    })
    .optional(),
});
