import { describe, expect, it } from "vitest";

import { RANGE_DASH, formatDateRange, parseDatePoint } from "./dates";

describe("parseDatePoint", () => {
  it("recognises the machine-readable forms", () => {
    expect(parseDatePoint("2021")).toEqual({ kind: "year", year: 2021 });
    expect(parseDatePoint("2021-03")).toEqual({
      kind: "month",
      year: 2021,
      month: 3,
    });
    // The day is read and dropped, the paper never prints it.
    expect(parseDatePoint("2021-03-15")).toEqual({
      kind: "month",
      year: 2021,
      month: 3,
    });
  });

  it("treats everything else as text", () => {
    expect(parseDatePoint("Summer 2019")).toEqual({ kind: "text" });
    expect(parseDatePoint("")).toEqual({ kind: "text" });
    expect(parseDatePoint("2021-13")).toEqual({ kind: "text" });
    expect(parseDatePoint("2021-00")).toEqual({ kind: "text" });
  });

  it("ignores surrounding whitespace", () => {
    expect(parseDatePoint("  2021-03 ")).toEqual({
      kind: "month",
      year: 2021,
      month: 3,
    });
  });
});

describe("formatDateRange", () => {
  it("formats a machine-readable range", () => {
    expect(formatDateRange({ start: "2021-03", end: "2024-08" }, "en")).toBe(
      `Mar 2021 ${RANGE_DASH} Aug 2024`,
    );
  });

  it("prints Present for a current role and ignores a stale end date", () => {
    // `current` winning over `end` is the model's rule, so ticking the box never
    // requires clearing the old end date first.
    expect(
      formatDateRange(
        { start: "2021-03", end: "2024-08", current: true },
        "en",
      ),
    ).toBe(`Mar 2021 ${RANGE_DASH} Present`);
  });

  it("writes the ongoing end in the document's language", () => {
    // The one word on the paper the app supplies rather than the user. Before
    // the locale could be set at all, this was always English, next to month
    // names that were not.
    expect(formatDateRange({ start: "2021-03", current: true }, "id")).toBe(
      `Mar 2021 ${RANGE_DASH} Sekarang`,
    );
  });

  it("accepts a year on its own", () => {
    expect(formatDateRange({ start: "2019", end: "2021" }, "en")).toBe(
      `2019 ${RANGE_DASH} 2021`,
    );
  });

  it("passes free text through, because resumes really do say this", () => {
    expect(
      formatDateRange({ start: "Summer 2019", end: "Autumn 2019" }, "en"),
    ).toBe(`Summer 2019 ${RANGE_DASH} Autumn 2019`);
  });

  it("shows a single point without a dangling dash", () => {
    expect(formatDateRange({ start: "2021-03" }, "en")).toBe("Mar 2021");
    expect(formatDateRange({ end: "2021-03" }, "en")).toBe("Mar 2021");
  });

  it("returns nothing when there is nothing to show", () => {
    // An empty string lets the caller omit the element rather than render an
    // empty box that still occupies space on the page.
    expect(formatDateRange(undefined, "en")).toBe("");
    expect(formatDateRange({}, "en")).toBe("");
    expect(formatDateRange({ start: "  " }, "en")).toBe("");
  });

  it("shows an impossible month as typed rather than guessing", () => {
    expect(formatDateRange({ start: "2021-13" }, "en")).toBe("2021-13");
    expect(formatDateRange({ start: "2021-00" }, "en")).toBe("2021-00");
  });

  it("formats in UTC, so the local timezone cannot shift the month", () => {
    const january = new Date(Date.UTC(2021, 0, 1));

    // The hazard, demonstrated: the same instant is December in any timezone
    // behind UTC. A resume must not say a different month depending on where it
    // is opened, so the formatter is pinned to UTC.
    expect(
      new Intl.DateTimeFormat("en", {
        month: "short",
        year: "numeric",
        timeZone: "America/Los_Angeles",
      }).format(january),
    ).toBe("Dec 2020");

    expect(formatDateRange({ start: "2021-01" }, "en")).toBe("Jan 2021");
    expect(formatDateRange({ start: "2021-12-31" }, "en")).toBe("Dec 2021");
  });

  it("respects the document locale", () => {
    expect(formatDateRange({ start: "2021-03" }, "de")).toBe("März 2021");
  });
});
