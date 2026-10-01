import { plainText } from "@/features/resume/model/factory";

import {
  effectiveKind,
  makeIssue,
  sectionLabel,
  visibleSections,
} from "./helpers";

import type { InlineText, ListItem } from "@/features/resume/model/document";
import type { AtsRule } from "../types";

/**
 * How the text itself is shaped: lines that run on, and entries with nothing
 * under them.
 */

/**
 * Past about three lines of body text a bullet stops being a bullet, and a
 * recruiter's eye skips it. At 10pt on a Letter page three lines is roughly
 * three hundred characters.
 */
const MAX_BULLET_CHARS = 300;

/** A summary is the one paragraph meant to be read whole, and a long one is not. */
const MAX_SUMMARY_CHARS = 600;

const listTexts = (items: ReadonlyArray<ListItem>): Array<InlineText> =>
  items.flatMap((item) => [
    item.text,
    ...(item.list === undefined ? [] : listTexts(item.list.items)),
  ]);

const bulletLong: AtsRule = (document) =>
  visibleSections(document).flatMap((section) =>
    section.blocks.flatMap((block) => {
      const bullets =
        block.kind === "entry"
          ? block.bullets
          : block.kind === "bulletList"
            ? listTexts(block.items)
            : [];

      return bullets.flatMap((bullet, index) =>
        plainText(bullet).length > MAX_BULLET_CHARS
          ? [
              makeIssue("ats.bullet-long", `${block.id}:${index}`, {
                severity: "info",
                message: "A bullet runs past about three lines.",
                why: "Long bullets are skimmed past, so the point they make is the one a recruiter is least likely to see.",
                where: sectionLabel(section),
              }),
            ]
          : [],
      );
    }),
  );

const summaryLong: AtsRule = (document) =>
  visibleSections(document).flatMap((section) =>
    effectiveKind(section) === "summary"
      ? section.blocks.flatMap((block) =>
          block.kind === "paragraph" &&
          plainText(block.text).length > MAX_SUMMARY_CHARS
            ? [
                makeIssue("ats.summary-long", block.id, {
                  severity: "info",
                  message: "The summary is longer than a short paragraph.",
                  why: "A summary is read first and fast, so one that runs long defeats the reason it is at the top.",
                  where: sectionLabel(section),
                }),
              ]
            : [],
        )
      : [],
  );

const entryEmpty: AtsRule = (document) =>
  visibleSections(document).flatMap((section) =>
    effectiveKind(section) === "experience"
      ? section.blocks.flatMap((block) =>
          block.kind === "entry" &&
          block.bullets.length === 0 &&
          plainText(block.summary ?? []).trim() === ""
            ? [
                makeIssue("ats.entry-empty", block.id, {
                  severity: "info",
                  message: "A role has no description.",
                  why: "A title and dates say where someone was, and the bullets are where a system finds the skills to match.",
                  where: `${sectionLabel(section)}, ${plainText(block.title).trim() || "Untitled entry"}`,
                }),
              ]
            : [],
        )
      : [],
  );

export const contentRules: Array<AtsRule> = [
  bulletLong,
  summaryLong,
  entryEmpty,
];
