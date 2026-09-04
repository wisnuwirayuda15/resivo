import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * Flattening a resume into the sequence the paginator distributes.
 *
 * A page break can fall between any two of these, so the granularity here is
 * exactly the granularity of pagination. Sections are NOT items: a section's
 * heading and each of its blocks are separate, because a long section has to be
 * allowed to continue onto the next page.
 *
 * Pure data (no React, no measurement), so the ordering rules are testable on
 * their own, without a DOM.
 */

export type FlowItemType = "header" | "sectionHeading" | "block";

export interface FlowItem {
  /** Stable across renders, and unique within one document. */
  id: string;
  type: FlowItemType;
  /** Set for `sectionHeading` and `block`. */
  sectionId?: string;
  /** Set for `block`. */
  blockId?: string;
  /**
   * Marks an item that must not be the last thing on a page. Set on a section
   * heading that has content following it, a heading stranded at the foot of a
   * page is the classic orphan, and the one break a reader always notices.
   */
  keepWithNext?: boolean;
  /**
   * Marks an item that must start a page. Set by a `pageBreak` block before it,
   * or by a section whose style says `breakBefore: 'page'`.
   */
  breakBefore?: boolean;
}

/** The class the renderer puts on each item, and that `frame.css` keys the
 * vertical rhythm off. Declared once here so the two cannot drift. */
export const flowItemClass = (type: FlowItemType): string => {
  switch (type) {
    case "header":
      return "rp-item rp-item--header";
    case "sectionHeading":
      return "rp-item rp-item--section";
    case "block":
      return "rp-item rp-item--block";
  }
};

const hasHeaderContent = (document: ResumeDocument): boolean => {
  const { header } = document.content;

  return (
    header.name.length > 0 ||
    (header.headline ?? []).length > 0 ||
    header.contacts.length > 0 ||
    header.avatarImageId !== undefined
  );
};

/**
 * Builds the flow for a document.
 *
 * Hidden sections are skipped, that is what hiding means. An *empty* section is
 * kept, heading and all: the preview is the editing surface, and a heading with
 * nothing under it is how the user sees where content is meant to go. It costs
 * one line and disappears the moment they type.
 *
 * An empty header is skipped, though, because it would contribute a silent box
 * of vertical space at the top of the page rather than a visible affordance.
 */
export const documentFlow = (
  document: ResumeDocument,
  options: { keepHeadingWithContent?: boolean } = {},
): Array<FlowItem> => {
  const items: Array<FlowItem> = [];
  const keepHeadings = options.keepHeadingWithContent ?? true;

  if (hasHeaderContent(document)) {
    items.push({ id: "header", type: "header" });
  }

  /**
   * Set on the next item pushed, then cleared.
   *
   * A `pageBreak` block is in the flow like anything else (it has to be, or it
   * could not be seen, moved or deleted on the paper), and what it means is
   * "the thing after me starts a page". It carries no height, so it stays at the
   * foot of the outgoing page and costs nothing there.
   */
  let pendingBreak = false;

  const push = (item: FlowItem): void => {
    // Not before the first item: there is no page to break away from, and
    // honouring it would produce a blank first sheet.
    items.push(
      pendingBreak && items.length > 0 ? { ...item, breakBefore: true } : item,
    );
    pendingBreak = false;
  };

  for (const section of document.content.sections) {
    if (section.hidden === true) {
      continue;
    }

    if (section.style?.breakBefore === "page") {
      pendingBreak = true;
    }

    /**
     * A break before a section's first block becomes a break before its
     * heading.
     *
     * Otherwise the forced break would land between the two and strand the
     * heading at the foot of the previous page, which is the orphan
     * `keepWithNext` exists to prevent, produced by the very control meant to
     * give the user cleaner pages.
     */
    if (keepHeadings && section.blocks[0]?.kind === "pageBreak") {
      pendingBreak = true;
    }

    push({
      id: `section:${section.id}`,
      type: "sectionHeading",
      sectionId: section.id,
      // Nothing follows an empty section's heading, so there is nothing to keep
      // it with; forcing a break would only push a lone heading to the next page.
      ...(section.blocks.length > 0 && keepHeadings
        ? { keepWithNext: true }
        : {}),
    });

    for (const block of section.blocks) {
      push({
        id: `block:${block.id}`,
        type: "block",
        sectionId: section.id,
        blockId: block.id,
      });

      if (block.kind === "pageBreak") {
        pendingBreak = true;
      }
    }
  }

  return items;
};
