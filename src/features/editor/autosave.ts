import type { ResumeDocument } from '@/features/resume/model/document'

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
export const AUTOSAVE_DELAY_MS = 600

export type SaveFn = (document: ResumeDocument) => Promise<void>

export interface Autosave {
  /** Queues a save, restarting the debounce window. */
  schedule: (document: ResumeDocument) => void
  /** Writes any pending document immediately. Safe to call when nothing is
   * pending. Resolves once the write has settled. */
  flush: () => Promise<void>
  /** Cancels pending work without writing. For teardown after an explicit
   * discard — not for normal unmount, which should flush. */
  cancel: () => void
  hasPending: () => boolean
}

export interface AutosaveOptions {
  save: SaveFn
  delay?: number
  onSaved?: (document: ResumeDocument) => void
  onError?: (error: unknown, document: ResumeDocument) => void
}

export const createAutosave = ({
  save,
  delay = AUTOSAVE_DELAY_MS,
  onSaved,
  onError,
}: AutosaveOptions): Autosave => {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: ResumeDocument | undefined
  /** Serialises writes: IndexedDB would accept overlapping puts, but the later
   * one could land first and persist a stale document. */
  let inFlight: Promise<void> = Promise.resolve()

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  const write = async (document: ResumeDocument): Promise<void> => {
    try {
      await save(document)
      onSaved?.(document)
    } catch (error) {
      onError?.(error, document)
    }
  }

  /**
   * Claims the pending document SYNCHRONOUSLY, then queues the write.
   *
   * Reading `pending` inside the queued callback instead would be a race: the
   * callback does not run until a later microtask, by which time a newer
   * `schedule()` may have replaced `pending` — so one write would persist the
   * newer document and the next would find nothing to do, silently collapsing
   * two distinct saves into one.
   */
  const run = () => {
    clearTimer()

    const document = pending

    if (document === undefined) {
      return
    }

    pending = undefined
    inFlight = inFlight.then(() => write(document))
  }

  return {
    schedule: (document) => {
      pending = document
      clearTimer()
      timer = setTimeout(run, delay)
    },

    flush: async () => {
      run()

      await inFlight
    },

    cancel: () => {
      clearTimer()
      pending = undefined
    },

    hasPending: () => pending !== undefined,
  }
}
