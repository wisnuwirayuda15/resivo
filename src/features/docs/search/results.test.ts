import { describe, expect, it } from "vitest";

import { plainText, toView, toViews } from "./results";

import type { SortedResult } from "fumadocs-core/search";

const hit = (over: Partial<SortedResult>): SortedResult => ({
  id: "1",
  url: "/en/docs/format/overview",
  type: "page",
  content: "The shape of the file",
  ...over,
});

describe("plainText", () => {
  it("removes the engine's highlight markup and tidies whitespace", () => {
    expect(plainText("a <mark>direct</mark>ive\n  here")).toBe(
      "a directive here",
    );
  });

  it("never lets another tag through as markup", () => {
    // Left as text for React to escape; only <mark> is the engine's own.
    expect(plainText("<img src=x onerror=alert(1)>")).toBe(
      "<img src=x onerror=alert(1)>",
    );
  });
});

describe("toView", () => {
  it("shows a page as its title", () => {
    expect(toView(hit({}))).toEqual({
      id: "1",
      kind: "page",
      label: "The shape of the file",
      description: undefined,
      href: "/en/docs/format/overview",
    });
  });

  it("shows a heading or a passage with the place it is in", () => {
    const view = toView(
      hit({
        type: "heading",
        content: "<mark>What</mark> a section holds",
        url: "/en/docs/format/overview#sections",
        breadcrumbs: ["Format", "The shape of the file"],
      }),
    );

    expect(view.label).toBe("What a section holds");
    expect(view.description).toBe("Format / The shape of the file");
    expect(view.href).toBe("/en/docs/format/overview#sections");
  });
});

describe("toViews", () => {
  it("treats no answer yet and the engine's empty marker as nothing to show", () => {
    expect(toViews(undefined)).toEqual([]);
    expect(toViews("empty")).toEqual([]);
  });

  it("keeps the engine's order", () => {
    const views = toViews([hit({ id: "a" }), hit({ id: "b" })]);

    expect(views.map((view) => view.id)).toEqual(["a", "b"]);
  });
});
