import { produce } from "immer";

import { checkDocument } from "@/features/ats/check";
import { documentFromMarkdown } from "@/features/markdown/parse";
import { createEmptyDocument } from "@/features/resume/model/factory";
import { SAMPLE_SOURCE } from "@/features/resume/sample";

import type { AtsIssue } from "@/features/ats/types";
import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * The example resume, made not to be clean.
 *
 * The example passes the ATS check, so there would be nothing to show. Its body
 * text is set to 8pt and its margins to 0.3 inches, and an empty Awards section
 * is added, which gives three findings from the real rules and each of them
 * with the app's own fix. The film applies those fixes the way the panel does:
 * a recipe run against the document.
 */
const damaged = (): ResumeDocument =>
  produce(
    documentFromMarkdown(
      createEmptyDocument("classic"),
      SAMPLE_SOURCE + "\n\n## Awards\n",
    ).document,
    (draft) => {
      draft.design.typography.baseSize = 8;
      draft.design.paper.margin = {
        top: 0.3,
        right: 0.3,
        bottom: 0.3,
        left: 0.3,
      };
    },
  );

export const BEFORE = damaged();

/** In the order the panel lists them: sections, then the style rules. */
export const ISSUES: ReadonlyArray<AtsIssue> = checkDocument(BEFORE);

export const isBodySize = (issue: AtsIssue): boolean =>
  issue.rule === "ats.font-size-small";

const run = (
  document: ResumeDocument,
  issues: ReadonlyArray<AtsIssue>,
): ResumeDocument =>
  produce(document, (draft) => {
    for (const issue of issues) {
      issue.fix?.recipe(draft);
    }
  });

/** The one fix that is applied on its own: the body size, which reflows. */
const ONE = ISSUES.find(isBodySize);

export const AFTER_ONE = run(BEFORE, ONE === undefined ? [] : [ONE]);

export const AFTER_ALL = run(
  AFTER_ONE,
  ISSUES.filter((issue) => !isBodySize(issue)),
);
