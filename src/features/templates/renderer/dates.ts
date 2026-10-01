import { presentLabel } from "./locales";

import type { DateRange } from "@/features/resume/model/document";

/**
 * Date range formatting for the paper.
 *
 * The model stores `YYYY-MM` where it can and free text where it cannot, because
 * a resume legitimately says things like "Summer 2019". So this recognises the
 * machine-readable forms, formats those for the document's locale, and passes
 * anything else through untouched, never rejecting or silently blanking what the
 * user typed.
 */

/** An en dash, the typographic separator for a span. */
export const RANGE_DASH = "–";

const YEAR_ONLY = /^\d{4}$/;
const YEAR_MONTH = /^(\d{4})-(\d{2})(?:-\d{2})?$/;

/**
 * What one end of a range turned out to be.
 *
 * `text` is everything the formatter passes through untouched: "Summer 2019", a
 * month outside 1 to 12, an empty string. A day, when one is given, is read and
 * dropped, because the paper never prints it.
 */
export type DatePoint =
  | { kind: "year"; year: number }
  | { kind: "month"; year: number; month: number }
  | { kind: "text" };

/**
 * Classifies one end of a range.
 *
 * The single place the model's machine-readable date forms are recognised, so
 * the formatter and anything that reasons about dates (the ATS checker) cannot
 * disagree about what counts as one.
 */
export const parseDatePoint = (value: string): DatePoint => {
  const trimmed = value.trim();

  if (YEAR_ONLY.test(trimmed)) {
    return { kind: "year", year: Number(trimmed) };
  }

  const match = YEAR_MONTH.exec(trimmed);

  if (match === null) {
    return { kind: "text" };
  }

  const [, yearText, monthText] = match;

  if (yearText === undefined || monthText === undefined) {
    return { kind: "text" };
  }

  const month = Number(monthText);

  // A month outside 1 to 12 is not a date the user meant; it stays text.
  if (month < 1 || month > 12) {
    return { kind: "text" };
  }

  return { kind: "month", year: Number(yearText), month };
};

/**
 * Formats one end of a range.
 *
 * Built and formatted in UTC throughout. `new Date('2021-03')` is parsed as UTC
 * midnight, so formatting it in a timezone behind UTC would render "Feb 2021",
 * a resume that shows the wrong month depending on where it is opened.
 */
const formatPoint = (value: string, locale: string): string => {
  const trimmed = value.trim();
  const point = parseDatePoint(trimmed);

  // A year, free text or a month that is not one: show what they typed.
  if (point.kind !== "month") {
    return trimmed;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(point.year, point.month - 1, 1)));
};

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
    return "";
  }

  const start = formatPoint(range.start ?? "", locale);
  // `current` wins over `end`, the model's rule, so that ticking "current"
  // never requires clearing a stale end date first.
  // The one word on the paper this app supplies rather than the user, so it
  // follows the document's language along with the month names beside it.
  const end =
    range.current === true
      ? presentLabel(locale)
      : formatPoint(range.end ?? "", locale);

  if (start !== "" && end !== "") {
    return `${start} ${RANGE_DASH} ${end}`;
  }

  return start === "" ? end : start;
};
