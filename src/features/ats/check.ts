import { contactRules } from "./rules/contact";
import { contentRules } from "./rules/content";
import { cssRules } from "./rules/css";
import { dateRules } from "./rules/dates";
import { structureRules } from "./rules/structure";
import { typographyRules } from "./rules/typography";

import type { ResumeDocument } from "@/features/resume/model/document";
import type { AtsIssue, AtsRule, Severity } from "./types";

/**
 * The ATS checker.
 *
 * A pure function of the document, with no network and no state, so it can run
 * on every edit while its panel is open and cost nothing while it is not.
 *
 * It looks for the common ways a resume reads badly to an applicant tracking
 * system. It cannot say a resume will pass, because every system parses
 * differently and none of them publishes how, and the panel that shows these
 * results says so.
 */

export const RULES: ReadonlyArray<AtsRule> = [
  ...contactRules,
  ...structureRules,
  ...dateRules,
  ...typographyRules,
  ...cssRules,
  ...contentRules,
];

const SEVERITY_ORDER: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

/**
 * Every issue in the document, errors first.
 *
 * `Array.prototype.sort` is stable, so within one severity the issues keep the
 * order the rules ran in, which is the order the page reads: header, sections,
 * dates, then style.
 */
export const checkDocument = (document: ResumeDocument): Array<AtsIssue> =>
  RULES.flatMap((rule) => rule(document)).sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
