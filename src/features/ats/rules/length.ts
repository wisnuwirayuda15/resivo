import { makeIssue } from "./helpers";

import type { AtsRule } from "../types";

/**
 * How long the resume runs, which is the one thing here that comes from the
 * rendered paper and not from the document.
 */

/**
 * Past two pages a resume is read by fewer people at less length. Screening is
 * a first pass of seconds, and the conventional advice is one page for the
 * first ten years of a career and two after that.
 */
const MAX_PAGES = 2;

const pageCount: AtsRule = (_document, { pageCount: measured }) =>
  // Nothing for an unmeasured document. A length nobody checked is not a
  // finding, and the panel says separately that it could not check.
  measured !== null && measured > MAX_PAGES
    ? [
        makeIssue("ats.page-count", "document", {
          severity: "warning",
          message: `The resume runs to ${measured} pages.`,
          why: "Screening is a quick first pass, so what falls on a third page is rarely reached, and long resumes are often set aside unread.",
          where: "Whole document",
        }),
      ]
    : [];

export const lengthRules: Array<AtsRule> = [pageCount];
