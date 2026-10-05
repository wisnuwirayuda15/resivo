import { DOCUMENT_LOCALES, presentLabel } from "./locales";

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

// ---------------------------------------------------------------------------
// Reading a range back
// ---------------------------------------------------------------------------

/** Words for "still going" that are not any language's printed form. */
const ONGOING_WORDS = ["present", "current", "now", "ongoing"];

/** A month name as `Intl` writes it, in lower case with no trailing dot. */
const monthKey = (name: string): string =>
  name.toLowerCase().replace(/\.$/, "");

/**
 * Month names to month numbers, for the document's language and English.
 *
 * Built from `Intl` rather than a table, so it reads exactly what
 * `formatDateRange` wrote (including a locale's abbreviation), in every locale
 * the app can format. English is always included because a resume in another
 * language is still often typed with English month names.
 */
const monthLookup = (locale: string): Map<string, number> => {
  const lookup = new Map<string, number>();

  for (const tag of [locale, "en"]) {
    for (const month of ["short", "long"] as const) {
      let format: Intl.DateTimeFormat;

      try {
        format = new Intl.DateTimeFormat(tag, { month, timeZone: "UTC" });
      } catch {
        // A tag `Intl` rejects has no month names to offer.
        continue;
      }

      for (let index = 0; index < 12; index += 1) {
        const name = format.format(new Date(Date.UTC(2000, index, 1)));

        if (!lookup.has(monthKey(name))) {
          lookup.set(monthKey(name), index + 1);
        }
      }
    }
  }

  return lookup;
};

/**
 * Where a typed range divides: an en or em dash with any spacing, a hyphen with a
 * space either side, or `to`. Written with code points because the em dash is not
 * allowed to appear in this tree, even as a character in a pattern.
 */
const DASHES = String.fromCharCode(0x2013, 0x2014);

const RANGE_SPLIT = new RegExp(`\\s*[${DASHES}]\\s*|\\s+-\\s+|\\s+to\\s+`, "i");

const WORD_YEAR = /^(\p{L}+)\.?\s+(\d{4})$/u;

/**
 * One typed end of a range as the model stores it.
 *
 * "Mar 2019" and "March 2019" become `2019-03`, so what is typed on the paper
 * reads back as a date and not as prose; a year and an ISO month are kept as they
 * are; and anything else ("Summer 2019") is kept verbatim, because the model
 * allows free text and discarding what someone wrote is the one wrong answer.
 */
const readPoint = (text: string, months: Map<string, number>): string => {
  const trimmed = text.trim();
  const named = WORD_YEAR.exec(trimmed);

  if (named !== null) {
    const month = months.get(monthKey(named[1] ?? ""));

    if (month !== undefined) {
      return `${named[2]}-${String(month).padStart(2, "0")}`;
    }
  }

  return trimmed;
};

/**
 * The inverse of `formatDateRange`: what a person typed over a printed range.
 *
 * Splits on an en or em dash, on a hyphen with a space either side, on `to`, or
 * on `2019-2021`, and never on the hyphen inside `2019-03`. The end counts as
 * ongoing when it is the document's word for it, any supported language's, or
 * `present`. An empty string is no range at all (`undefined`), which is how a
 * person removes the dates.
 *
 * Lenient on purpose and never lossy: a part it cannot read is stored as typed.
 * The caller should also skip this when the text is the one it printed, so that
 * opening a date and leaving it cannot rewrite `2019-03-15` as `2019-03`.
 */
export const parseDateRange = (
  text: string,
  locale: string,
): DateRange | undefined => {
  const trimmed = text.trim();

  if (trimmed === "") {
    return undefined;
  }

  const months = monthLookup(locale);
  const parts = /^\d{4}-\d{4}$/.test(trimmed)
    ? [trimmed.slice(0, 4), trimmed.slice(5)]
    : trimmed.split(RANGE_SPLIT, 2);

  const start = readPoint(parts[0] ?? "", months);
  const rawEnd = (parts[1] ?? "").trim();

  const ongoing = new Set([
    ...ONGOING_WORDS,
    presentLabel(locale).toLowerCase(),
    ...DOCUMENT_LOCALES.map((entry) => entry.present.toLowerCase()),
  ]);

  const current = ongoing.has(rawEnd.toLowerCase());
  const end = current ? "" : readPoint(rawEnd, months);

  if (start === "" && end === "" && !current) {
    return undefined;
  }

  return {
    ...(start === "" ? {} : { start }),
    ...(end === "" ? {} : { end }),
    ...(current ? { current: true } : {}),
  };
};
