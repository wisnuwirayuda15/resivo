import { describe, expect, it } from "vitest";

import { sectionKindFromTitle } from "@/features/markdown/spec";

import { SECTION_KINDS } from "./document";
import { sectionTitle } from "./sectionTitles";

describe("sectionTitle", () => {
  it.each(["en", "id"])("names every kind in %s", (locale) => {
    for (const kind of SECTION_KINDS) {
      expect(sectionTitle(kind, locale).trim(), `${locale}:${kind}`).not.toBe(
        "",
      );
    }
  });

  it.each(["en", "id"])(
    "uses titles in %s that read back as the kind they name",
    (locale) => {
      // The reason the titles are not free text: a title the Markdown reader
      // does not recognise would make the section custom the next time the
      // document is parsed, and a template lays a section out by kind.
      for (const kind of SECTION_KINDS) {
        if (kind === "custom") {
          continue;
        }

        expect(
          sectionKindFromTitle(sectionTitle(kind, locale)),
          `${locale}:${kind}`,
        ).toBe(kind);
      }
    },
  );

  it("matches the language subtag, so a regional tag is its language", () => {
    expect(sectionTitle("experience", "id-ID")).toBe("Pengalaman");
    expect(sectionTitle("experience", "ID")).toBe("Pengalaman");
  });

  it("is English for a language it has no titles for", () => {
    expect(sectionTitle("experience", "de")).toBe("Experience");
    expect(sectionTitle("experience", "")).toBe("Experience");
  });
});
