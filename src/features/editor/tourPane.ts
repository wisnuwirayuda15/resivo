import { create } from "zustand";

/**
 * Which editor pane the tour is asking for.
 *
 * Below the three-pane breakpoint the editor is one pane behind a tab strip, so
 * a tour step that talks about the style panel has nothing to point at until
 * that tab is the active one, and four of the editor tour's six steps are in
 * that position. This is the channel that lets the tour ask.
 *
 * A store rather than props because the two ends are far apart: the tour
 * provider wraps the whole shell and the tab strip is inside a route, several
 * components down. Threading a callback through all of them would put the
 * tour in the signature of everything in between.
 *
 * `null` means "not asking", which is different from asking for the paper: the
 * layout falls back to whichever tab the user chose, so the tour borrows the
 * pane for the length of a step and gives it back rather than resetting it.
 */

export type EditorPane = "code" | "paper" | "style";

interface TourPaneState {
  requested: EditorPane | null;
  request: (pane: EditorPane | null) => void;
}

export const useTourPane = create<TourPaneState>((set) => ({
  requested: null,
  request: (pane) => set({ requested: pane }),
}));
