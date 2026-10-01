import type { Recipe } from "@/features/editor/mutations";
import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * What the ATS checker reports.
 *
 * `error` is reserved for what certainly breaks a parser (no name, a contact
 * with an icon and no text, an end date before its start). `warning` is a real
 * risk that depends on the system reading the file, and `info` is a suggestion.
 * Keeping `error` narrow is what makes the word worth anything: a checker that
 * cries wolf teaches its reader to stop looking.
 */
export type Severity = "error" | "warning" | "info";

/**
 * One click that removes an issue.
 *
 * A `Recipe` and not a callback, so applying it goes through the same `apply`
 * as every other edit and one undo takes it back.
 */
export interface AtsFix {
  label: string;
  recipe: Recipe;
}

export interface AtsIssue {
  /** `${rule}:${target}`. Stable across edits, so it is the React key and the
   * key the panel remembers a dismissal by. */
  id: string;
  /** The rule that produced it, e.g. `ats.font-size-small`. */
  rule: string;
  severity: Severity;
  /** What is wrong, in one sentence. */
  message: string;
  /** Why a parser or a recruiter cares, in one sentence. */
  why: string;
  /** Where it is, as words: a section and an entry, or a style control. */
  where: string;
  fix?: AtsFix;
}

/**
 * What a rule may know that is not in the document.
 *
 * Only the page count today. It is a measurement of the rendered paper, so it is
 * handed in rather than derived, and it is `null` whenever nobody has measured
 * the current document. A rule that needs it has to say nothing for `null`, not
 * guess.
 */
export interface AtsContext {
  pageCount: number | null;
}

/** A rule reads the document and returns every place it applies, possibly none. */
export type AtsRule = (
  document: ResumeDocument,
  context: AtsContext,
) => Array<AtsIssue>;
