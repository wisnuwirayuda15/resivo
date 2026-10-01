import { parseDatePoint } from "@/features/templates/renderer/dates";

import {
  effectiveKind,
  entryLabel,
  makeIssue,
  sectionLabel,
  visibleEntries,
  visibleSections,
} from "./helpers";

import type { DatePoint } from "@/features/templates/renderer/dates";
import type { DateRange } from "@/features/resume/model/document";
import type { AtsIssue, AtsRule } from "../types";

/**
 * Dates on entries.
 *
 * An entry's range is `YYYY`, `YYYY-MM` or free text, and `current` overrides
 * the end. A system that reads dates reads the first two and gives up on the
 * third, which is what these rules are about.
 */

/**
 * How long a gap between two jobs has to be before it is worth a mention. Six
 * months is the length at which a recruiter reading a timeline starts to ask,
 * and anything shorter is a normal change of job.
 */
const GAP_MONTHS = 6;

const monthIndex = (point: DatePoint, edge: "start" | "end"): number | null => {
  switch (point.kind) {
    case "text":
      return null;
    case "month":
      return point.year * 12 + (point.month - 1);
    case "year":
      // A year on its own is read as the whole year: January when it opens a
      // range and December when it closes one, so "2019 to 2019" is not
      // backwards and "2019 to 2020" has no gap in it.
      return point.year * 12 + (edge === "start" ? 0 : 11);
  }
};

const present = (value: string | undefined): string => value?.trim() ?? "";

/** The range's end as a month, or `Infinity` for a current role, or `null`. */
const endOf = (range: DateRange): number | null => {
  if (range.current === true) {
    return Infinity;
  }

  const end = present(range.end);

  return end === "" ? null : monthIndex(parseDatePoint(end), "end");
};

const startOf = (range: DateRange): number | null => {
  const start = present(range.start);

  return start === "" ? null : monthIndex(parseDatePoint(start), "start");
};

const dateOrder: AtsRule = (document) =>
  visibleEntries(document).flatMap(({ section, entry }) => {
    const range = entry.dateRange;

    if (range === undefined) {
      return [];
    }

    const start = startOf(range);
    const end = endOf(range);

    return start !== null && end !== null && end < start
      ? [
          makeIssue("ats.date-order", entry.id, {
            severity: "error",
            message: "The end date is before the start date.",
            why: "A parser that reads dates computes tenure from them, and a negative span is dropped or read as a typo.",
            where: `${sectionLabel(section)}, ${entryLabel(entry)}`,
          }),
        ]
      : [];
  });

const dateStartMissing: AtsRule = (document) =>
  visibleEntries(document).flatMap(({ section, entry }) => {
    const range = entry.dateRange;

    if (range === undefined) {
      return [];
    }

    const hasEnd = present(range.end) !== "" || range.current === true;

    return present(range.start) === "" && hasEnd
      ? [
          makeIssue("ats.date-start-missing", entry.id, {
            severity: "warning",
            message: "A date range has an end and no start.",
            why: "With one end missing a system cannot work out how long the role lasted, so it often records none.",
            where: `${sectionLabel(section)}, ${entryLabel(entry)}`,
          }),
        ]
      : [];
  });

const dateUnparsed: AtsRule = (document) =>
  visibleEntries(document).flatMap(({ section, entry }) => {
    const range = entry.dateRange;

    if (range === undefined) {
      return [];
    }

    // The end is ignored while `current` is set, so a stale free-text end under
    // it is not something the reader of the paper ever sees.
    const points = [
      present(range.start),
      range.current === true ? "" : present(range.end),
    ].filter((value) => value !== "");

    return points.some((value) => parseDatePoint(value).kind === "text")
      ? [
          makeIssue("ats.date-unparsed", entry.id, {
            severity: "warning",
            message: "A date is written in words, not as a year or a month.",
            why: "Systems read dates like 2021 or 2021-03 and give up on free text such as Summer 2019, so the role arrives undated.",
            where: `${sectionLabel(section)}, ${entryLabel(entry)}`,
          }),
        ]
      : [];
  });

/**
 * Within one section, not across the document. A resume that dates its jobs to
 * the month and its degree to the year is being consistent about each, and the
 * example resume does exactly that.
 */
const dateFormatMixed: AtsRule = (document) =>
  visibleSections(document).flatMap((section) => {
    const kinds = new Set<string>();

    for (const block of section.blocks) {
      if (block.kind !== "entry" || block.dateRange === undefined) {
        continue;
      }

      const values = [
        present(block.dateRange.start),
        block.dateRange.current === true ? "" : present(block.dateRange.end),
      ];

      for (const value of values) {
        const point = parseDatePoint(value);

        if (value !== "" && point.kind !== "text") {
          kinds.add(point.kind);
        }
      }
    }

    return kinds.has("year") && kinds.has("month")
      ? [
          makeIssue("ats.date-format-mixed", section.id, {
            severity: "info",
            message: `${sectionLabel(section)} mixes years and months.`,
            why: "Dates written the same way throughout read as one timeline, and a system compares them more reliably.",
            where: sectionLabel(section),
          }),
        ]
      : [];
  });

const dateGap: AtsRule = (document) => {
  const jobs = visibleEntries(document).flatMap(({ section, entry }) => {
    if (
      effectiveKind(section) !== "experience" ||
      entry.dateRange === undefined
    ) {
      return [];
    }

    return [
      {
        section,
        entry,
        start: startOf(entry.dateRange),
        end: endOf(entry.dateRange),
      },
    ];
  });

  // A job with a start and no end could be over or ongoing, and guessing would
  // report a gap that is not there. Better to say nothing about the timeline.
  const dated = jobs.filter((job) => job.start !== null);

  if (dated.some((job) => job.end === null)) {
    return [];
  }

  dated.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

  const issues: Array<AtsIssue> = [];
  let latestEnd = -Infinity;

  for (const job of dated) {
    const start = job.start ?? 0;

    if (latestEnd !== -Infinity && start - latestEnd > GAP_MONTHS) {
      issues.push(
        makeIssue("ats.date-gap", job.entry.id, {
          severity: "info",
          message: `There is a gap of about ${start - latestEnd} months before this role.`,
          why: "A recruiter reading the timeline will ask about a long gap, and a line saying what it was answers it first.",
          where: `${sectionLabel(job.section)}, ${entryLabel(job.entry)}`,
        }),
      );
    }

    latestEnd = Math.max(latestEnd, job.end ?? start);
  }

  return issues;
};

export const dateRules: Array<AtsRule> = [
  dateOrder,
  dateStartMissing,
  dateUnparsed,
  dateFormatMixed,
  dateGap,
];
