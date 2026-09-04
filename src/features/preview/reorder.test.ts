import { produce } from 'immer'
import { describe, expect, it } from 'vitest'

import { createEmptyDocument } from '@/features/resume/model/index'

import { documentFlow } from './flow'
import { isMovable, moveRecipe, stepRecipe } from './reorder'

import type { FlowItem } from './flow'
import type { Recipe } from '@/features/editor/mutations'
import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * Reordering from the paper.
 *
 * The failure mode worth testing is not a crash but an off-by-one: a block that
 * lands one place further than the user dropped it, or in the section next door.
 * So each case asserts the resulting order of ids, never that "something moved".
 */

/** A document with two sections holding named blocks, so an order is readable. */
const build = (
  layout: Array<{ section: string; blocks: Array<string> }>,
): ResumeDocument =>
  produce(createEmptyDocument(), (draft) => {
    draft.content.sections = layout.map(({ section, blocks }) => ({
      id: section,
      kind: 'custom' as const,
      title: [{ type: 'text' as const, text: section }],
      blocks: blocks.map((id) => ({
        id,
        kind: 'paragraph' as const,
        text: [{ type: 'text' as const, text: id }],
      })),
    }))
  })

const order = (document: ResumeDocument) =>
  document.content.sections.map((section) => [
    section.id,
    section.blocks.map((block) => block.id),
  ])

const run = (document: ResumeDocument, recipe: Recipe | null) => {
  expect(recipe).not.toBeNull()

  return produce(document, (draft) => recipe?.(draft))
}

const find = (items: Array<FlowItem>, id: string): FlowItem => {
  const item = items.find((candidate) => candidate.id === id)

  if (item === undefined) {
    throw new Error(`no flow item ${id}`)
  }

  return item
}

const TWO_SECTIONS = [
  { section: 's1', blocks: ['a', 'b', 'c'] },
  { section: 's2', blocks: ['d', 'e'] },
]

describe('isMovable', () => {
  it('refuses the header, which has nowhere to go', () => {
    expect(isMovable({ id: 'header', type: 'header' })).toBe(false)
  })

  it('allows a section heading and a block', () => {
    expect(isMovable({ id: 'x', type: 'sectionHeading' })).toBe(true)
    expect(isMovable({ id: 'y', type: 'block' })).toBe(true)
  })
})

describe('moveRecipe', () => {
  it('reorders blocks inside one section', () => {
    const document = build(TWO_SECTIONS)
    const items = documentFlow(document)

    const next = run(
      document,
      moveRecipe(document, find(items, 'block:a'), find(items, 'block:c')),
    )

    expect(order(next)).toEqual([
      ['s1', ['b', 'c', 'a']],
      ['s2', ['d', 'e']],
    ])
  })

  it('moves a block into another section at the target position', () => {
    const document = build(TWO_SECTIONS)
    const items = documentFlow(document)

    const next = run(
      document,
      moveRecipe(document, find(items, 'block:a'), find(items, 'block:e')),
    )

    expect(order(next)).toEqual([
      ['s1', ['b', 'c']],
      ['s2', ['d', 'a', 'e']],
    ])
  })

  /** A heading means "the top of this section", which is the only reading of a
   * drop onto it that does not require guessing. */
  it('moves a block to the top of a section dropped on its heading', () => {
    const document = build(TWO_SECTIONS)
    const items = documentFlow(document)

    const next = run(
      document,
      moveRecipe(document, find(items, 'block:e'), find(items, 'section:s1')),
    )

    expect(order(next)).toEqual([
      ['s1', ['e', 'a', 'b', 'c']],
      ['s2', ['d']],
    ])
  })

  it('reorders sections when a heading is dropped on a heading', () => {
    const document = build(TWO_SECTIONS)
    const items = documentFlow(document)

    const next = run(
      document,
      moveRecipe(
        document,
        find(items, 'section:s1'),
        find(items, 'section:s2'),
      ),
    )

    expect(order(next).map(([id]) => id)).toEqual(['s2', 's1'])
  })

  /**
   * The refusals. Each returns `null` so the caller leaves the document alone,
   * a drop that does nothing is recoverable, one that does something almost
   * right is not.
   */
  it('refuses a section dropped onto a block', () => {
    const document = build(TWO_SECTIONS)
    const items = documentFlow(document)

    expect(
      moveRecipe(document, find(items, 'section:s1'), find(items, 'block:d')),
    ).toBeNull()
  })

  it('refuses an item dropped on itself', () => {
    const document = build(TWO_SECTIONS)
    const items = documentFlow(document)

    expect(
      moveRecipe(document, find(items, 'block:a'), find(items, 'block:a')),
    ).toBeNull()
  })

  it('refuses to move the header', () => {
    const document = build(TWO_SECTIONS)
    const items = documentFlow(document)

    expect(
      moveRecipe(
        document,
        { id: 'header', type: 'header' },
        find(items, 'block:a'),
      ),
    ).toBeNull()
  })

  it('refuses a block the document no longer contains', () => {
    const document = build(TWO_SECTIONS)
    const items = documentFlow(document)

    expect(
      moveRecipe(
        document,
        { id: 'block:gone', type: 'block', sectionId: 's1', blockId: 'gone' },
        find(items, 'block:a'),
      ),
    ).toBeNull()
  })
})

describe('stepRecipe', () => {
  const step = (
    document: ResumeDocument,
    id: string,
    direction: -1 | 1,
  ): Recipe | null => {
    const items = documentFlow(document)
    const index = items.findIndex((item) => item.id === id)

    return stepRecipe(
      document,
      items,
      { item: find(items, id), index },
      direction,
    )
  }

  it('swaps a block with the one below it', () => {
    const document = build(TWO_SECTIONS)
    const next = run(document, step(document, 'block:a', 1))

    expect(order(next)[0]).toEqual(['s1', ['b', 'a', 'c']])
  })

  it('swaps a block with the one above it', () => {
    const document = build(TWO_SECTIONS)
    const next = run(document, step(document, 'block:c', -1))

    expect(order(next)[0]).toEqual(['s1', ['a', 'c', 'b']])
  })

  /** The keyboard path and the drag path are the same operation, so a block at
   * the end of a section steps into the next one rather than stopping. */
  it('steps the last block of a section into the next section', () => {
    const document = build(TWO_SECTIONS)
    const next = run(document, step(document, 'block:c', 1))

    expect(order(next)).toEqual([
      ['s1', ['a', 'b']],
      ['s2', ['c', 'd', 'e']],
    ])
  })

  it('refuses to step the first block of the first section up', () => {
    const document = build(TWO_SECTIONS)

    expect(step(document, 'block:a', -1)).toBeNull()
  })

  it('refuses to step the last block of the document down', () => {
    const document = build(TWO_SECTIONS)

    expect(step(document, 'block:e', 1)).toBeNull()
  })

  it('steps a section past the next one', () => {
    const document = build(TWO_SECTIONS)
    const next = run(document, step(document, 'section:s1', 1))

    expect(order(next).map(([id]) => id)).toEqual(['s2', 's1'])
  })

  it('refuses to step the first section up or the last one down', () => {
    const document = build(TWO_SECTIONS)

    expect(step(document, 'section:s1', -1)).toBeNull()
    expect(step(document, 'section:s2', 1)).toBeNull()
  })

  /** A hidden section is not in the flow, so stepping over it must not stop at
   * it, the user cannot see it and would read the refusal as a bug. */
  it('steps past a hidden section', () => {
    const document = produce(
      build([
        { section: 's1', blocks: ['a'] },
        { section: 's2', blocks: ['b'] },
        { section: 's3', blocks: ['c'] },
      ]),
      (draft) => {
        const hidden = draft.content.sections[1]

        if (hidden !== undefined) {
          hidden.hidden = true
        }
      },
    )

    const next = run(document, step(document, 'section:s1', 1))

    expect(order(next).map(([id]) => id)).toEqual(['s2', 's3', 's1'])
  })
})
