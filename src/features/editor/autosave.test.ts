import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createEmptyDocument } from '@/features/resume/model/index'

import { AUTOSAVE_DELAY_MS, createAutosave } from './autosave'

import type { ResumeDocument } from '@/features/resume/model/document'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** A save that resolves on demand, for asserting on in-flight ordering. */
const deferred = () => {
  let resolve: () => void = () => {}
  const promise = new Promise<void>((r) => {
    resolve = r
  })

  return { promise, resolve }
}

describe('createAutosave', () => {
  // The write is queued on a promise chain rather than run inside the timer
  // callback, so tests advance timers with the async variant to let those
  // microtasks settle.
  it('does not write until the debounce window closes', async () => {
    const save = vi.fn(async () => {})
    const autosave = createAutosave({ save })

    autosave.schedule(createEmptyDocument())

    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1)
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('collapses a burst of edits into a single write of the latest document', async () => {
    // Typed parameter so the recorded calls can be asserted on.
    const save = vi.fn(async (_document: ResumeDocument) => {})
    const autosave = createAutosave({ save })

    const first = createEmptyDocument('classic')
    const second = createEmptyDocument('modern')
    const third = createEmptyDocument('technical')

    autosave.schedule(first)
    await vi.advanceTimersByTimeAsync(100)
    autosave.schedule(second)
    await vi.advanceTimersByTimeAsync(100)
    autosave.schedule(third)
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS)

    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0]?.[0]).toBe(third)
  })

  it('writes a pending document immediately on flush', async () => {
    const save = vi.fn(async () => {})
    const autosave = createAutosave({ save })
    const document = createEmptyDocument()

    autosave.schedule(document)
    expect(autosave.hasPending()).toBe(true)

    await autosave.flush()

    expect(save).toHaveBeenCalledWith(document)
    expect(autosave.hasPending()).toBe(false)
  })

  it('is a no-op to flush with nothing pending', async () => {
    const save = vi.fn(async () => {})
    const autosave = createAutosave({ save })

    await autosave.flush()

    expect(save).not.toHaveBeenCalled()
  })

  it('drops a pending write on cancel', () => {
    const save = vi.fn(async () => {})
    const autosave = createAutosave({ save })

    autosave.schedule(createEmptyDocument())
    autosave.cancel()
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2)

    expect(save).not.toHaveBeenCalled()
    expect(autosave.hasPending()).toBe(false)
  })

  it('reports each saved document', async () => {
    const onSaved = vi.fn()
    const autosave = createAutosave({ save: async () => {}, onSaved })
    const document = createEmptyDocument()

    autosave.schedule(document)
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS)

    expect(onSaved).toHaveBeenCalledWith(document)
  })

  it('reports a failure without losing the error', async () => {
    const failure = new Error('disk is full')
    const onError = vi.fn()
    const autosave = createAutosave({
      save: async () => {
        throw failure
      },
      onError,
    })
    const document = createEmptyDocument()

    autosave.schedule(document)
    await autosave.flush()

    expect(onError).toHaveBeenCalledWith(failure, document)
  })

  it('keeps working after a failed write', async () => {
    let attempt = 0
    const save = vi.fn(async () => {
      attempt += 1
      if (attempt === 1) {
        throw new Error('transient')
      }
    })
    const autosave = createAutosave({ save, onError: () => {} })

    autosave.schedule(createEmptyDocument())
    await autosave.flush()

    autosave.schedule(createEmptyDocument())
    await autosave.flush()

    expect(save).toHaveBeenCalledTimes(2)
  })

  it('serialises writes so a slow save cannot be overtaken by a newer one', async () => {
    const order: Array<string> = []
    const first = deferred()

    const save = vi.fn(async (document: ResumeDocument) => {
      order.push(`start:${document.templateId}`)
      if (document.templateId === 'classic') {
        await first.promise
      }
      order.push(`end:${document.templateId}`)
    })

    const autosave = createAutosave({ save })

    autosave.schedule(createEmptyDocument('classic'))
    const firstFlush = autosave.flush()

    autosave.schedule(createEmptyDocument('modern'))
    const secondFlush = autosave.flush()

    // Let the second write try to start while the first is still blocked.
    await Promise.resolve()
    first.resolve()
    await Promise.all([firstFlush, secondFlush])

    expect(order).toEqual([
      'start:classic',
      'end:classic',
      'start:modern',
      'end:modern',
    ])
  })

  it('honours a custom delay', async () => {
    const save = vi.fn(async () => {})
    const autosave = createAutosave({ save, delay: 50 })

    autosave.schedule(createEmptyDocument())
    await vi.advanceTimersByTimeAsync(50)

    expect(save).toHaveBeenCalledTimes(1)
  })
})
