import { describe, expect, it } from 'vitest'

import {
  createEmptyDocument,
  createSection,
  text,
} from '@/features/resume/model/index'

import { documentFlow, flowItemClass } from './flow'

import type { Block, ResumeDocument } from '@/features/resume/model/document'

const paragraph = (id: string, value: string): Block => ({
  id,
  kind: 'paragraph',
  text: text(value),
})

const withHeader = (document: ResumeDocument): ResumeDocument => ({
  ...document,
  content: {
    ...document.content,
    header: { ...document.content.header, name: text('Ada Lovelace') },
  },
})

describe('documentFlow', () => {
  it('omits the header when there is nothing in it', () => {
    // A new document has no name and no contacts. An empty header box would take
    // up space at the top of the page while showing the user nothing.
    const items = documentFlow(createEmptyDocument())

    expect(items.some((item) => item.type === 'header')).toBe(false)
  })

  it('puts the header first once it has content', () => {
    const items = documentFlow(withHeader(createEmptyDocument()))

    expect(items[0]).toEqual({ id: 'header', type: 'header' })
  })

  it('counts a contact row alone as header content', () => {
    const document = createEmptyDocument()

    document.content.header.contacts.push({
      id: 'c1',
      label: text('ada@example.com'),
    })

    expect(documentFlow(document)[0]?.type).toBe('header')
  })

  it('keeps an empty section, so the user can see where content goes', () => {
    const items = documentFlow(createEmptyDocument())

    // The four sections a new document starts with, and nothing else.
    expect(items).toHaveLength(4)
    expect(items.every((item) => item.type === 'sectionHeading')).toBe(true)
  })

  it('does not ask the paginator to keep an empty heading with anything', () => {
    const items = documentFlow(createEmptyDocument())

    expect(items.every((item) => item.keepWithNext === undefined)).toBe(true)
  })

  it('flattens a section into its heading followed by its blocks', () => {
    const document = createEmptyDocument()
    const section = createSection('experience', 'Experience', [
      paragraph('b1', 'First'),
      paragraph('b2', 'Second'),
    ])

    document.content.sections = [section]

    expect(documentFlow(document)).toEqual([
      {
        id: `section:${section.id}`,
        type: 'sectionHeading',
        sectionId: section.id,
        keepWithNext: true,
      },
      {
        id: 'block:b1',
        type: 'block',
        sectionId: section.id,
        blockId: 'b1',
      },
      {
        id: 'block:b2',
        type: 'block',
        sectionId: section.id,
        blockId: 'b2',
      },
    ])
  })

  it('skips a hidden section entirely, heading included', () => {
    const document = createEmptyDocument()
    const hidden = createSection('skills', 'Skills', [paragraph('b1', 'Rust')])

    hidden.hidden = true
    document.content.sections = [hidden]

    expect(documentFlow(document)).toEqual([])
  })

  it('produces ids unique across the whole document', () => {
    const document = withHeader(createEmptyDocument())

    document.content.sections = [
      createSection('experience', 'Experience', [paragraph('b1', 'One')]),
      createSection('projects', 'Projects', [paragraph('b2', 'Two')]),
    ]

    const ids = documentFlow(document).map((item) => item.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('flowItemClass', () => {
  it('gives every item type the shared class plus its own', () => {
    expect(flowItemClass('header')).toBe('rp-item rp-item--header')
    expect(flowItemClass('sectionHeading')).toBe('rp-item rp-item--section')
    expect(flowItemClass('block')).toBe('rp-item rp-item--block')
  })
})
