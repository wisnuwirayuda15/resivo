import { describe, expect, it } from 'vitest'

import { paginate } from './paginate'

import type { FlowMetric } from './paginate'

/**
 * The paginator is the one piece of the preview engine whose correctness cannot
 * be eyeballed: a break one item too early looks exactly like a break that is
 * right. So it takes numbers and returns ids, and these cover the cases a real
 * resume hits, a section that runs over, a heading that would be orphaned, an
 * entry too tall for any page, and a page that fills to the last fraction of a
 * pixel.
 */

const item = (
  id: string,
  height: number,
  options: {
    spaceBefore?: number
    keepWithNext?: boolean
    breakBefore?: boolean
  } = {},
): FlowMetric => ({
  id,
  height,
  spaceBefore: options.spaceBefore ?? 0,
  ...(options.keepWithNext === true ? { keepWithNext: true } : {}),
  ...(options.breakBefore === true ? { breakBefore: true } : {}),
})

const PAGE = 100

describe('paginate', () => {
  it('returns a single blank page for a document with no content', () => {
    expect(paginate([], PAGE)).toEqual([[]])
  })

  it('breaks where it is told to, even with room to spare', () => {
    const pages = paginate(
      [item('a', 10), item('b', 10, { breakBefore: true }), item('c', 10)],
      PAGE,
    )

    expect(pages).toEqual([['a'], ['b', 'c']])
  })

  it('ignores a forced break with nothing before it', () => {
    // There is no page to break away from, and honouring it would produce a
    // blank first sheet. `documentFlow` will not emit this, but the paginator is
    // reachable on its own and should not depend on that.
    expect(paginate([item('a', 10, { breakBefore: true })], PAGE)).toEqual([
      ['a'],
    ])
  })

  it('lets two forced breaks in a row produce a blank page', () => {
    // Which is what asking for two breaks means. The markers carry no height,
    // so the middle page is genuinely empty rather than nearly so.
    const pages = paginate(
      [
        item('a', 10),
        item('break-1', 0, { breakBefore: true }),
        item('break-2', 0, { breakBefore: true }),
        item('b', 10, { breakBefore: true }),
      ],
      PAGE,
    )

    expect(pages).toEqual([['a'], ['break-1'], ['break-2'], ['b']])
  })

  it('keeps everything on one page when it fits', () => {
    const pages = paginate([item('a', 40), item('b', 40)], PAGE)

    expect(pages).toEqual([['a', 'b']])
  })

  it('starts a new page when the next item would overflow', () => {
    const pages = paginate([item('a', 60), item('b', 60), item('c', 30)], PAGE)

    expect(pages).toEqual([['a'], ['b', 'c']])
  })

  it('drops an item leading space when it lands at the top of a page', () => {
    // `b` is 60 tall including 10 of space above it. Following `a` it does not
    // fit; alone at the top of page two it occupies only 50, which leaves room
    // for `c`, whose own 10 of space is kept, because it is not first.
    const pages = paginate(
      [
        item('a', 50),
        item('b', 60, { spaceBefore: 10 }),
        item('c', 50, { spaceBefore: 10 }),
      ],
      PAGE,
    )

    expect(pages).toEqual([['a'], ['b', 'c']])
  })

  it('breaks before a heading rather than stranding it at the foot of a page', () => {
    const items = [
      item('filler', 30),
      item('heading', 20, { keepWithNext: true }),
      item('block', 60),
    ]

    expect(paginate(items, PAGE)).toEqual([['filler'], ['heading', 'block']])
  })

  it('leaves the heading in place when its first block does fit', () => {
    const items = [
      item('filler', 20),
      item('heading', 20, { keepWithNext: true }),
      item('block', 50),
    ]

    expect(paginate(items, PAGE)).toEqual([['filler', 'heading', 'block']])
  })

  it('does not strand a heading when the block after it fits on no page at all', () => {
    // Honouring keep-with-next here would break before the heading and again
    // after it, leaving the heading alone on a near-empty page, the exact
    // orphan the rule exists to prevent.
    const items = [
      item('filler', 30),
      item('heading', 20, { keepWithNext: true }),
      item('oversized', 250),
    ]

    expect(paginate(items, PAGE)).toEqual([
      ['filler', 'heading'],
      ['oversized'],
    ])
  })

  it('does not strand a heading whose block only just fails to pair with it', () => {
    // Heading plus block is 105 against a 100 page, so they can never share one.
    const items = [
      item('filler', 30),
      item('heading', 20, { keepWithNext: true }),
      item('block', 85),
    ]

    expect(paginate(items, PAGE)).toEqual([['filler', 'heading'], ['block']])
  })

  it('ignores keepWithNext on the last item, which has nothing to keep', () => {
    const items = [
      item('filler', 70),
      item('heading', 25, { keepWithNext: true }),
    ]

    expect(paginate(items, PAGE)).toEqual([['filler', 'heading']])
  })

  it('gives an item taller than the page its own page and carries on', () => {
    const items = [item('a', 30), item('huge', 250), item('c', 30)]

    // The oversized item is not split (items are atomic, which is what gives
    // entries their break-inside behaviour), so it overflows a page of its own.
    expect(paginate(items, PAGE)).toEqual([['a'], ['huge'], ['c']])
  })

  it('does not break for sub-pixel rounding', () => {
    // A page derived from inches rarely divides into whole pixels, so a page
    // that fits exactly can total a hair over.
    expect(paginate([item('a', 50), item('b', 50.4)], PAGE)).toEqual([
      ['a', 'b'],
    ])
  })

  it('still breaks for an overflow larger than the slack', () => {
    expect(paginate([item('a', 50), item('b', 51)], PAGE)).toEqual([
      ['a'],
      ['b'],
    ])
  })

  it('never loses or duplicates an item', () => {
    const items = Array.from({ length: 40 }, (_unused, index) =>
      item(`i${index}`, 7 + (index % 5) * 9, { spaceBefore: index % 3 }),
    )

    const flattened = paginate(items, PAGE).flat()

    expect(flattened).toEqual(items.map((entry) => entry.id))
  })
})
