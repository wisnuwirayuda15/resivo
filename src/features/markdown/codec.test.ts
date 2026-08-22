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
          items: [
            { text: text('First point') },
            { text: text('Second point') },
          ],
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

  /**
   * An attribute holds literal text, and the writer used to put Markdown in it:
   * a title of `Lead* a_b` was written as `title="Lead\* a\_b"` and read back
   * with the backslashes still in it, because `parse` correctly treats an
   * attribute as plain text. The value is now flattened before it is written,
   * and the directive writer does whatever quoting it needs.
   */
  it('keeps markup characters in an entry attribute', () => {
    const document = documentWith([
      section('s1', 'Experience', [
        {
          id: 'b1',
          kind: 'entry',
          title: text('Lead* a_b'),
          location: text('Say "hello"'),
          bullets: [],
        },
      ]),
    ])

    expect(roundTrip(document).content.sections).toEqual(
      document.content.sections,
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

/**
 * The rest of Markdown.
 *
 * Each of these used to be kept as source text and printed as-is; each now has a
 * block in the model. The test that matters for all of them is the same one:
 * parse, write, parse again, and check the second text equals the first — a
 * construct that survives one round trip but drifts on the next is not
 * supported, it is merely tolerated once.
 */
describe('the rest of Markdown', () => {
  const parseSource = (body: string) =>
    parseDocument(`# Ada\n\n## Notes\n\n${body}\n`)

  const firstBlock = (body: string): Block | undefined => {
    const { content } = parseSource(body)

    return content.sections[0]?.blocks[0]
  }

  /** Writes the parse of `body`, then the parse of that. Stable output means the
   * codec has reached its canonical form rather than drifting each save. */
  const settle = (body: string): [string, string] => {
    const first = parseSource(body)
    const once = serializeDocument(documentWith(first.content.sections))
    const again = serializeDocument(
      documentWith(parseDocument(once).content.sections),
    )

    return [once, again]
  }

  /**
   * `written` is given where the canonical form differs from the input — a
   * table's delimiter row is written at its minimum width rather than padded to
   * the column. The construct still round-trips; it is simply normalized on the
   * way out, which is what every other block does too.
   */
  it.each([
    [
      'a table',
      '| a | b |\n| --- | --- |\n| 1 | 2 |',
      'table',
      '| a | b |\n| - | - |\n| 1 | 2 |',
    ],
    ['a code fence', '```js\nconst a = 1\n```', 'code', undefined],
    ['a block quote', '> quoted', 'quote', undefined],
    ['a numbered list', '1. first\n2. second', 'bulletList', undefined],
    ['a task list', '- [x] done\n- [ ] pending', 'bulletList', undefined],
    ['a subheading', '### Deeper', 'heading', undefined],
  ])('reads %s as a block of its own', (_label, body, kind, written) => {
    expect(firstBlock(body)?.kind).toBe(kind)

    const [once, again] = settle(body)

    expect(once).toContain(written ?? body)
    expect(again).toBe(once)
  })

  it('keeps a nested list nested', () => {
    const block = firstBlock('- one\n  - inner\n- two')

    expect(
      block?.kind === 'bulletList'
        ? block.items.map((item) => [
            plainText(item.text),
            (item.list?.items ?? []).map((child) => plainText(child.text)),
          ])
        : undefined,
    ).toEqual([
      ['one', ['inner']],
      ['two', []],
    ])
  })

  it('keeps a numbered list inside a bulleted one', () => {
    const [once, again] = settle('- one\n  1. first\n  2. second')

    expect(once).toContain('- one\n  1. first\n  2. second')
    expect(again).toBe(once)
  })

  it('numbers an ordered list from where it started', () => {
    const block = firstBlock('4. four\n5. five')

    expect(block?.kind === 'bulletList' ? block.start : undefined).toBe(4)
    expect(settle('4. four\n5. five')[0]).toContain('4. four\n5. five')
  })

  it('keeps a table column alignment', () => {
    const block = firstBlock('| a | b | c |\n| :- | :-: | -: |\n| 1 | 2 | 3 |')

    expect(block?.kind === 'table' ? block.align : undefined).toEqual([
      'left',
      'center',
      'right',
    ])
  })

  it('fences code that itself contains a fence', () => {
    const block: Block = {
      id: 'c1',
      kind: 'code',
      code: '```\ninner\n```',
    }
    const document = documentWith([section('s1', 'Notes', [block])])
    const source = serializeDocument(document)

    expect(source).toContain('````\n```\ninner\n```\n````')
    expect(roundTrip(document).content.sections).toEqual(
      document.content.sections,
    )
  })

  it('escapes a pipe inside a table cell', () => {
    const document = documentWith([
      section('s1', 'Notes', [
        {
          id: 't1',
          kind: 'table',
          head: [text('a | b')],
          rows: [[text('c')]],
          align: [null],
        },
      ]),
    ])
    const source = serializeDocument(document)

    expect(source).toContain('a \\| b')
    expect(roundTrip(document).content.sections).toEqual(
      document.content.sections,
    )
  })
})

describe('constructs the model still cannot represent', () => {
  const parseSource = (body: string) =>
    parseDocument(`# Ada\n\n## Notes\n\n${body}\n`)

  it.each([
    ['raw HTML', '<div>hello</div>'],
    ['a quote holding a list', '> - one\n> - two'],
  ])('keeps %s verbatim and warns', (_label, body) => {
    const { content, warnings } = parseSource(body)
    const [block] = content.sections[0]?.blocks ?? []

    expect(block?.kind).toBe('raw')
    expect(block?.kind === 'raw' ? block.markdown : '').toBe(body)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.line).toBe(5)
  })

  it('round-trips a raw block unchanged', () => {
    const html = '<div>hello</div>'
    const { content } = parseSource(html)
    const document = documentWith(content.sections)

    expect(serializeDocument(document)).toContain(html)
  })

  it('warns about an unknown directive rather than dropping it', () => {
    const { content, warnings } = parseSource('::mystery[content]{a="b"}')
    const [block] = content.sections[0]?.blocks ?? []

    expect(block?.kind).toBe('raw')
    expect(warnings[0]?.message).toContain('mystery')
  })
})

/**
 * Where the section boundary is, and what happens to text that arrives before
 * one. Both used to lose content: a document whose headings were all one level
 * too deep had no sections at all, and anything above the first section was
 * warned about and then dropped — which erased it from the file, because the
 * editor's buffer is a serialization of the model.
 */
describe('headings and content with nowhere to go', () => {
  it('takes the shallowest heading as the section level', () => {
    const { content } = parseDocument(
      '# Ada\n\n### Summary\n\nA sentence.\n\n### Skills\n\n- Go\n',
    )

    expect(content.sections.map((s) => plainText(s.title))).toEqual([
      'Summary',
      'Skills',
    ])
  })

  it('reads a heading below the section level as a subheading', () => {
    const { content } = parseDocument(
      '# Ada\n\n### Summary\n\n#### Detail\n\nA sentence.\n',
    )
    const [block] = content.sections[0]?.blocks ?? []

    expect(block?.kind).toBe('heading')
    expect(block?.kind === 'heading' ? block.level : undefined).toBe(4)
  })

  it('normalizes the section level to "##" on the way back out', () => {
    const { content } = parseDocument('# Ada\n\n### Summary\n\nA sentence.\n')
    const source = serializeDocument(documentWith(content.sections))

    expect(source).toContain('## Summary')
    expect(
      serializeDocument(documentWith(parseDocument(source).content.sections)),
    ).toBe(source)
  })

  it('keeps content above the first heading in an untitled section', () => {
    const { content } = parseDocument('# Ada\n\nHeadline\n\nStray paragraph\n')
    const [first] = content.sections

    expect(plainText(first?.title ?? [])).toBe('')
    expect(
      first?.blocks[0]?.kind === 'paragraph'
        ? plainText(first.blocks[0].text)
        : undefined,
    ).toBe('Stray paragraph')
  })

  it('does not lose a line of a resume written for another tool', () => {
    const pasted = [
      '# Ada Lovelace',
      '',
      '**Analyst**',
      '',
      '(+62) 8123 | ada@example.com | Jakarta',
      '',
      '---',
      '',
      '### Summary',
      '',
      'A sentence about the work.',
      '',
      '### Skills',
      '',
      '| Area | Tools |',
      '| --- | --- |',
      '| Web | Go |',
      '',
      '> A quoted note.',
      '',
      '1. First',
      '2. Second',
      '',
    ].join('\n')

    const { content } = parseDocument(pasted)
    const source = serializeDocument(documentWith(content.sections))

    /**
     * Escapes are stripped before comparing.
     *
     * The writer escapes what would otherwise be read back as markup — an email
     * becomes `ada\@example.com`, because unescaped it is a GFM autolink rather
     * than the text someone typed. That backslash is not content, and the point
     * of this test is content: no line of the paste is missing.
     */
    const written = source.replace(/\\(?=[!-/:-@[-`{-~])/g, '')

    for (const line of [
      '(+62) 8123 | ada@example.com | Jakarta',
      'A sentence about the work.',
      '| Web | Go |',
      '> A quoted note.',
      '1. First',
      '2. Second',
    ]) {
      expect(written).toContain(line)
    }
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
