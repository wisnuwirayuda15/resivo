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
            params: { number: index + 1 },
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
            params: { section: sectionLabel(section) },
            fix: {
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
        }),
      ];
};

/**
 * The languages whose headings the checker knows (see `SECTION_SYNONYMS`).
 * For a resume in any other language every section would be called unusual,
 * which is a claim about the checker's vocabulary and not about the resume.
 */
const KNOWN_HEADING_LANGUAGES = ["en", "id"];

/** Only for a document written in a language whose headings are known. */
const sectionTitleUnusual: AtsRule = (document) =>
  KNOWN_HEADING_LANGUAGES.includes(
    document.meta.locale.toLowerCase().split("-")[0] ?? "",
  )
    ? visibleSections(document).flatMap((section) =>
        section.kind === "custom" &&
        effectiveKind(section) === "custom" &&
        plainText(section.title).trim() !== ""
          ? [
              makeIssue("ats.section-title-unusual", section.id, {
                severity: "info",
                params: { section: sectionLabel(section) },
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
            params: { section: sectionLabel(section) },
            fix: {
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
              params: { section: sectionLabel(section) },
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
              params: { section: sectionLabel(section) },
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
              params: { section: sectionLabel(section) },
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
