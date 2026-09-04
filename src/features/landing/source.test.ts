import { describe, expect, it } from 'vitest'

import { parseDocument } from '@/features/markdown/index'

import { HERO_SOURCE, sourceLineKind } from './source'

/**
 * The hero has to be true, for the same reason the guide does.
 *
 * This is the first Resivo syntax anybody sees, and the one they are most
 * likely to retype. The parser reports a warning for anything it could not
 * represent, so a warning here means the landing page is advertising syntax the
 * app does not accept.
 */
describe('the hero source', () => {
  it('parses with no warnings', () => {
    const result = parseDocument(HERO_SOURCE)

    expect(result.warnings).toEqual([])
  })

  it('produces the contacts and the entry it appears to', () => {
    const result = parseDocument(HERO_SOURCE)

    expect(result.content.header.contacts).toHaveLength(2)

    const experience = result.content.sections.find(
      (section) => section.kind === 'experience',
    )

    expect(experience?.blocks[0]?.kind).toBe('entry')
  })

  it('colours headings and directives, and leaves prose alone', () => {
    expect(sourceLineKind('# Ada Lovelace')).toBe('heading')
    expect(sourceLineKind('## Experience')).toBe('heading')
    expect(sourceLineKind('::contact[London, UK]{icon="map-pin"}')).toBe(
      'directive',
    )
    expect(sourceLineKind(':::')).toBe('directive')
    expect(sourceLineKind('Mathematician, and the first programmer')).toBe(
      'text',
    )
  })
})
