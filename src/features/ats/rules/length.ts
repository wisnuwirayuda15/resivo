import { blockText } from "@/features/interchange/plainText";

import { makeIssue, visibleSections } from "./helpers";

import type { AtsRule } from "../types";

/**
 * How long the document runs, which is partly from the rendered paper and not
 * from the document.
 */

/**
 * Past two pages a resume is read by fewer people at less length. Screening is
 * a first pass of seconds, and the conventional advice is one page for the
 * first ten years of a career and two after that.
 */
const MAX_RESUME_PAGES = 2;

/** A cover letter is one page. A second is a letter nobody finished. */
const MAX_LETTER_PAGES = 1;

/**
 * About the words a letter holds on one page at 11pt with inch margins and a
 * greeting and a sign-off around the body. Past it the choice is a smaller type
 * or a second page, and a letter is read at a glance either way.
 */
const MAX_LETTER_WORDS = 450;

const pageCount: AtsRule = (document, { pageCount: measured }) => {
  const letter = document.kind === "coverLetter";

  // Nothing for an unmeasured document. A length nobody checked is not a
  // finding, and the panel says separately that it could not check.
  return measured !== null &&
    measured > (letter ? MAX_LETTER_PAGES : MAX_RESUME_PAGES)
    ? [
        makeIssue("ats.page-count", "document", {
          severity: "warning",
          params: letter
            ? { count: measured, context: "letter" }
            : { count: measured },
        }),
      ]
    : [];
};

/** The letter's own length rule, in words, which needs no measurement. */
const letterLong: AtsRule = (document) => {
  const words = visibleSections(document)
    .flatMap((section) => section.blocks)
    .reduce(
      (total, block) =>
        total +
        blockText(block, document.meta.locale)
          .split(/\s+/)
          .filter((word) => word !== "").length,
      0,
    );

  return words > MAX_LETTER_WORDS
    ? [
        makeIssue("ats.letter-long", "document", {
          severity: "info",
          params: { count: words },
        }),
      ]
    : [];
};

export const lengthRules: Array<AtsRule> = [pageCount];
export const letterLengthRules: Array<AtsRule> = [pageCount, letterLong];
