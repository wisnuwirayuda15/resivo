import { describe, expect, it } from 'vitest'
import { produce } from 'immer'

import {
  createEmptyDocument,
  plainText,
  text,
} from '@/features/resume/model/index'
import { documentSchema } from '@/features/resume/model/schema'
import { templateDefaults } from '@/features/templates/defaults'

import * as edit from './mutations'

import type { Recipe } from './mutations'
import type { ResumeDocument } from '@/features/resume/model/document'

/** Applies a recipe the same way the store does. */
const apply = (document: ResumeDocument, ...recipes: Array<Recipe>) =>
  recipes.reduce((current, recipe) => produce(current, recipe), document)

const titles = (document: ResumeDocument) =>
  document.content.sections.map((section) => plainText(section.title))

describe('header edits', () => {
  it('sets the name', () => {
    const next = apply(createEmptyDocument(), edit.setHeaderName(text('Avery')))

    expect(plainText(next.content.header.name)).toBe('Avery')
  })

  it('adds, edits and removes a contact', () => {
    const added = apply(createEmptyDocument(), edit.addContact('a@example.com'))
    const contact = added.content.header.contacts[0]

    expect(plainText(contact?.label ?? [])).toBe('a@example.com')

    const edited = apply(
      added,
      edit.updateContactLabel(contact?.id ?? '', text('b@example.com')),
    )
    expect(plainText(edited.content.header.contacts[0]?.label ?? [])).toBe(
      'b@example.com',
    )

    const removed = apply(edited, edit.removeContact(contact?.id ?? ''))
    expect(removed.content.header.contacts).toEqual([])
  })

  it('clears the avatar by removing the key rather than storing undefined', () => {
    const set = apply(createEmptyDocument(), edit.setAvatarImage('image-1'))
    const cleared = apply(set, edit.setAvatarImage(undefined))

    expect('avatarImageId' in cleared.content.header).toBe(false)
    expect(documentSchema.safeParse(cleared).success).toBe(true)
  })
})

describe('section edits', () => {
  it('appends a section by default', () => {
    const next = apply(
      createEmptyDocument(),
      edit.addSection('projects', 'Projects'),
    )

    expect(titles(next)).toEqual([
      'Summary',
      'Experience',
      'Education',
      'Skills',
      'Projects',
    ])
  })

  it('inserts a section at a given index', () => {
    const next = apply(
      createEmptyDocument(),
      edit.addSection('projects', 'Projects', 1),
    )

    expect(titles(next)[1]).toBe('Projects')
  })

  it('gives each added section a distinct id', () => {
    const next = apply(
      createEmptyDocument(),
      edit.addSection('custom', 'One'),
      edit.addSection('custom', 'Two'),
    )
    const ids = next.content.sections.map((section) => section.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('removes a section', () => {
    const document = createEmptyDocument()
    const target = document.content.sections[1]

    const next = apply(document, edit.removeSection(target?.id ?? ''))

    expect(titles(next)).toEqual(['Summary', 'Education', 'Skills'])
  })

  it('hides and unhides without deleting', () => {
    const document = createEmptyDocument()
    const id = document.content.sections[0]?.id ?? ''

    const hidden = apply(document, edit.setSectionHidden(id, true))
    expect(hidden.content.sections[0]?.hidden).toBe(true)

    const shown = apply(hidden, edit.setSectionHidden(id, false))
    expect('hidden' in (shown.content.sections[0] ?? {})).toBe(false)
    expect(shown.content.sections).toHaveLength(4)
  })

  it('moves a section', () => {
    const next = apply(createEmptyDocument(), edit.moveSection(0, 2))

    expect(titles(next)).toEqual([
      'Experience',
      'Education',
      'Summary',
      'Skills',
    ])
  })

  it('clamps an out-of-range move instead of dropping the section', () => {
    const next = apply(createEmptyDocument(), edit.moveSection(0, 99))

    expect(next.content.sections).toHaveLength(4)
    expect(titles(next)[3]).toBe('Summary')
  })

  it('ignores a move from an index that does not exist', () => {
    const document = createEmptyDocument()
    const next = apply(document, edit.moveSection(99, 0))

    expect(titles(next)).toEqual(titles(document))
  })

  it('reorders by id', () => {
    const document = createEmptyDocument()
    const ids = document.content.sections.map((section) => section.id)

    const next = apply(
      document,
      edit.reorderSections([ids[3], ids[0], ids[1], ids[2]] as Array<string>),
    )

    expect(titles(next)).toEqual([
      'Skills',
      'Summary',
      'Experience',
      'Education',
    ])
  })

  it('keeps sections a stale id list omits', () => {
    const document = createEmptyDocument()
    const ids = document.content.sections.map((section) => section.id)

    // Only two of four ids: the rest must survive, not vanish.
    const next = apply(
      document,
      edit.reorderSections([ids[2], ids[0]] as Array<string>),
    )

    expect(next.content.sections).toHaveLength(4)
    expect(titles(next).slice(0, 2)).toEqual(['Education', 'Summary'])
  })
})

describe('block edits', () => {
  const withParagraph = () => {
    const document = createEmptyDocument()
    const sectionId = document.content.sections[0]?.id ?? ''

    return {
      sectionId,
      document: apply(
        document,
        edit.addBlock(sectionId, {
          id: 'block-1',
          kind: 'paragraph',
          text: text('Original'),
        }),
      ),
    }
  }

  it('adds a block to a section', () => {
    const { document, sectionId } = withParagraph()
    const section = document.content.sections.find((s) => s.id === sectionId)

    expect(section?.blocks).toHaveLength(1)
  })

  it('ignores a block added to a section that does not exist', () => {
    const next = apply(
      createEmptyDocument(),
      edit.addBlock('nope', { id: 'b', kind: 'divider' }),
    )

    expect(
      next.content.sections.every((section) => section.blocks.length === 0),
    ).toBe(true)
  })

  it('edits paragraph text', () => {
    const { document, sectionId } = withParagraph()

    const next = apply(
      document,
      edit.setBlockText(sectionId, 'block-1', text('Edited')),
    )
    const block = next.content.sections.find((s) => s.id === sectionId)
      ?.blocks[0]

    expect(block?.kind).toBe('paragraph')
    expect(block?.kind === 'paragraph' && plainText(block.text)).toBe('Edited')
  })

  it('edits an entry title through the same operation', () => {
    const document = createEmptyDocument()
    const sectionId = document.content.sections[1]?.id ?? ''
    const withEntry = apply(
      document,
      edit.addBlock(sectionId, {
        id: 'entry-1',
        kind: 'entry',
        title: text('Engineer'),
        bullets: [],
      }),
    )

    const next = apply(
      withEntry,
      edit.setBlockText(sectionId, 'entry-1', text('Staff Engineer')),
    )
    const block = next.content.sections.find((s) => s.id === sectionId)
      ?.blocks[0]

    expect(block?.kind === 'entry' && plainText(block.title)).toBe(
      'Staff Engineer',
    )
  })

  it('leaves a raw block untouched, so unsupported Markdown round-trips', () => {
    const document = createEmptyDocument()
    const sectionId = document.content.sections[0]?.id ?? ''
    const source = '| a | b |\n| - | - |'
    const withRaw = apply(
      document,
      edit.addBlock(sectionId, { id: 'raw-1', kind: 'raw', markdown: source }),
    )

    const next = apply(
      withRaw,
      edit.setBlockText(sectionId, 'raw-1', text('clobbered')),
    )
    const block = next.content.sections.find((s) => s.id === sectionId)
      ?.blocks[0]

    expect(block?.kind === 'raw' && block.markdown).toBe(source)
  })

  it('edits one bullet without disturbing its siblings', () => {
    const document = createEmptyDocument()
    const sectionId = document.content.sections[1]?.id ?? ''
    const withList = apply(
      document,
      edit.addBlock(sectionId, {
        id: 'list-1',
        kind: 'bulletList',
        items: [text('One'), text('Two'), text('Three')],
      }),
    )

    const next = apply(
      withList,
      edit.setBulletItem(sectionId, 'list-1', 1, text('Second')),
    )
    const block = next.content.sections.find((s) => s.id === sectionId)
      ?.blocks[0]

    expect(
      block?.kind === 'bulletList' &&
        block.items.map((item) => plainText(item)),
    ).toEqual(['One', 'Second', 'Three'])
  })

  it('ignores a bullet index that is out of range', () => {
    const document = createEmptyDocument()
    const sectionId = document.content.sections[1]?.id ?? ''
    const withList = apply(
      document,
      edit.addBlock(sectionId, {
        id: 'list-1',
        kind: 'bulletList',
        items: [text('One')],
      }),
    )

    const next = apply(
      withList,
      edit.setBulletItem(sectionId, 'list-1', 5, text('Nope')),
    )
    const block = next.content.sections.find((s) => s.id === sectionId)
      ?.blocks[0]

    expect(block?.kind === 'bulletList' && block.items).toHaveLength(1)
  })

  it('removes a block', () => {
    const { document, sectionId } = withParagraph()

    const next = apply(document, edit.removeBlock(sectionId, 'block-1'))

    expect(
      next.content.sections.find((s) => s.id === sectionId)?.blocks,
    ).toEqual([])
  })

  it('moves a block across sections in one step', () => {
    const document = createEmptyDocument()
    const from = document.content.sections[0]?.id ?? ''
    const to = document.content.sections[1]?.id ?? ''
    const seeded = apply(
      document,
      edit.addBlock(from, { id: 'block-1', kind: 'divider' }),
    )

    const next = apply(seeded, edit.moveBlockToSection(from, 'block-1', to, 0))

    expect(next.content.sections.find((s) => s.id === from)?.blocks).toEqual([])
    expect(
      next.content.sections.find((s) => s.id === to)?.blocks.map((b) => b.id),
    ).toEqual(['block-1'])
  })

  it('ignores a cross-section move of a block that is not there', () => {
    const document = createEmptyDocument()
    const from = document.content.sections[0]?.id ?? ''
    const to = document.content.sections[1]?.id ?? ''

    const next = apply(document, edit.moveBlockToSection(from, 'ghost', to, 0))

    expect(next).toBe(document)
  })
})

describe('style and template edits', () => {
  it('patches one style group without resetting the others', () => {
    const document = createEmptyDocument()

    const next = apply(document, edit.patchDesign({ paper: { size: 'A4' } }))

    expect(next.design.paper.size).toBe('A4')
    // The rest of the paper group, and every other group, is preserved.
    expect(next.design.paper.margin).toEqual(document.design.paper.margin)
    expect(next.design.typography).toEqual(document.design.typography)
  })

  it('keeps the document valid after a style patch', () => {
    const next = apply(
      createEmptyDocument(),
      edit.patchDesign({ typography: { baseSize: 11 } }),
    )

    expect(documentSchema.safeParse(next).success).toBe(true)
  })

  it('switches template while preserving customised styling', () => {
    const customised = apply(
      createEmptyDocument(),
      edit.patchDesign({ paper: { size: 'A4' } }),
    )

    const next = apply(
      customised,
      edit.setTemplate('technical', { resetDesign: false }),
    )

    expect(next.templateId).toBe('technical')
    expect(next.design.paper.size).toBe('A4')
  })

  it('reseeds styling from the template when asked to', () => {
    const customised = apply(
      createEmptyDocument(),
      edit.patchDesign({ paper: { size: 'A4' } }),
    )

    const next = apply(
      customised,
      edit.setTemplate('technical', { resetDesign: true }),
    )

    expect(next.design).toEqual(templateDefaults('technical'))
  })

  it('stores custom CSS verbatim', () => {
    const css = '.resume h2 { letter-spacing: 0.04em; }'
    const next = apply(createEmptyDocument(), edit.setCustomCss(css))

    expect(next.customCss).toBe(css)
  })
})
