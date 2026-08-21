import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { readPaneSizes, writePaneSizes } from './panels'

/**
 * The unit suite runs in Node, which has no `localStorage`, so the test supplies
 * one. A DOM environment just for a key-value store would be a heavier
 * dependency than the thing under test.
 */
const createStorage = (): Storage => {
  const entries = new Map<string, string>()

  return {
    get length() {
      return entries.size
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key) => {
      entries.delete(key)
    },
    setItem: (key, value) => {
      entries.set(key, value)
    },
  }
}

const storage = createStorage()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: storage,
})

afterAll(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('pane size persistence', () => {
  beforeEach(() => {
    storage.clear()
  })

  it('round-trips a layout', () => {
    writePaneSizes(2, [100, '288px'])

    expect(readPaneSizes(2)).toEqual([100, '288px'])
  })

  it('returns null when nothing is stored', () => {
    expect(readPaneSizes(2)).toBeNull()
  })

  it('keeps layouts for different pane counts apart', () => {
    writePaneSizes(2, [100, '288px'])

    // The three-pane editor must not inherit the two-pane layout.
    expect(readPaneSizes(3)).toBeNull()
  })

  it('rejects a stored array of the wrong length', () => {
    storage.setItem('resivo.editor.panels.2', JSON.stringify([50]))

    expect(readPaneSizes(2)).toBeNull()
  })

  it('rejects entries that are not sizes', () => {
    storage.setItem(
      'resivo.editor.panels.2',
      JSON.stringify([50, 'calc(100% - 4px)']),
    )

    expect(readPaneSizes(2)).toBeNull()
  })

  it('rejects a corrupt entry rather than throwing', () => {
    storage.setItem('resivo.editor.panels.2', 'not json')

    expect(readPaneSizes(2)).toBeNull()
  })

  it('refuses to write a layout that does not match the pane count', () => {
    writePaneSizes(3, [50, 50])

    expect(storage.getItem('resivo.editor.panels.3')).toBeNull()
  })
})
