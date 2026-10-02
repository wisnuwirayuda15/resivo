import { describe, expect, it } from "vitest";

import { negotiateLanguage } from "./negotiate";

describe("negotiateLanguage", () => {
  it("falls back to English for no header, an empty one, or nothing supported", () => {
    expect(negotiateLanguage(undefined)).toBe("en");
    expect(negotiateLanguage(null)).toBe("en");
    expect(negotiateLanguage("")).toBe("en");
    expect(negotiateLanguage("fr, de;q=0.8")).toBe("en");
    expect(negotiateLanguage("*")).toBe("en");
  });

  it("matches the primary subtag, so a regional tag counts", () => {
    expect(negotiateLanguage("id-ID")).toBe("id");
    expect(negotiateLanguage("en-GB")).toBe("en");
  });

  it("ranks by q, then by position", () => {
    expect(negotiateLanguage("en;q=0.5, id;q=0.9")).toBe("id");
    expect(negotiateLanguage("id, en")).toBe("id");
    expect(negotiateLanguage("en, id")).toBe("en");
  });

  it("skips a language the docs lack rather than giving up", () => {
    expect(negotiateLanguage("fr, id;q=0.8")).toBe("id");
  });

  it("treats q=0 as a refusal", () => {
    expect(negotiateLanguage("id;q=0, en;q=0.1")).toBe("en");
  });

  it("ignores case and stray spaces", () => {
    expect(negotiateLanguage("  ID-id ;q=0.7 , EN;q=0.2")).toBe("id");
  });
});
