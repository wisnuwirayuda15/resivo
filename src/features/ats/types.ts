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
 * Every rule, by the name its words are filed under.
 *
 * A list and not a type written out twice: the message tree is checked against
 * it (`rules` in the `ats` namespace has one entry per name), and an issue can
 * only be built for a name that is here, so a rule added without its words, or
 * words left behind by a rule that went, are both type errors.
 */
export const ATS_RULE_NAMES = [
  "name-missing",
  "email-missing",
  "phone-missing",
  "contact-icon-only",
  "section-title-empty",
  "section-empty",
  "core-sections-missing",
  "section-title-unusual",
  "columns-two",
  "table-used",
  "raw-block",
  "image-alt-missing",
  "avatar-present",
  "date-order",
  "date-start-missing",
  "date-unparsed",
  "date-format-mixed",
  "date-gap",
  "font-size-small",
  "margins-narrow",
  "contrast-low",
  "font-custom",
  "css-hides-text",
  "css-generated-content",
  "bullet-long",
  "summary-long",
  "entry-empty",
  "page-count",
] as const;

export type AtsRuleName = (typeof ATS_RULE_NAMES)[number];

/** A rule's id as it appears on an issue, `ats.` and then its name. */
export type AtsRuleId = `ats.${AtsRuleName}`;

/** The name a rule's words are filed under, from its id. */
export const ruleName = (id: AtsRuleId): AtsRuleName =>
  id.slice("ats.".length) as AtsRuleName;

/**
 * What a rule's sentences are filled in with.
 *
 * Plain strings and numbers, never text the rule wrote: the checker says what
 * it found and where, and the words for it are chosen when the issue is shown,
 * in whichever language the interface is in. A `context` entry picks among
 * variants of one sentence (which colour, which font), the way i18next's own
 * `context` option does.
 */
export type AtsParams = Record<string, string | number>;

/**
 * One click that removes an issue.
 *
 * A `Recipe` and not a callback, so applying it goes through the same `apply`
 * as every other edit and one undo takes it back. Its label is a message, like
 * the rest of the issue's words.
 */
export interface AtsFix {
  recipe: Recipe;
}

export interface AtsIssue {
  /** `${rule}:${target}`. Stable across edits, so it is the React key and the
   * key the panel remembers a dismissal by. */
  id: string;
  /** The rule that produced it, e.g. `ats.font-size-small`. */
  rule: AtsRuleId;
  severity: Severity;
  /** What fills the rule's sentences in. See `AtsParams`. */
  params: AtsParams;
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
