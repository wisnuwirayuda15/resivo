import { describe, expect, it } from 'vitest'

import { createEmptyDocument } from '@/features/resume/model/index'

import { documentFontIds, documentImageIds } from './references'

import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * These decide which blobs the preview holds open while a document is edited.
 * Missing one shows a missing-image box on the paper; returning one twice would
 * make the object-URL cache's reference count wrong, which is a leak.
 */

const withSections = (build: (document: ResumeDocument) => void) => {
  const document = createEmptyDocument()

  build(document)

  return document
}

describe('documentImageIds', () => {
  it('finds the avatar', () => {
    const document = withSections((draft) => {
      draft.content.header.avatarImageId = 'avatar'
    })

    expect(documentImageIds(document)).toEqual(['avatar'])
  })

  it('finds image blocks in every section', () => {
    const document = withSections((draft) => {
      draft.content.sections[0]?.blocks.push({
        id: 'b1',
        kind: 'image',
        imageId: 'one',
        alt: '',
      })
      draft.content.sections[1]?.blocks.push({
        id: 'b2',
        kind: 'image',
        imageId: 'two',
        alt: '',
      })
    })

    expect(documentImageIds(document).sort()).toEqual(['one', 'two'])
  })

  it('reports an id used twice only once', () => {
    const document = withSections((draft) => {
      draft.content.header.avatarImageId = 'same'
      draft.content.sections[0]?.blocks.push({
        id: 'b1',
        kind: 'image',
        imageId: 'same',
        alt: '',
      })
    })

    expect(documentImageIds(document)).toEqual(['same'])
  })

  it('finds nothing in a document with no images', () => {
    expect(documentImageIds(createEmptyDocument())).toEqual([])
  })
})

describe('documentFontIds', () => {
  it('finds a custom body font', () => {
    const document = withSections((draft) => {
      draft.design.typography.bodyFont = {
        family: 'Mine',
        source: 'custom',
        fontId: 'f1',
      }
    })

    expect(documentFontIds(document)).toEqual(['f1'])
  })

  it('finds body and heading separately', () => {
    const document = withSections((draft) => {
      draft.design.typography.bodyFont = {
        family: 'A',
        source: 'custom',
        fontId: 'f1',
      }
      draft.design.typography.headingFont = {
        family: 'B',
        source: 'custom',
        fontId: 'f2',
      }
    })

    expect(documentFontIds(document).sort()).toEqual(['f1', 'f2'])
  })

  /** The built-in families are vendored stylesheets, not rows — asking the fonts
   * table for one would be a read that always misses. */
  it('ignores the built-in families', () => {
    expect(documentFontIds(createEmptyDocument())).toEqual([])
  })

  it('ignores a custom reference with no row id', () => {
    const document = withSections((draft) => {
      draft.design.typography.bodyFont = { family: 'Mine', source: 'custom' }
    })

    expect(documentFontIds(document)).toEqual([])
  })
})
