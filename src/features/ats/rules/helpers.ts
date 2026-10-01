import { plainText } from "@/features/resume/model/factory";
import { sectionKindFromTitle } from "@/features/markdown/spec";

import type {
  EntryBlock,
  ResumeDocument,
  Section,
  SectionKind,
} from "@/features/resume/model/document";
import type { AtsFix, AtsIssue, Severity } from "../types";

/**
 * Pieces every rule file needs.
 */

/** Builds an issue, deriving its id from the rule and the thing it points at. */
export const makeIssue = (
  rule: string,
  target: string,
  fields: {
    severity: Severity;
    message: string;
    why: string;
    where: string;
    fix?: AtsFix;
  },
): AtsIssue => ({ id: `${rule}:${target}`, rule, ...fields });

/**
 * The sections that reach the printed page. A hidden section is skipped by the
 * flow and by every export, so it cannot hurt a parse and is not worth a
 * warning.
 */
export const visibleSections = (document: ResumeDocument): Array<Section> =>
  document.content.sections.filter((section) => section.hidden !== true);

/**
 * What a section is, by what it says as well as by the kind it holds.
 *
 * `kind` is never written back to Markdown, so a section that came through an
 * import can be `custom` while its heading is plainly "Experience". The
 * heading is what an ATS reads, so it is consulted when the kind is `custom`.
 */
export const effectiveKind = (section: Section): SectionKind =>
  section.kind === "custom"
    ? sectionKindFromTitle(plainText(section.title))
    : section.kind;

export const sectionLabel = (section: Section): string => {
  const title = plainText(section.title).trim();

  return title === "" ? "Untitled section" : title;
};

export const entryLabel = (entry: EntryBlock): string => {
  const title = plainText(entry.title).trim();

  return title === "" ? "Untitled entry" : title;
};

/** Every entry in the visible sections, with the section it sits in. */
export const visibleEntries = (
  document: ResumeDocument,
): Array<{ section: Section; entry: EntryBlock }> =>
  visibleSections(document).flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.kind === "entry" ? [{ section, entry: block }] : [],
    ),
  );
