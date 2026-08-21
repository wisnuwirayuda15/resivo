import { describe, expect, it } from 'vitest'

import { parseCatalog, scoreIcon, searchIcons } from './catalog'

/**
 * The generated catalog is not imported here: these tests are about the reader
 * and the ranking, and pulling in 730KB of glyphs to assert that "star" beats
 * "star-four" would make the suite slower for no extra confidence. One test does
 * load it, to check the file it is generated into still parses.
 */

const entry = (name: string, terms = '') => ({ name, terms, body: '<path/>' })

const ENTRIES = [
  entry('star', 'rate ratings favorites'),
  entry('star-four', 'sparkle'),
  entry('star-half', ''),
  entry('trash', 'delete remove bin'),
  entry('envelope-simple', 'mail email'),
  entry('envelope', 'mail email'),
  entry('map-pin', 'location place'),
]

describe('parseCatalog', () => {
  it('reads name, terms and body from each line', () => {
    const { entries, byName } = parseCatalog(
      'star\trate favorites\t<path d="a"/>\ntrash\tdelete\t<path d="b"/>',
    )

    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({
      name: 'star',
      terms: 'rate favorites',
      body: '<path d="a"/>',
    })
    expect(byName.get('trash')?.body).toBe('<path d="b"/>')
  })

  it('ignores blank lines', () => {
    expect(parseCatalog('a\t\t<path/>\n\n').entries).toHaveLength(1)
  })

  it('yields nothing for an empty source', () => {
    expect(parseCatalog('').entries).toEqual([])
  })
})

describe('scoreIcon', () => {
  it('ranks an exact name above everything', () => {
    expect(scoreIcon(entry('star'), 'star')).toBeGreaterThan(
      scoreIcon(entry('star-four'), 'star'),
    )
  })

  it('ranks a prefix above a word boundary above a bare substring', () => {
    const prefix = scoreIcon(entry('star-four'), 'star')
    const boundary = scoreIcon(entry('shooting-star'), 'star')
    const inside = scoreIcon(entry('restart'), 'star')

    expect(prefix).toBeGreaterThan(boundary)
    expect(boundary).toBeGreaterThan(inside)
  })

  it('ranks a name match above a tag match', () => {
    expect(scoreIcon(entry('trash-simple'), 'trash')).toBeGreaterThan(
      scoreIcon(entry('x-circle', 'trash delete'), 'trash'),
    )
  })

  it('finds an icon by a word that is not in its name', () => {
    expect(
      scoreIcon(entry('trash', 'delete remove'), 'delete'),
    ).toBeGreaterThan(0)
  })

  it('prefers a whole tag to a tag it merely appears inside', () => {
    expect(scoreIcon(entry('a', 'delete'), 'delete')).toBeGreaterThan(
      scoreIcon(entry('b', 'undeleted'), 'delete'),
    )
  })

  it('falls back to a scattered subsequence', () => {
    expect(scoreIcon(entry('envelope-simple'), 'envlp')).toBeGreaterThan(0)
  })

  it('returns zero when nothing matches', () => {
    expect(scoreIcon(entry('star', 'rate'), 'zzzz')).toBe(0)
  })

  it('matches everything on an empty query', () => {
    expect(scoreIcon(entry('anything'), '   ')).toBe(1)
  })

  it('ignores case and surrounding space', () => {
    expect(scoreIcon(entry('star'), '  STAR ')).toBe(
      scoreIcon(entry('star'), 'star'),
    )
  })
})

describe('searchIcons', () => {
  it('returns everything, in the given order, for an empty query', () => {
    expect(searchIcons(ENTRIES, '').map((e) => e.name)).toEqual(
      ENTRIES.map((e) => e.name),
    )
  })

  it('puts the obvious answer first', () => {
    expect(searchIcons(ENTRIES, 'star').map((e) => e.name)).toEqual([
      'star',
      'star-four',
      'star-half',
    ])
  })

  it('finds by tag', () => {
    expect(searchIcons(ENTRIES, 'delete').map((e) => e.name)).toEqual(['trash'])
  })

  it('prefers the shorter of two names that both start with the query', () => {
    expect(searchIcons(ENTRIES, 'envelope').map((e) => e.name)).toEqual([
      'envelope',
      'envelope-simple',
    ])
  })

  it('orders the same query the same way whatever order it is given', () => {
    const once = searchIcons(ENTRIES, 'mail').map((e) => e.name)
    const twice = searchIcons([...ENTRIES].reverse(), 'mail').map((e) => e.name)

    expect(once).toEqual(twice)
  })

  /**
   * Both of these came from running the picker against the real catalog, where
   * the first ordering put `voicemail` above `envelope` for "mail" and buried
   * `trash` under `backspace` for "delete".
   */
  it('prefers an icon tagged with the word to one that merely contains it', () => {
    const entries = [entry('voicemail'), entry('envelope', 'mail email')]

    expect(searchIcons(entries, 'mail')[0]?.name).toBe('envelope')
  })

  it('puts the shortest name first among equal matches', () => {
    const entries = [
      entry('backspace', 'delete'),
      entry('calendar-minus', 'delete'),
      entry('trash', 'delete'),
    ]

    expect(searchIcons(entries, 'delete').map((e) => e.name)).toEqual([
      'trash',
      'backspace',
      'calendar-minus',
    ])
  })

  it('returns nothing rather than everything when nothing matches', () => {
    expect(searchIcons(ENTRIES, 'qqqq')).toEqual([])
  })
})

describe('the generated catalog', () => {
  it('parses, and holds the icons the app already referenced by hand', async () => {
    const { ICON_CATALOG_SOURCE } = await import('./catalog.gen')
    const { entries, byName } = parseCatalog(ICON_CATALOG_SOURCE)

    expect(entries.length).toBeGreaterThan(1400)

    for (const name of ['star', 'trash', 'envelope-simple', 'map-pin']) {
      expect(byName.get(name)?.body).toContain('<path')
    }
  })

  it('has a glyph and a name for every record', async () => {
    const { ICON_CATALOG_SOURCE } = await import('./catalog.gen')
    const { entries } = parseCatalog(ICON_CATALOG_SOURCE)

    const broken = entries.filter(
      (icon) => icon.name === '' || !icon.body.startsWith('<'),
    )

    expect(broken).toEqual([])
  })
})
