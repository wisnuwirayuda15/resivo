import { produce } from 'immer'
import { create } from 'zustand'

import type { StoreApi, UseBoundStore } from 'zustand'
import type { ResumeDocument } from '@/features/resume/model/document'
import type { Recipe } from './mutations'
import type { SaveStatus } from './autosave'

/**
 * The working copy of the resume being edited.
 *
 * This is deliberately NOT in TanStack Query. The document changes on every
 * keystroke and every drag frame; routing that through a query cache would
 * invalidate and re-render the library on each one. Query owns the persistent
 * side (the list, the loaded record), this owns the live one, and autosave is
 * the bridge between them.
 *
 * Undo is snapshot-based rather than patch-inversion. For a single-document
 * editor the snapshots are nearly free — Immer shares every untouched subtree by
 * reference, so an undo entry costs only the nodes that actually changed — and
 * "restore this exact state" is far harder to get subtly wrong than "invert this
 * patch".
 */

/** Bounded so a long session cannot grow the history without limit. */
export const UNDO_LIMIT = 100

/**
 * How long consecutive same-key edits keep merging into one undo step.
 *
 * Without this, typing a sentence would cost forty undos to take back. Keyed
 * rather than purely time-based so switching field ends the run immediately —
 * undoing should never jump between two different places in the document.
 */
export const COALESCE_WINDOW_MS = 700

export interface ApplyOptions {
  /**
   * Merges consecutive edits that share this key into a single undo step.
   * Typically the field being edited, e.g. `text:<blockId>`. Omit for discrete
   * changes (add, delete, reorder), which should each be undoable on their own.
   */
  coalesce?: string
}

export interface EditorState {
  resumeId: string | null
  /** The live document. `null` when no resume is open. */
  document: ResumeDocument | null
  /** Last state known to be persisted, for the dirty check. */
  baseline: ResumeDocument | null
  past: Array<ResumeDocument>
  future: Array<ResumeDocument>
  coalesceKey: string | null
  coalesceAt: number
  /**
   * What autosave is doing, for the header's indicator. Kept here rather than
   * in the route so that reporting it re-renders one small component, not the
   * editor and everything under it.
   */
  saveStatus: SaveStatus

  load: (resumeId: string, document: ResumeDocument) => void
  close: () => void
  apply: (recipe: Recipe, options?: ApplyOptions) => void
  /** Replaces the document wholesale — used by Markdown import, which
   * reconstructs the tree rather than patching it. */
  replace: (document: ResumeDocument, options?: ApplyOptions) => void
  undo: () => void
  redo: () => void
  /** Marks the current document as persisted. Called by autosave on success. */
  markSaved: (document: ResumeDocument) => void
  setSaveStatus: (status: SaveStatus) => void

  isDirty: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
}

const initial = {
  resumeId: null,
  document: null,
  baseline: null,
  past: [],
  future: [],
  coalesceKey: null,
  coalesceAt: 0,
  // A document that has just been loaded came out of the database, so it is
  // saved. Anything else would report unsaved work before any was done.
  saveStatus: 'saved',
} satisfies Partial<EditorState>

/**
 * Builds a store instance.
 *
 * Exported so tests (and, later, a per-resume provider) can create isolated
 * stores instead of sharing the module-level one.
 */
export const createEditorStore = (): UseBoundStore<StoreApi<EditorState>> =>
  create<EditorState>((set, get) => ({
    ...initial,

    load: (resumeId, document) =>
      set({ ...initial, resumeId, document, baseline: document }),

    close: () => set({ ...initial }),

    apply: (recipe, options = {}) => {
      const { document } = get()

      if (document === null) {
        return
      }

      const next = produce(document, recipe)

      // A recipe that changed nothing must not create an undo step — Immer
      // returns the same reference, which makes that cheap to detect.
      if (next === document) {
        return
      }

      set(pushHistory(get(), document, next, options.coalesce))
    },

    replace: (document, options = {}) => {
      const current = get().document

      if (current === null || current === document) {
        return
      }

      set(pushHistory(get(), current, document, options.coalesce))
    },

    undo: () => {
      const { past, future, document } = get()

      if (past.length === 0 || document === null) {
        return
      }

      const previous = past[past.length - 1]

      if (previous === undefined) {
        return
      }

      set({
        document: previous,
        past: past.slice(0, -1),
        future: [document, ...future],
        // Any further typing starts a fresh run rather than merging into the
        // step that was just undone.
        coalesceKey: null,
        coalesceAt: 0,
      })
    },

    redo: () => {
      const { past, future, document } = get()

      if (future.length === 0 || document === null) {
        return
      }

      const [next, ...rest] = future

      if (next === undefined) {
        return
      }

      set({
        document: next,
        past: [...past, document],
        future: rest,
        coalesceKey: null,
        coalesceAt: 0,
      })
    },

    markSaved: (document) => set({ baseline: document }),

    setSaveStatus: (saveStatus) => set({ saveStatus }),

    isDirty: () => {
      const { document, baseline } = get()

      // Reference comparison is sound because every edit produces a new
      // document object and nothing mutates one in place.
      return document !== null && document !== baseline
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  }))

/**
 * Decides whether an edit opens a new undo step or extends the current one.
 *
 * Extending replaces the top of `past` rather than pushing, so the run collapses
 * to a single step ending at whatever the user last typed.
 */
const pushHistory = (
  state: EditorState,
  previous: ResumeDocument,
  next: ResumeDocument,
  coalesce: string | undefined,
): Partial<EditorState> => {
  const now = Date.now()
  const extend =
    coalesce !== undefined &&
    coalesce === state.coalesceKey &&
    now - state.coalesceAt < COALESCE_WINDOW_MS &&
    state.past.length > 0

  const past = extend
    ? state.past
    : [...state.past, previous].slice(-UNDO_LIMIT)

  return {
    document: next,
    past,
    // Any new edit invalidates the redo branch — standard editor behaviour.
    future: [],
    coalesceKey: coalesce ?? null,
    coalesceAt: coalesce === undefined ? 0 : now,
  }
}

/** The app-wide editor store. One resume is open at a time. */
export const useEditorStore = createEditorStore()
