/**
 * What a drag or a "move up" on the paper means to the document.
 *
 * Kept apart from the components because this is the part that can be wrong in a
 * way nobody notices: dropping a block one place further than intended, or
 * silently moving it into the wrong section. It is pure (flow items in, a recipe
 * out), so every case has a test rather than a demonstration.
 */

import {
  moveBlock,
  moveBlockToSection,
  moveSection,
} from "@/features/editor/mutations";

import type { FlowItem } from "./flow";
import type { Recipe } from "@/features/editor/mutations";
import type { ResumeDocument } from "@/features/resume/model/document";

/** The item a drag or keyboard move acts on. */
export interface MoveSubject {
  item: FlowItem;
  /** Index of the item within `items`. */
  index: number;
}

/**
 * Whether an item can be reordered at all.
 *
 * The header cannot: there is one, and it is first. Everything else (a section
 * heading, or a block) has a place in a list.
 */
export const isMovable = (item: FlowItem): boolean => item.type !== "header";

/**
 * The recipe that moves `subject` to sit where `target` currently is.
 *
 * Blocks and section headings are different moves, so a drop that mixes them is
 * refused rather than approximated:
 *
 *   block onto block      reorder within a section, or move between sections
 *   block onto heading    move to the top of that section
 *   heading onto heading  reorder the sections
 *
 * Anything else returns `null`, and the caller leaves the document alone. A
 * near-miss that "does something" is worse here than a drop that does nothing:
 * the user sees the result on the page either way, but only one of them is
 * undoable in their head.
 */
export const moveRecipe = (
  document: ResumeDocument,
  subject: FlowItem,
  target: FlowItem,
): Recipe | null => {
  if (subject.id === target.id || !isMovable(subject)) {
    return null;
  }

  if (subject.type === "sectionHeading") {
    if (target.type !== "sectionHeading") {
      return null;
    }

    const from = document.content.sections.findIndex(
      (section) => section.id === subject.sectionId,
    );
    const to = document.content.sections.findIndex(
      (section) => section.id === target.sectionId,
    );

    return from === -1 || to === -1 ? null : moveSection(from, to);
  }

  if (subject.type !== "block") {
    return null;
  }

  const fromSection = document.content.sections.find(
    (section) => section.id === subject.sectionId,
  );

  if (fromSection === undefined) {
    return null;
  }

  const from = fromSection.blocks.findIndex(
    (block) => block.id === subject.blockId,
  );

  if (from === -1) {
    return null;
  }

  // Dropped on a heading: the block goes to the top of that section, which is
  // the only unambiguous reading of "above everything in it".
  if (target.type === "sectionHeading") {
    return target.sectionId === subject.sectionId
      ? moveBlock(fromSection.id, from, 0)
      : moveBlockToSection(
          fromSection.id,
          subject.blockId ?? "",
          target.sectionId ?? "",
          0,
        );
  }

  if (target.type !== "block") {
    return null;
  }

  const toSection = document.content.sections.find(
    (section) => section.id === target.sectionId,
  );

  if (toSection === undefined) {
    return null;
  }

  const to = toSection.blocks.findIndex((block) => block.id === target.blockId);

  if (to === -1) {
    return null;
  }

  return toSection.id === fromSection.id
    ? moveBlock(fromSection.id, from, to)
    : moveBlockToSection(
        fromSection.id,
        subject.blockId ?? "",
        toSection.id,
        to,
      );
};

/**
 * The recipe for a one-step keyboard move.
 *
 * Expressed as a drop onto the neighbouring item of the same kind rather than as
 * arithmetic on an index. That is what makes the keyboard path and the drag path
 * the same operation: a block at the end of one section steps into the next
 * section, exactly as dragging it there would, instead of stopping at a boundary
 * the user cannot see.
 */
export const stepRecipe = (
  document: ResumeDocument,
  items: ReadonlyArray<FlowItem>,
  subject: MoveSubject,
  direction: -1 | 1,
): Recipe | null => {
  const { item, index } = subject;

  if (!isMovable(item)) {
    return null;
  }

  const wanted = item.type === "sectionHeading" ? "sectionHeading" : "block";

  for (
    let at = index + direction;
    at >= 0 && at < items.length;
    at += direction
  ) {
    const candidate = items[at];

    if (candidate === undefined) {
      return null;
    }

    if (candidate.type === wanted) {
      return moveRecipe(document, item, candidate);
    }

    /**
     * A block moving up past its own section's heading has reached the top of
     * the section. The heading is a valid target (it means "the top"), but only
     * for a block, and only once.
     */
    if (wanted === "block" && candidate.type === "sectionHeading") {
      return direction === -1 && candidate.sectionId === item.sectionId
        ? null
        : moveRecipe(document, item, candidate);
    }
  }

  return null;
};

export type DropEdge = "before" | "after";

/** A flow item, and the edge of it where a drop would land. */
export interface DropMark {
  id: string;
  edge: DropEdge;
}

/**
 * Where on the page a drop would land, which is not always where the pointer is.
 *
 * `moveRecipe` says what a drop means, and it does not mean "above the item
 * under the pointer": a block dragged down inside its section ends up below the
 * one it was dropped on, and dragged up, above it. A section dragged down lands
 * after the whole of the section it was dropped on, not after its heading. A
 * rule drawn at the top of whatever is under the pointer was right half the time
 * and misleading the other half, which is the half that put things one place off
 * from where the rule said.
 *
 * It is derived from \`moveRecipe\` returning a recipe, so a drop that would do
 * nothing draws nothing, instead of promising a place it will not go.
 */
export const dropMark = (
  document: ResumeDocument,
  items: ReadonlyArray<FlowItem>,
  subject: FlowItem,
  target: FlowItem,
): DropMark | null => {
  if (moveRecipe(document, subject, target) === null) {
    return null;
  }

  const sections = document.content.sections;

  if (subject.type === "sectionHeading") {
    const from = sections.findIndex(
      (section) => section.id === subject.sectionId,
    );
    const to = sections.findIndex((section) => section.id === target.sectionId);

    if (from < to) {
      // The last item that belongs to it, found from the end: the flow is flat,
      // so "the end of a section" is only the last item that names it.
      let last = target;

      for (const item of items) {
        if (item.sectionId === target.sectionId) {
          last = item;
        }
      }

      return { id: last.id, edge: "after" };
    }

    return { id: target.id, edge: "before" };
  }

  // Dropped on a heading, a block goes to the top of that section: just below it.
  if (target.type === "sectionHeading") {
    return { id: target.id, edge: "after" };
  }

  if (subject.sectionId === target.sectionId) {
    const blocks =
      sections.find((section) => section.id === subject.sectionId)?.blocks ??
      [];
    const from = blocks.findIndex((block) => block.id === subject.blockId);
    const to = blocks.findIndex((block) => block.id === target.blockId);

    return { id: target.id, edge: from < to ? "after" : "before" };
  }

  // Into another section a block takes the target's index, so it lands above.
  return { id: target.id, edge: "before" };
};
