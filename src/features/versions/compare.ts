import { blockText } from "@/features/interchange/plainText";
import { plainText } from "@/features/resume/model/index";
import { deepEqual } from "@/lib/deep-equal";

import { commonSubsequence, diffWords } from "./diff";

import type { DiffPart } from "./diff";
import type {
  Block,
  ContactItem,
  ResumeDocument,
  Section,
} from "@/features/resume/model/document";

/**
 * What differs between two resumes, by identity.
 *
 * A version is a copy that keeps the ids of its sections and blocks, and
 * `parseDocument` keeps them across an edit made in the Markdown, so the two
 * documents can be lined up by id and not by guessing which paragraph became
 * which. Everything here is a pure function of the two documents.
 *
 * The question it answers is "what did I change for this job", so it reports the
 * things a person did: words rewritten, a bullet added, a section hidden or
 * moved, a different template. It does not report that two blocks have different
 * ids, because ids are the means and not the content.
 */

export type BlockStatus = "added" | "removed" | "changed" | "moved";

export interface BlockChange {
  id: string;
  status: BlockStatus;
  /** Also moved within its section. A rewritten paragraph that moved is both. */
  moved: boolean;
  /** What the block says: the new text, or the old text when it was removed. */
  text: string;
  /** Word by word, for a block that changed. */
  words?: Array<DiffPart>;
  /** The words are the same and something else about them is not (a mark, a
   * link, a date). Reported so a change is never shown as no change. */
  formatOnly?: boolean;
}

export interface SectionChange {
  id: string;
  /** The title in the variant, or in the base for a removed section. */
  title: string;
  status: "added" | "removed" | "changed";
  moved: boolean;
  renamed?: { from: string; to: string };
  /** Hidden or shown in the variant, where the base had it the other way. */
  visibility?: "hidden" | "shown";
  /** The kind, icon or per-section style differs. */
  styleChanged: boolean;
  blocks: Array<BlockChange>;
}

export interface HeaderChange {
  field: "name" | "headline" | "contact";
  status: "added" | "removed" | "changed";
  words: Array<DiffPart>;
}

export type SettingChange = "template" | "design" | "customCss";

export interface Comparison {
  /** Nothing differs that this reports. */
  identical: boolean;
  /**
   * The two share no section id, so everything looks removed and re-added. That
   * is what a resume whose Markdown was replaced wholesale looks like, and
   * saying so is kinder than a wall of red.
   */
  noSharedIdentity: boolean;
  header: Array<HeaderChange>;
  settings: Array<SettingChange>;
  /** Only the sections that differ. */
  sections: Array<SectionChange>;
  unchangedSections: number;
}

const contactText = (contact: ContactItem): string =>
  [plainText(contact.label), contact.href].filter(Boolean).join(" ");

const ids = <TItem extends { id: string }>(items: ReadonlyArray<TItem>) =>
  new Set(items.map((item) => item.id));

/**
 * The ids that are in both sequences but not in the longest run that kept its
 * order, which are the ones that moved. Counting every id whose index changed
 * would call a whole list moved because one item went to the top.
 */
const movedIds = (
  before: ReadonlyArray<{ id: string }>,
  after: ReadonlyArray<{ id: string }>,
): Set<string> => {
  const inAfter = ids(after);
  const inBefore = ids(before);
  const kept = before.filter((item) => inAfter.has(item.id));
  const reordered = after.filter((item) => inBefore.has(item.id));
  const stable = new Set(
    commonSubsequence(kept, reordered, (a, b) => a.id === b.id).map(
      ([row]) => kept[row]?.id,
    ),
  );

  return new Set(
    kept.filter((item) => !stable.has(item.id)).map((item) => item.id),
  );
};

const compareBlocks = (
  before: Section,
  after: Section,
  locale: string,
): Array<BlockChange> => {
  const changes: Array<BlockChange> = [];
  const beforeById = new Map<string, Block>(
    before.blocks.map((block) => [block.id, block]),
  );
  const moved = movedIds(before.blocks, after.blocks);

  for (const block of after.blocks) {
    const original = beforeById.get(block.id);
    const text = blockText(block, locale);

    if (original === undefined) {
      changes.push({ id: block.id, status: "added", moved: false, text });
      continue;
    }

    if (!deepEqual(original, block)) {
      const words = diffWords(blockText(original, locale), text);

      changes.push({
        id: block.id,
        status: "changed",
        moved: moved.has(block.id),
        text,
        words,
        formatOnly: words.every((part) => part.type === "same"),
      });
    } else if (moved.has(block.id)) {
      changes.push({ id: block.id, status: "moved", moved: true, text });
    }
  }

  const afterIds = ids(after.blocks);

  for (const block of before.blocks) {
    if (!afterIds.has(block.id)) {
      changes.push({
        id: block.id,
        status: "removed",
        moved: false,
        text: blockText(block, locale),
      });
    }
  }

  return changes;
};

const compareHeader = (
  before: ResumeDocument,
  after: ResumeDocument,
): Array<HeaderChange> => {
  const changes: Array<HeaderChange> = [];
  const pairs = [
    ["name", before.content.header.name, after.content.header.name],
    [
      "headline",
      before.content.header.headline ?? [],
      after.content.header.headline ?? [],
    ],
  ] as const;

  for (const [field, a, b] of pairs) {
    const was = plainText(a);
    const now = plainText(b);

    if (was !== now || !deepEqual(a, b)) {
      changes.push({
        field,
        status: was === "" ? "added" : now === "" ? "removed" : "changed",
        words: diffWords(was, now),
      });
    }
  }

  const beforeContacts = new Map(
    before.content.header.contacts.map((contact) => [contact.id, contact]),
  );

  for (const contact of after.content.header.contacts) {
    const original = beforeContacts.get(contact.id);

    if (original === undefined) {
      changes.push({
        field: "contact",
        status: "added",
        words: diffWords("", contactText(contact)),
      });
    } else if (!deepEqual(original, contact)) {
      changes.push({
        field: "contact",
        status: "changed",
        words: diffWords(contactText(original), contactText(contact)),
      });
    }
  }

  const afterContacts = ids(after.content.header.contacts);

  for (const contact of before.content.header.contacts) {
    if (!afterContacts.has(contact.id)) {
      changes.push({
        field: "contact",
        status: "removed",
        words: diffWords(contactText(contact), ""),
      });
    }
  }

  return changes;
};

/**
 * Compares a resume with a version made from it.
 *
 * `before` is the base and `after` the version, so an addition is something the
 * version has that the base does not.
 */
export const compareDocuments = (
  before: ResumeDocument,
  after: ResumeDocument,
): Comparison => {
  const locale = after.meta.locale;
  const beforeSections = before.content.sections;
  const afterSections = after.content.sections;
  const beforeById = new Map(
    beforeSections.map((section) => [section.id, section]),
  );
  const moved = movedIds(beforeSections, afterSections);
  const sections: Array<SectionChange> = [];
  let unchanged = 0;
  let shared = 0;

  for (const section of afterSections) {
    const original = beforeById.get(section.id);

    if (original === undefined) {
      sections.push({
        id: section.id,
        title: plainText(section.title),
        status: "added",
        moved: false,
        styleChanged: false,
        blocks: section.blocks.map((block) => ({
          id: block.id,
          status: "added" as const,
          moved: false,
          text: blockText(block, locale),
        })),
      });
      continue;
    }

    shared += 1;

    const was = plainText(original.title);
    const now = plainText(section.title);
    const blocks = compareBlocks(original, section, locale);
    const hiddenBefore = original.hidden === true;
    const hiddenAfter = section.hidden === true;
    const styleChanged =
      original.kind !== section.kind ||
      !deepEqual(original.icon, section.icon) ||
      !deepEqual(original.style, section.style);

    const change: SectionChange = {
      id: section.id,
      title: now,
      status: "changed",
      moved: moved.has(section.id),
      styleChanged,
      blocks,
      ...(was === now ? {} : { renamed: { from: was, to: now } }),
      ...(hiddenBefore === hiddenAfter
        ? {}
        : {
            visibility: hiddenAfter ? ("hidden" as const) : ("shown" as const),
          }),
    };

    if (
      blocks.length === 0 &&
      !change.moved &&
      !styleChanged &&
      change.renamed === undefined &&
      change.visibility === undefined
    ) {
      unchanged += 1;
    } else {
      sections.push(change);
    }
  }

  const afterIds = ids(afterSections);

  for (const section of beforeSections) {
    if (!afterIds.has(section.id)) {
      sections.push({
        id: section.id,
        title: plainText(section.title),
        status: "removed",
        moved: false,
        styleChanged: false,
        blocks: section.blocks.map((block) => ({
          id: block.id,
          status: "removed" as const,
          moved: false,
          text: blockText(block, locale),
        })),
      });
    }
  }

  const header = compareHeader(before, after);
  const settings: Array<SettingChange> = [
    ...(before.templateId === after.templateId ? [] : ["template" as const]),
    ...(deepEqual(before.design, after.design) ? [] : ["design" as const]),
    ...(before.customCss === after.customCss ? [] : ["customCss" as const]),
  ];

  return {
    identical:
      header.length === 0 && settings.length === 0 && sections.length === 0,
    noSharedIdentity:
      beforeSections.length > 0 && afterSections.length > 0 && shared === 0,
    header,
    settings,
    sections,
    unchangedSections: unchanged,
  };
};
