import { create } from "zustand";

/**
 * The issues a person has said they know about, per resume.
 *
 * Kept for the session and not in the document, deliberately. Saving it would
 * mean a new field, a bump of `DOCUMENT_VERSION` and a migration that touches
 * every stored resume, for a preference that only matters while someone is
 * working through the list. It also has to outlive the panel: the tab behind it
 * unmounts whenever another tab is open, and a dismissal that came back on
 * every switch would teach nobody to use it.
 *
 * Keyed by resume because issue ids name a thing inside one document, and
 * `ats.font-size-small:body` means the same words in every resume.
 */

interface DismissalState {
  byResume: Record<string, ReadonlyArray<string>>;
  dismiss: (resumeId: string, issueId: string) => void;
  restoreAll: (resumeId: string) => void;
}

/** One shared array, so a resume with no dismissals selects a stable value and
 * does not re-render its panel on every unrelated store update. */
export const NO_DISMISSALS: ReadonlyArray<string> = [];

export const useAtsDismissals = create<DismissalState>((set) => ({
  byResume: {},
  dismiss: (resumeId, issueId) =>
    set((state) => {
      const current = state.byResume[resumeId] ?? NO_DISMISSALS;

      return current.includes(issueId)
        ? state
        : {
            byResume: { ...state.byResume, [resumeId]: [...current, issueId] },
          };
    }),
  restoreAll: (resumeId) =>
    set((state) => {
      const { [resumeId]: _removed, ...rest } = state.byResume;

      return { byResume: rest };
    }),
}));
