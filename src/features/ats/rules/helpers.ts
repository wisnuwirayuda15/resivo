import { plainText } from "@/features/resume/model/factory";
import { sectionKindFromTitle } from "@/features/markdown/spec";

import type {
  EntryBlock,
  ResumeDocument,
  Section,
  SectionKind,
} from "@/features/resume/model/document";
import type {
  AtsFix,
  AtsIssue,
  AtsParams,
  AtsRuleId,
  Severity,
} from "../types";

/**
 * Pieces every rule file needs.
 */

/**
 * Builds an issue, deriving its id from the rule and the thing it points at.
 *
 * No sentences: an issue is what was found and where, as parameters, and its
 * words are looked up by rule name when it is shown.
 */
export const makeIssue = (
  rule: AtsRuleId,
  target: string,
  fields: {
    severity: Severity;
    params?: AtsParams;
    fix?: AtsFix;
  },
): AtsIssue => ({
  id: `${rule}:${target}`,
  rule,
  severity: fields.severity,
  params: fields.params ?? {},
  ...(fields.fix === undefined ? {} : { fix: fields.fix }),
});

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

/**
 * A section's title, or "" for one with none. Never a placeholder word: the
 * checker has no language, and the panel says "Untitled section" in its own.
 */
export const sectionLabel = (section: Section): string =>
  plainText(section.title).trim();

/** An entry's title, or "" for one with none, for the same reason. */
export const entryLabel = (entry: EntryBlock): string =>
  plainText(entry.title).trim();

/** Every entry in the visible sections, with the section it sits in. */
export const visibleEntries = (
  document: ResumeDocument,
): Array<{ section: Section; entry: EntryBlock }> =>
  visibleSections(document).flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.kind === "entry" ? [{ section, entry: block }] : [],
    ),
  );
