import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createEmptyDocument,
  plainText,
  text,
} from '@/features/resume/model/index'
import { documentSchema } from '@/features/resume/model/schema'

import { COALESCE_WINDOW_MS, UNDO_LIMIT, createEditorStore } from './store'
import * as edit from './mutations'

import type { StoreApi, UseBoundStore } from 'zustand'
import type { EditorState } from './store'

let store: UseBoundStore<StoreApi<EditorState>>

const open = () => {
  const document = createEmptyDocument()
  store.getState().load('resume-1', document)

  return document
}

const doc = () => {
  const { document } = store.getState()

  if (document === null) {
    throw new Error('no document open')
  }

  return document
}

beforeEach(() => {
  store = createEditorStore()
  vi.useRealTimers()
})

describe('loading', () => {
  it('starts clean with no history', () => {
    open()
    const state = store.getState()

    expect(state.isDirty()).toBe(false)
    expect(state.canUndo()).toBe(false)
    expect(state.canRedo()).toBe(false)
  })

  it('ignores edits when nothing is open', () => {
    store.getState().apply(edit.setHeaderName(text('Nobody')))

    expect(store.getState().document).toBeNull()
  })

  it('discards history when a different resume is loaded', () => {
    open()
    store.getState().apply(edit.setHeaderName(text('Avery')))
    expect(store.getState().canUndo()).toBe(true)

    store.getState().load('resume-2', createEmptyDocument())

    expect(store.getState().canUndo()).toBe(false)
    expect(store.getState().resumeId).toBe('resume-2')
  })

  it('clears everything on close', () => {
    open()
    store.getState().apply(edit.setHeaderName(text('Avery')))
    store.getState().close()

    const state = store.getState()
    expect(state.document).toBeNull()
    expect(state.resumeId).toBeNull()
    expect(state.past).toEqual([])
  })
})

describe('applying edits', () => {
  it('produces a new document without mutating the old one', () => {
    const before = open()

    store.getState().apply(edit.setHeaderName(text('Avery Chen')))

    expect(plainText(before.content.header.name)).toBe('')
    expect(plainText(doc().content.header.name)).toBe('Avery Chen')
  })

  it('shares untouched subtrees by reference', () => {
    const before = open()

    store.getState().apply(edit.setHeaderName(text('Avery Chen')))

    // Structural sharing is what makes snapshot undo cheap: the design tree was
    // not touched, so it must be the very same object.
    expect(doc().design).toBe(before.design)
  })

  it('marks the document dirty', () => {
    open()
    store.getState().apply(edit.setHeaderName(text('Avery Chen')))

    expect(store.getState().isDirty()).toBe(true)
  })

  it('creates no undo step when the recipe changes nothing', () => {
    open()

    store.getState().apply(edit.removeSection('does-not-exist'))

    expect(store.getState().canUndo()).toBe(false)
    expect(store.getState().isDirty()).toBe(false)
  })

  it('keeps the document valid after editing', () => {
    open()
    store.getState().apply(edit.setHeaderName(text('Avery Chen')))
    store.getState().apply(edit.addSection('projects', 'Projects'))

    expect(documentSchema.safeParse(doc()).success).toBe(true)
  })
})

describe('undo and redo', () => {
  it('steps back and forward through discrete edits', () => {
    open()
    store.getState().apply(edit.addSection('projects', 'Projects'))
    store.getState().apply(edit.addSection('awards', 'Awards'))

    expect(doc().content.sections).toHaveLength(6)

    store.getState().undo()
    expect(doc().content.sections).toHaveLength(5)

    store.getState().undo()
    expect(doc().content.sections).toHaveLength(4)
    expect(store.getState().canUndo()).toBe(false)

    store.getState().redo()
    store.getState().redo()
    expect(doc().content.sections).toHaveLength(6)
    expect(store.getState().canRedo()).toBe(false)
  })

  it('does nothing when there is no history', () => {
    open()

    store.getState().undo()
    store.getState().redo()

    expect(doc().content.sections).toHaveLength(4)
  })

  it('drops the redo branch once a new edit is made', () => {
    open()
    store.getState().apply(edit.addSection('projects', 'Projects'))
    store.getState().undo()
    expect(store.getState().canRedo()).toBe(true)

    store.getState().apply(edit.addSection('awards', 'Awards'))

    expect(store.getState().canRedo()).toBe(false)
    expect(plainText(doc().content.sections[4]?.title ?? [])).toBe('Awards')
  })

  it('restores the exact previous state, not an approximation', () => {
    open()
    store.getState().apply(edit.patchDesign({ paper: { size: 'A4' } }))
    store.getState().apply(edit.setTemplate('technical', { resetDesign: true }))

    store.getState().undo()

    expect(doc().templateId).toBe('classic')
    expect(doc().design.paper.size).toBe('A4')
  })

  it('bounds the history', () => {
    open()

    for (let i = 0; i < UNDO_LIMIT + 25; i++) {
      store.getState().apply(edit.addSection('custom', `Section ${i}`))
    }

    expect(store.getState().past).toHaveLength(UNDO_LIMIT)
  })
})

describe('coalescing', () => {
  it('merges consecutive edits that share a key into one undo step', () => {
    open()
    const key = 'name'

    for (const value of ['A', 'Av', 'Ave', 'Aver', 'Avery']) {
      store.getState().apply(edit.setHeaderName(text(value)), { coalesce: key })
    }

    expect(store.getState().past).toHaveLength(1)

    store.getState().undo()
    expect(plainText(doc().content.header.name)).toBe('')
  })

  it('starts a new step when the key changes', () => {
    open()

    store
      .getState()
      .apply(edit.setHeaderName(text('Avery')), { coalesce: 'name' })
    store
      .getState()
      .apply(edit.setHeaderHeadline(text('Engineer')), { coalesce: 'headline' })

    expect(store.getState().past).toHaveLength(2)

    // Undoing returns to the name-edited state, not all the way to empty.
    store.getState().undo()
    expect(plainText(doc().content.header.name)).toBe('Avery')
    expect(doc().content.header.headline).toBeUndefined()
  })

  it('starts a new step once the window lapses', () => {
    vi.useFakeTimers()
    open()

    store.getState().apply(edit.setHeaderName(text('A')), { coalesce: 'name' })
    vi.advanceTimersByTime(COALESCE_WINDOW_MS + 50)
    store
      .getState()
      .apply(edit.setHeaderName(text('Avery')), { coalesce: 'name' })

    expect(store.getState().past).toHaveLength(2)
  })

  it('never merges edits that pass no key', () => {
    open()

    store.getState().apply(edit.addSection('custom', 'One'))
    store.getState().apply(edit.addSection('custom', 'Two'))

    expect(store.getState().past).toHaveLength(2)
  })

  it('ends a coalesce run at an undo, so later typing does not merge into it', () => {
    open()

    store.getState().apply(edit.setHeaderName(text('A')), { coalesce: 'name' })
    store.getState().undo()
    store.getState().apply(edit.setHeaderName(text('B')), { coalesce: 'name' })

    expect(store.getState().past).toHaveLength(1)
    store.getState().undo()
    expect(plainText(doc().content.header.name)).toBe('')
  })
})

describe('saving', () => {
  it('clears the dirty flag when the saved document is acknowledged', () => {
    open()
    store.getState().apply(edit.setHeaderName(text('Avery')))
    expect(store.getState().isDirty()).toBe(true)

    store.getState().markSaved(doc())

    expect(store.getState().isDirty()).toBe(false)
  })

  it('stays dirty when an older document is acknowledged', () => {
    open()
    store.getState().apply(edit.setHeaderName(text('Avery')))
    const stale = doc()
    store.getState().apply(edit.setHeaderName(text('Avery Chen')))

    store.getState().markSaved(stale)

    expect(store.getState().isDirty()).toBe(true)
  })

  it('becomes dirty again after undoing past the saved state', () => {
    open()
    store.getState().apply(edit.setHeaderName(text('Avery')))
    store.getState().markSaved(doc())

    store.getState().undo()

    expect(store.getState().isDirty()).toBe(true)
  })
})

describe('replace', () => {
  it('swaps the whole document and remains undoable', () => {
    open()
    const imported = createEmptyDocument('editorial')

    store.getState().replace(imported)

    expect(doc().templateId).toBe('editorial')
    store.getState().undo()
    expect(doc().templateId).toBe('classic')
  })
})
