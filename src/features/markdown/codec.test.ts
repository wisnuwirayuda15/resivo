import { describe, expect, it } from 'vitest'

import {
  createContact,
  createEmptyDocument,
  plainText,
  text,
} from '@/features/resume/model/index'

import { parseDocument } from './parse'
import { serializeDocument } from './serialize'

import type {
  Block,
  ResumeDocument,
  Section,
} from '@/features/resume/model/document'

/**
 * The codec's contract is a round trip, so nearly every test here is the same
 * shape: build a document, write it, read it back, and compare the tree — not
 * the text. Comparing text would only prove the serializer is consistent with
 * itself.
 */

const section = (id: string, title: string, blocks: Array<Block>): Section => ({
  id,
  kind: 'custom',
  title: text(title),
  blocks,
})

const documentWith = (sections: Array<Section>): ResumeDocument => {
  const document = createEmptyDocument('classic')

  document.content.header.name = text('Ada Lovelace')
  document.content.sections = sections

  return document
}

/** Writes then reads, matching against the original so ids are reused. */
const roundTrip = (document: ResumeDocument) =>
  parseDocument(serializeDocument(document), document)

describe('round trip', () => {
  it('keeps the header', () => {
    const document = documentWith([])
    document.content.header.headline = text('Analytical Engine Programmer')
    document.content.header.contacts = [
      createContact('ada@example.com', {
        icon: 'envelope-simple',
        href: 'mailto:ada@example.com',
      }),
      createContact('London'),
    ]

    const { content } = roundTrip(document)

    expect(content.header).toEqual(document.content.header)
  })

  it('keeps an empty document parseable', () => {
    const document = createEmptyDocument('classic')
    const { content, warnings } = roundTrip(document)

    expect(warnings).toEqual([])
    expect(content.sections.map((s) => plainText(s.title))).toEqual([
      'Summary',
      'Experience',
      'Education',
      'Skills',
    ])
  })

  it('keeps paragraphs, bullet lists, tags and dividers', () => {
    const document = documentWith([
      section('s1', 'Summary', [
        { id: 'b1', kind: 'paragraph', text: text('A plain sentence.') },
        {
          id: 'b2',
          kind: 'bulletList',
          items: [text('First point'), text('Second point')],
        },
        { id: 'b3', kind: 'divider' },
        { id: 'b4', kind: 'tagList', tags: ['Analysis', 'Notation'] },
      ]),
    ])

    expect(roundTrip(document).content.sections).toEqual(
      document.content.sections,
    )
  })

  it('keeps every field of an entry', () => {
    const document = documentWith([
      section('s1', 'Experience', [
        {
          id: 'b1',
          kind: 'entry',
          title: text('Collaborator'),
          subtitle: text('Analytical Engine Project'),
          location: text('London'),
          dateRange: { start: '1842-06', end: '1843-08' },
          summary: text('Translated and annotated the memoir.'),
          bullets: [text('Wrote the first algorithm.'), text('Added notes.')],
        },
      ]),
    ])

    expect(roundTrip(document).content.sections).toEqual(
      document.content.sections,
    )
  })

  it('keeps an entry that is still current', () => {
    const document = documentWith([
      section('s1', 'Experience', [
        {
          id: 'b1',
          kind: 'entry',
          title: text('Analyst'),
          dateRange: { start: '2021-03', current: true },
          bullets: [],
        },
      ]),
    ])

    expect(roundTrip(document).content.sections).toEqual(
      document.content.sections,
    )
  })

  it('keeps inline marks and links', () => {
    const document = documentWith([
      section('s1', 'Summary', [
        {
          id: 'b1',
          kind: 'paragraph',
          text: [
            { type: 'text', text: 'strong', marks: ['bold'] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'slanted', marks: ['italic'] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'gone', marks: ['strike'] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'literal', marks: ['code'] },
            { type: 'text', text: ' and ' },
            {
              type: 'link',
              href: 'https://example.com',
              children: [{ type: 'text', text: 'a link' }],
            },
          ],
        },
      ]),
    ])

    expect(roundTrip(document).content.sections).toEqual(
      document.content.sections,
    )
  })

  it('keeps two marks on one run', () => {
    const document = documentWith([
      section('s1', 'Summary', [
        {
          id: 'b1',
          kind: 'paragraph',
          text: [{ type: 'text', text: 'both', marks: ['bold', 'italic'] }],
        },
      ]),
    ])

    const [block] = roundTrip(document).content.sections[0]?.blocks ?? []

    // The set is what matters; the order the marks are stored in is not.
    expect(block?.kind === 'paragraph' && block.text[0]?.type === 'text').toBe(
      true,
    )
    expect(
      block?.kind === 'paragraph' && block.text[0]?.type === 'text'
        ? [...(block.text[0].marks ?? [])].sort()
        : [],
    ).toEqual(['bold', 'italic'])
  })

  it('keeps icons, both inline and as a labelled block', () => {
    const document = documentWith([
      section('s1', 'Contact', [
        {
          id: 'b1',
          kind: 'iconLabel',
          icon: { library: 'phosphor', name: 'map-pin' },
          label: text('London'),
        },
        {
          id: 'b2',
          kind: 'paragraph',
          text: [
            {
              type: 'icon',
              icon: { library: 'phosphor', name: 'star', weight: 'fill' },
            },
            { type: 'text', text: ' rated' },
          ],
        },
      ]),
    ])

    expect(roundTrip(document).content.sections).toEqual(
      document.content.sections,
    )
  })

  it('keeps an image reference and its width', () => {
    const document = documentWith([
      section('s1', 'Portfolio', [
        {
          id: 'b1',
          kind: 'image',
          imageId: 'img-1',
          alt: 'A chart',
          widthPercent: 60,
        },
      ]),
    ])

    expect(roundTrip(document).content.sections).toEqual(
      document.content.sections,
    )
  })

  it('escapes text that would otherwise be read as markup', () => {
    const awkward = 'a*b_c`d[e]f~g\\h'
    const document = documentWith([
      section('s1', 'Summary', [
        { id: 'b1', kind: 'paragraph', text: text(awkward) },
      ]),
    ])

    const [block] = roundTrip(document).content.sections[0]?.blocks ?? []

    expect(block?.kind === 'paragraph' ? plainText(block.text) : '').toBe(
      awkward,
    )
  })

  it('does not let a colon in text become a directive', () => {
    const document = documentWith([
      section('s1', 'Summary', [
        {
          id: 'b1',
          kind: 'paragraph',
          text: text('Shipped at 09:30 — see :icon[trap]{name=star}'),
        },
      ]),
    ])

    const [block] = roundTrip(document).content.sections[0]?.blocks ?? []

    expect(block?.kind === 'paragraph' ? plainText(block.text) : '').toBe(
      'Shipped at 09:30 — see :icon[trap]{name=star}',
    )
  })
})

describe('serializing', () => {
  it('is byte-stable for the same document', () => {
    const document = documentWith([
      section('s1', 'Summary', [
        { id: 'b1', kind: 'paragraph', text: text('Once.') },
      ]),
    ])

    expect(serializeDocument(document)).toBe(serializeDocument(document))
  })

  it('is idempotent through a parse', () => {
    const document = documentWith([
      section('s1', 'Experience', [
        {
          id: 'b1',
          kind: 'entry',
          title: text('Analyst'),
          subtitle: text('Somewhere'),
          dateRange: { start: '2020', end: '2022' },
          bullets: [text('Did a thing')],
        },
      ]),
    ])

    const once = serializeDocument(document)
    const { content } = parseDocument(once, document)
    const twice = serializeDocument({ ...document, content })

    expect(twice).toBe(once)
  })

  it('ends with exactly one newline', () => {
    const source = serializeDocument(documentWith([]))

    expect(source.endsWith('\n')).toBe(true)
    expect(source.endsWith('\n\n')).toBe(false)
  })
})

describe('constructs the model cannot represent', () => {
  const parseSource = (body: string) =>
    parseDocument(`# Ada\n\n## Notes\n\n${body}\n`)

  it.each([
    ['a table', '| a | b |\n| - | - |\n| 1 | 2 |'],
    ['a code fence', '```js\nconst a = 1\n```'],
    ['a block quote', '> quoted'],
    ['a numbered list', '1. first\n2. second'],
    ['raw HTML', '<div>hello</div>'],
  ])('keeps %s verbatim and warns', (_label, body) => {
    const { content, warnings } = parseSource(body)
    const [block] = content.sections[0]?.blocks ?? []

    expect(block?.kind).toBe('raw')
    expect(block?.kind === 'raw' ? block.markdown : '').toBe(body)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.line).toBe(5)
  })

  it('round-trips a raw block unchanged', () => {
    const table = '| a | b |\n| - | - |'
    const { content } = parseSource(table)
    const document = documentWith(content.sections)

    expect(serializeDocument(document)).toContain(table)
  })

  it('warns about an unknown directive rather than dropping it', () => {
    const { content, warnings } = parseSource('::mystery[content]{a="b"}')
    const [block] = content.sections[0]?.blocks ?? []

    expect(block?.kind).toBe('raw')
    expect(warnings[0]?.message).toContain('mystery')
  })

  it('warns about content above the first section', () => {
    const { warnings } = parseDocument('# Ada\n\nHeadline\n\nStray paragraph\n')

    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.message).toContain('above the first')
  })

  it('treats a deeper heading as content, not as a section', () => {
    const { content, warnings } = parseSource('### Too deep')

    expect(content.sections).toHaveLength(1)
    expect(content.sections[0]?.blocks[0]?.kind).toBe('raw')
    expect(warnings[0]?.message).toContain('"##"')
  })
})

describe('identity across a reparse', () => {
  it('reuses section and block ids', () => {
    const document = documentWith([
      section('s1', 'Summary', [
        { id: 'b1', kind: 'paragraph', text: text('One.') },
      ]),
      section('s2', 'Skills', [
        { id: 'b2', kind: 'tagList', tags: ['Analysis'] },
      ]),
    ])

    const { content } = roundTrip(document)

    expect(content.sections.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(content.sections.flatMap((s) => s.blocks.map((b) => b.id))).toEqual([
      'b1',
      'b2',
    ])
  })

  it('keeps a section its id when only its heading is renamed', () => {
    const document = documentWith([
      section('s1', 'Experience', [
        { id: 'b1', kind: 'paragraph', text: text('One.') },
      ]),
    ])

    const source = serializeDocument(document).replace(
      '## Experience',
      '## Work history',
    )
    const { content } = parseDocument(source, document)

    expect(content.sections[0]?.id).toBe('s1')
    // The heading is a label; the kind is what a template keys off, so renaming
    // must not silently change the layout.
    expect(content.sections[0]?.kind).toBe('custom')
    expect(plainText(content.sections[0]?.title ?? [])).toBe('Work history')
  })

  it('carries across the fields Markdown cannot express', () => {
    const hidden: Section = {
      ...section('s1', 'Interests', []),
      hidden: true,
      icon: { library: 'phosphor', name: 'star' },
      style: { showDivider: false },
    }
    const document = documentWith([hidden])

    expect(roundTrip(document).content.sections[0]).toEqual(hidden)
  })

  it('gives a genuinely new section a new id', () => {
    const document = documentWith([section('s1', 'Summary', [])])
    const source = `${serializeDocument(document)}\n## Added\n\nNew text.\n`
    const { content } = parseDocument(source, document)

    expect(content.sections).toHaveLength(2)
    expect(content.sections[0]?.id).toBe('s1')
    expect(content.sections[1]?.id).not.toBe('s1')
  })
})

describe('section kinds', () => {
  it.each([
    ['Summary', 'summary'],
    ['Work Experience', 'experience'],
    ['Technical Skills', 'skills'],
    ['Hobbies', 'interests'],
    ['Volunteering', 'custom'],
  ])('reads "%s" as %s on a first parse', (title, kind) => {
    const { content } = parseDocument(`# Ada\n\n## ${title}\n\nText.\n`)

    expect(content.sections[0]?.kind).toBe(kind)
  })
})
