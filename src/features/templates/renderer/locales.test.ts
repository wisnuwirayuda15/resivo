import { describe, expect, it } from "vitest";

import { DOCUMENT_LOCALES, presentLabel } from "./locales";

describe("presentLabel", () => {
  it("matches on the language subtag, so a region does not lose the word", () => {
    expect(presentLabel("pt-BR")).toBe("Presente");
    expect(presentLabel("en-GB")).toBe("Present");
    expect(presentLabel("ZH_HANT")).toBe("至今");
  });

  it("falls back to English rather than to nothing", () => {
    // Blank would read as a missing end date, which says something else and
    // untrue. A tag from a Markdown import or a restored backup can be anything.
    expect(presentLabel("cy")).toBe("Present");
    expect(presentLabel("")).toBe("Present");
  });
});

describe("DOCUMENT_LOCALES", () => {
  it("offers only languages with a word for an ongoing role", () => {
    // The list is the set the app can render completely: a locale without its
    // word would print English inside an otherwise translated line, so the
    // picker must not offer one.
    for (const entry of DOCUMENT_LOCALES) {
      expect(entry.present.trim()).not.toBe("");
      expect(presentLabel(entry.value)).toBe(entry.present);
    }
  });

  it("names each language once", () => {
    const tags = DOCUMENT_LOCALES.map((entry) => entry.value);

    expect(new Set(tags).size).toBe(tags.length);
  });

  it("formats a month in each of them, which is the point of the tag", () => {
    for (const entry of DOCUMENT_LOCALES) {
      expect(
        new Intl.DateTimeFormat(entry.value, {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2021, 2, 1))),
      ).not.toBe("");
    }
  });
});
