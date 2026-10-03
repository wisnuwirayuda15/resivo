import { describe, expect, it } from "vitest";

import { localizeMarkdownLinks, markdownHref, parseMarkdownPath } from "./urls";

describe("markdownHref", () => {
  it("adds .md to a page and names the home index", () => {
    expect(markdownHref("en", ["format", "overview"])).toBe(
      "/en/docs/format/overview.md",
    );
    expect(markdownHref("id")).toBe("/id/docs/index.md");
  });
});

describe("parseMarkdownPath", () => {
  it("reads the language and slugs", () => {
    expect(parseMarkdownPath("/en/docs/format/overview.md")).toEqual({
      lang: "en",
      slugs: ["format", "overview"],
    });
  });

  it("treats a trailing index as the folder itself", () => {
    expect(parseMarkdownPath("/en/docs/index.md")).toEqual({
      lang: "en",
      slugs: [],
    });
    expect(parseMarkdownPath("/id/docs/format/index.md")).toEqual({
      lang: "id",
      slugs: ["format"],
    });
  });

  it("returns null for anything that is not a docs Markdown path", () => {
    expect(parseMarkdownPath("/en/docs/format/overview")).toBeNull();
    expect(parseMarkdownPath("/en/about.md")).toBeNull();
    expect(parseMarkdownPath("/llms.txt")).toBeNull();
  });

  it("still parses a language that is not supported", () => {
    expect(parseMarkdownPath("/xx/docs/a.md")?.lang).toBe("xx");
  });
});

describe("localizeMarkdownLinks", () => {
  it("fills in the language and points at the Markdown", () => {
    expect(
      localizeMarkdownLinks("See [the shape](/docs/format/overview).", "id"),
    ).toBe("See [the shape](/id/docs/format/overview.md).");
  });

  it("keeps a hash, drops a query, and maps the home to its index", () => {
    expect(
      localizeMarkdownLinks("[a](/docs/x#y) [b](/docs) [c](/docs/z?q=1)", "en"),
    ).toBe("[a](/en/docs/x.md#y) [b](/en/docs/index.md) [c](/en/docs/z.md)");
  });

  it("makes the address absolute when given an origin", () => {
    expect(
      localizeMarkdownLinks("[a](/en/docs/x)", "en", "https://resivo.test"),
    ).toBe("[a](https://resivo.test/en/docs/x.md)");
  });

  it("leaves other links, anchors and external addresses alone", () => {
    const text = "[a](#local) [b](https://example.com/docs/x) [c](/templates)";

    expect(localizeMarkdownLinks(text, "en")).toBe(text);
  });

  it("does not touch fenced code", () => {
    const text = ["```md", "[a](/docs/x)", "```", "[b](/docs/x)"].join("\n");

    expect(localizeMarkdownLinks(text, "en")).toBe(
      ["```md", "[a](/docs/x)", "```", "[b](/en/docs/x.md)"].join("\n"),
    );
  });

  it("keeps a longer fence open until a matching one closes it", () => {
    const text = ["````md", "```", "[a](/docs/x)", "```", "````"].join("\n");

    expect(localizeMarkdownLinks(text, "en")).toBe(text);
  });
});
