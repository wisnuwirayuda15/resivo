import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * Debounced autosave.
 *
 * Kept as a plain object rather than a hook so it can be unit-tested with fake
 * timers, and so the flush paths (tab hidden, window closing, route change) can
 * call it from outside React.
 *
 * The contract that matters: **no edit is ever silently lost**. A pending write
 * is flushed on page hide and on unmount, and a save that arrives while another
 * is in flight is queued rather than dropped.
 */

/**
 * Long enough that a burst of typing is one write, short enough that the user
 * never perceives a lag between stopping and being saved.
 */
export const AUTOSAVE_DELAY_MS = 600;

export type SaveFn = (document: ResumeDocument) => Promise<void>;

/**
 * What the indicator in the header reports.
 *
 * Three states, not four. 'saved' is the resting state and the one a freshly
 * loaded document is in, it came from the database, so it is saved. 'saving'
 * covers both the debounce window and the write itself: they are 600ms and a
 * few milliseconds apart, and splitting them would put a distinction on screen
 * that nobody can act on. 'error' persists until a later write succeeds,
 * because a failed save is not something to flash and forget.
 */
export type SaveStatus = "saved" | "saving" | "error";

export interface Autosave {
  /** Queues a save, restarting the debounce window. */
  schedule: (document: ResumeDocument) => void;
  /** Writes any pending document immediately. Safe to call when nothing is
   * pending. Resolves once the write has settled. */
  flush: () => Promise<void>;
  /** Cancels pending work without writing. For teardown after an explicit
   * discard, not for normal unmount, which should flush. */
  cancel: () => void;
  hasPending: () => boolean;
  /** The current state, for a caller that missed the transitions. */
  status: () => SaveStatus;
}

export interface AutosaveOptions {
  save: SaveFn;
  delay?: number;
  onSaved?: (document: ResumeDocument) => void;
  onError?: (error: unknown, document: ResumeDocument) => void;
  /** Called on every transition, and never with the state it is already in. */
  onStatusChange?: (status: SaveStatus) => void;
}

export const createAutosave = ({
  save,
  delay = AUTOSAVE_DELAY_MS,
  onSaved,
  onError,
  onStatusChange,
}: AutosaveOptions): Autosave => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: ResumeDocument | undefined;
  /** Serialises writes: IndexedDB would accept overlapping puts, but the later
   * one could land first and persist a stale document. */
  let inFlight: Promise<void> = Promise.resolve();

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  let status: SaveStatus = "saved";

  const setStatus = (next: SaveStatus) => {
    if (next !== status) {
      status = next;
      onStatusChange?.(next);
    }
  };

  const write = async (document: ResumeDocument): Promise<void> => {
    try {
      await save(document);
      onSaved?.(document);

      /**
       * Only back to rest if nothing arrived while this was in flight.
       *
       * A save that lands mid-burst is not the end of the burst: the next
       * document is already pending or its timer is already running, so
       * reporting "saved" here would show a green light with unwritten edits
       * behind it.
       */
      if (pending === undefined && timer === undefined) {
        setStatus("saved");
      }
    } catch (error) {
      setStatus("error");
      onError?.(error, document);
    }
  };

  /**
   * Claims the pending document SYNCHRONOUSLY, then queues the write.
   *
   * Reading `pending` inside the queued callback instead would be a race: the
   * callback does not run until a later microtask, by which time a newer
   * `schedule()` may have replaced `pending`, so one write would persist the
   * newer document and the next would find nothing to do, silently collapsing
   * two distinct saves into one.
   */
  const run = () => {
    clearTimer();

    const document = pending;

    if (document === undefined) {
      return;
    }

    pending = undefined;
    inFlight = inFlight.then(() => write(document));
  };

  return {
    schedule: (document) => {
      pending = document;
      clearTimer();
      timer = setTimeout(run, delay);
      setStatus("saving");
    },

    flush: async () => {
      run();

      await inFlight;
    },

    cancel: () => {
      clearTimer();
      pending = undefined;
    },

    hasPending: () => pending !== undefined,
    status: () => status,
  };
};
