import { plainText } from "@/features/resume/model/factory";
import {
  setSectionColumns,
  setSectionHidden,
} from "@/features/editor/mutations";

import {
  effectiveKind,
  makeIssue,
  sectionLabel,
  visibleSections,
} from "./helpers";

import type { AtsRule } from "../types";

/**
 * How the document is organised: sections, their headings, and the constructs a
 * parser reads badly.
 */

/**
 * The sections that tell a reader what someone has done. A resume with none of
 * them visible and filled in is an ATS record with nothing to rank. Projects
 * counts because it is the experience section of a student or a career changer.
 */
const CORE_KINDS = ["experience", "education", "projects"] as const;

const sectionTitleEmpty: AtsRule = (document) =>
  visibleSections(document).flatMap((section, index) =>
    plainText(section.title).trim() === ""
      ? [
          makeIssue("ats.section-title-empty", section.id, {
            severity: "error",
            message: "A section has no heading.",
            why: "Parsers split a resume into sections by their headings, and content under no heading is attributed to nothing.",
            where: `Section ${index + 1}`,
          }),
        ]
      : [],
  );

const sectionEmpty: AtsRule = (document) =>
  visibleSections(document).flatMap((section) =>
    section.blocks.length === 0
      ? [
          makeIssue("ats.section-empty", section.id, {
            severity: "warning",
            message: `The ${sectionLabel(section)} section is empty.`,
            why: "A heading with nothing under it prints as a gap, and a recruiter reads it as something left unfinished.",
            where: sectionLabel(section),
            fix: {
              label: "Hide section",
              recipe: setSectionHidden(section.id, true),
            },
          }),
        ]
      : [],
  );

const coreSectionsMissing: AtsRule = (document) => {
  const hasCore = visibleSections(document).some(
    (section) =>
      section.blocks.length > 0 &&
      (CORE_KINDS as ReadonlyArray<string>).includes(effectiveKind(section)),
  );

  return hasCore
    ? []
    : [
        makeIssue("ats.core-sections-missing", "document", {
          severity: "warning",
          message: "No Experience, Education or Projects section has content.",
          why: "These are the sections a system scores a candidate on, so a resume without them has little to rank.",
          where: "Document",
        }),
      ];
};

/**
 * Only for documents written in English. The known headings are English, so a
 * resume in another language would have every section called unusual, which is
 * a claim about the checker's vocabulary and not about the resume.
 */
const sectionTitleUnusual: AtsRule = (document) =>
  document.meta.locale.toLowerCase().startsWith("en")
    ? visibleSections(document).flatMap((section) =>
        section.kind === "custom" &&
        effectiveKind(section) === "custom" &&
        plainText(section.title).trim() !== ""
          ? [
              makeIssue("ats.section-title-unusual", section.id, {
                severity: "info",
                message: `"${sectionLabel(section)}" is not a heading a parser is likely to know.`,
                why: "Systems recognise a short list of headings, such as Experience and Education, and file anything else less reliably.",
                where: sectionLabel(section),
              }),
            ]
          : [],
      )
    : [];

const columnsTwo: AtsRule = (document) =>
  visibleSections(document).flatMap((section) =>
    section.style?.columns === 2
      ? [
          makeIssue("ats.columns-two", section.id, {
            severity: "warning",
            message: `${sectionLabel(section)} is set in two columns.`,
            why: "Many parsers read straight down the page, so two columns can come out interleaved, one line of each at a time.",
            where: sectionLabel(section),
            fix: {
              label: "Use one column",
              recipe: setSectionColumns(section.id, 1),
            },
          }),
        ]
      : [],
  );

const tableUsed: AtsRule = (document) =>
  visibleSections(document).flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.kind === "table"
        ? [
            makeIssue("ats.table-used", block.id, {
              severity: "warning",
              message: "A table is used.",
              why: "Parsers often flatten a table cell by cell and lose which value belonged to which heading.",
              where: sectionLabel(section),
            }),
          ]
        : [],
    ),
  );

const rawBlock: AtsRule = (document) =>
  visibleSections(document).flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.kind === "raw"
        ? [
            makeIssue("ats.raw-block", block.id, {
              severity: "info",
              message:
                "Markdown this app does not typeset is printed as plain text.",
              why: "Raw HTML, footnotes and link definitions are kept verbatim, so they show up in the file as the markup itself.",
              where: sectionLabel(section),
            }),
          ]
        : [],
    ),
  );

const imageAltMissing: AtsRule = (document) =>
  visibleSections(document).flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.kind === "image" && block.alt.trim() === ""
        ? [
            makeIssue("ats.image-alt-missing", block.id, {
              severity: "warning",
              message: "An image has no alt text.",
              why: "A parser cannot read an image, and the alt text is the only part of it that reaches the text layer.",
              where: sectionLabel(section),
            }),
          ]
        : [],
    ),
  );

const avatarPresent: AtsRule = (document) =>
  document.content.header.avatarImageId === undefined
    ? []
    : [
        makeIssue("ats.avatar-present", "header", {
          severity: "info",
          message: "The header carries a photo.",
          why: "A photo is ignored by a parser, and some employers would rather not receive one at all.",
          where: "Header",
        }),
      ];

export const structureRules: Array<AtsRule> = [
  sectionTitleEmpty,
  sectionEmpty,
  coreSectionsMissing,
  sectionTitleUnusual,
  columnsTwo,
  tableUsed,
  rawBlock,
  imageAltMissing,
  avatarPresent,
];
