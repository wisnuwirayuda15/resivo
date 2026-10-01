import { create } from "zustand";

import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * How many pages the paper measured, for readers that are not the paper.
 *
 * Page count is not a property of the document. It comes from laying the
 * document out at a real width with real fonts, which only the preview iframe
 * does, so the one number the ATS tab needs about length lives in a component
 * the tab is not under. This is the channel, a store for the same reason
 * `editor/tourPane.ts` is one: the two ends are far apart in the tree.
 *
 * The count is stored with the document it was measured for, and a reader asks
 * `pageCountFor` rather than reading `measured` directly. Below the three-pane
 * breakpoint the paper is unmounted whenever another pane is open, so an edit
 * made in the Style pane changes the page count with nobody measuring it. A bare
 * number would go on saying the old count, with every appearance of being
 * current. Tied to a document it cannot: any edit is a new document, and the
 * old count stops applying to it.
 */

interface Measured {
  document: ResumeDocument;
  pageCount: number;
}

interface MeasuredPagesState {
  measured: Measured | null;
  /** Whether a paper is on screen, and so about to measure whatever changed. */
  mounted: boolean;
  report: (document: ResumeDocument, pageCount: number) => void;
  /** Starts from nothing: a count left by another resume must not be read as
   * this one's for the frame before this paper reports. */
  mount: () => void;
  /** The count is kept, because it is still true of the document it names. */
  unmount: () => void;
}

export const useMeasuredPages = create<MeasuredPagesState>((set) => ({
  measured: null,
  mounted: false,
  report: (document, pageCount) => set({ measured: { document, pageCount } }),
  mount: () => set({ measured: null, mounted: true }),
  unmount: () => set({ mounted: false }),
}));

/**
 * The page count that applies to `document`, or `null` when none is known.
 *
 * While a paper is mounted the last count is trusted even for a document it has
 * not measured yet. Pagination runs synchronously after an edit and reports a
 * moment later, so refusing it would blank the count for a frame on every
 * keystroke and make a finding that depends on it flicker. With no paper on
 * screen nothing is about to correct it, so only an exact match counts.
 */
export const pageCountFor = (
  state: Pick<MeasuredPagesState, "measured" | "mounted">,
  document: ResumeDocument,
): number | null => {
  const { measured, mounted } = state;

  if (measured === null) {
    return null;
  }

  return measured.document === document || mounted ? measured.pageCount : null;
};
