import type { InlineText } from "@/features/resume/model/document";

/**
 * Whether a run of inline text is plain enough to edit as a string.
 *
 * Anything carrying bold, italic or a link cannot round-trip through a text
 * input without losing its formatting, so the panels show it read-only and point
 * the user at a surface where the formatting is visible. Silently flattening it
 * would be a data loss nobody asked for.
 */
export const isPlainInline = (value: InlineText): boolean =>
  value.length === 0 ||
  (value.length === 1 &&
    value[0]?.type === "text" &&
    (value[0].marks ?? []).length === 0);
