import type { DateRange } from '@/features/resume/model/document'

/**
 * Date range formatting for the paper.
 *
 * The model stores `YYYY-MM` where it can and free text where it cannot, because
 * a resume legitimately says things like "Summer 2019". So this recognises the
 * machine-readable forms, formats those for the document's locale, and passes
 * anything else through untouched — never rejecting or silently blanking what the
 * user typed.
 */

/** An en dash, the typographic separator for a span. */
export const RANGE_DASH = '–'

/** Not localized yet: the document carries a locale for date formatting, not a
 * UI language. Revisit when the app itself is translated. */
const PRESENT = 'Present'

const YEAR_ONLY = /^\d{4}$/
const YEAR_MONTH = /^(\d{4})-(\d{2})(?:-\d{2})?$/

/**
 * Formats one end of a range.
 *
 * Built and formatted in UTC throughout. `new Date('2021-03')` is parsed as UTC
 * midnight, so formatting it in a timezone behind UTC would render "Feb 2021" —
 * a resume that shows the wrong month depending on where it is opened.
 */
const formatPoint = (value: string, locale: string): string => {
  const trimmed = value.trim()

  if (trimmed === '' || YEAR_ONLY.test(trimmed)) {
    return trimmed
  }

  const match = YEAR_MONTH.exec(trimmed)

  if (match === null) {
    return trimmed
  }

  const [, yearText, monthText] = match

  if (yearText === undefined || monthText === undefined) {
    return trimmed
  }

  const month = Number(monthText)

  // A month outside 1–12 is not a date the user meant; show what they typed.
  if (month < 1 || month > 12) {
    return trimmed
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(yearText), month - 1, 1)))
}

/**
 * Renders a range as a single line, e.g. `Mar 2021 – Present`.
 *
 * Returns an empty string when there is nothing to show, so the caller can skip
 * the element entirely rather than emit an empty box that still takes up space
 * on the page.
 */
export const formatDateRange = (
  range: DateRange | undefined,
  locale: string,
): string => {
  if (range === undefined) {
    return ''
  }

  const start = formatPoint(range.start ?? '', locale)
  // `current` wins over `end` — the model's rule, so that ticking "current"
  // never requires clearing a stale end date first.
  const end =
    range.current === true ? PRESENT : formatPoint(range.end ?? '', locale)

  if (start !== '' && end !== '') {
    return `${start} ${RANGE_DASH} ${end}`
  }

  return start === '' ? end : start
}
