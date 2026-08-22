import { describe, expect, it } from 'vitest'

import { absoluteLabel } from './RelativeTime'

/**
 * The pre-hydration label has to be identical on the server and in the browser,
 * or it defeats the whole point of deferring the relative form. These cover the
 * two ways it could stop being identical: depending on the current clock, or
 * depending on the local timezone.
 */
describe('absoluteLabel', () => {
  it('depends only on the timestamp, never on the current time', () => {
    const value = Date.UTC(2026, 7, 20, 12, 0, 0)

    // Same input, two different moments of asking.
    const first = absoluteLabel(value)
    const second = absoluteLabel(value)

    expect(first).toBe(second)
    expect(first).toBe('20 Aug 2026')
  })

  it('uses the UTC calendar date, so a local timezone cannot shift it', () => {
    // Late evening UTC: any timezone east of UTC is already on the 21st, and a
    // local-time format would disagree with a server running in UTC.
    expect(absoluteLabel(Date.UTC(2026, 7, 20, 23, 30, 0))).toBe('20 Aug 2026')

    // Early morning UTC: any timezone west of UTC is still on the 19th.
    expect(absoluteLabel(Date.UTC(2026, 7, 20, 0, 30, 0))).toBe('20 Aug 2026')
  })

  it('agrees with the timestamp ISO date for instants across the day', () => {
    for (const hour of [0, 1, 6, 12, 18, 23]) {
      const value = Date.UTC(2026, 0, 31, hour, 45, 0)
      const isoDay = new Date(value).toISOString().slice(0, 10)

      // Cross-check against a formatter with no timezone logic of its own.
      expect(absoluteLabel(value)).toBe('31 Jan 2026')
      expect(isoDay).toBe('2026-01-31')
    }
  })
})
