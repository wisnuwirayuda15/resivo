import { describe, expect, it } from "vitest";

import {
  docsHref,
  isDocsLanguage,
  parseDocsPath,
  switchLanguageHref,
} from "./paths";

describe("docsHref", () => {
  it("writes the home and a nested page without a trailing slash", () => {
    expect(docsHref("en")).toBe("/en/docs");
    expect(docsHref("id", ["format", "overview"])).toBe(
      "/id/docs/format/overview",
    );
  });
});

describe("parseDocsPath", () => {
  it("reads the language and the slugs", () => {
    expect(parseDocsPath("/en/docs")).toEqual({ lang: "en", slugs: [] });
    expect(parseDocsPath("/id/docs/format/overview")).toEqual({
      lang: "id",
      slugs: ["format", "overview"],
    });
  });

  it("tolerates a trailing slash", () => {
    expect(parseDocsPath("/en/docs/format/")).toEqual({
      lang: "en",
      slugs: ["format"],
    });
  });

  it("still parses a language the docs do not have, so a caller can 404 it", () => {
    expect(parseDocsPath("/xx/docs/a")).toEqual({ lang: "xx", slugs: ["a"] });
  });

  it("returns null for anything that is not a docs path", () => {
    expect(parseDocsPath("/resumes")).toBeNull();
    expect(parseDocsPath("/docs/format")).toBeNull();
    expect(parseDocsPath("/en/documents")).toBeNull();
  });
});

describe("switchLanguageHref", () => {
  it("keeps the page and swaps the language", () => {
    expect(switchLanguageHref("/en/docs/format/overview", "id")).toBe(
      "/id/docs/format/overview",
    );
    expect(switchLanguageHref("/id/docs", "en")).toBe("/en/docs");
  });

  it("leaves a path that is not a docs path alone", () => {
    expect(switchLanguageHref("/resumes", "id")).toBe("/resumes");
  });
});

describe("isDocsLanguage", () => {
  it("accepts the supported languages and nothing else", () => {
    expect(isDocsLanguage("en")).toBe(true);
    expect(isDocsLanguage("id")).toBe(true);
    expect(isDocsLanguage("xx")).toBe(false);
    expect(isDocsLanguage(undefined)).toBe(false);
  });
});
