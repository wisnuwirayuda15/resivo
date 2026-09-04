// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { domToInline } from "./domInline";

import type { InlineText } from "@/features/resume/model/document";

/**
 * `domToInline` is the write-back half of visual editing: whatever a browser
 * leaves in an edited field has to become a typed model again. These tests feed
 * it both the markup `InlineTextView` writes and the markup a browser produces
 * while someone types into it.
 */

const read = (html: string): InlineText => {
  const host = document.createElement("div");

  host.innerHTML = html;

  return domToInline(host);
};

describe("domToInline", () => {
  it("reads plain text", () => {
    expect(read("Hello")).toEqual([{ type: "text", text: "Hello" }]);
  });

  it("reads nothing from an empty field", () => {
    expect(read("")).toEqual([]);
  });

  /** The elements `InlineTextView` writes. Its output is this function's input,
   * so each has to come back as the mark it stands for. */
  it.each([
    ['<strong class="rp-strong">x</strong>', "bold"],
    ["<em>x</em>", "italic"],
    ["<s>x</s>", "strike"],
    ['<code class="rp-code">x</code>', "code"],
  ] as const)("reads %s as %s", (html, mark) => {
    expect(read(html)).toEqual([{ type: "text", text: "x", marks: [mark] }]);
  });

  /** What a browser's own bold command produces, which is not what the renderer
   * writes. Both have to mean the same thing. */
  it.each([
    ["<b>x</b>", "bold"],
    ["<i>x</i>", "italic"],
    ["<del>x</del>", "strike"],
  ] as const)("reads the presentational %s as %s", (html, mark) => {
    expect(read(html)).toEqual([{ type: "text", text: "x", marks: [mark] }]);
  });

  it("reads nested marks as one run", () => {
    expect(read("<strong><em>x</em></strong>")).toEqual([
      { type: "text", text: "x", marks: ["bold", "italic"] },
    ]);
  });

  /**
   * Marks come back in the model's order whatever order the DOM nested them in.
   * Otherwise the same formatting would serialise two ways, and a field nobody
   * touched could register as an edit.
   */
  it("orders marks the same way whichever way they nest", () => {
    expect(read("<em><strong>x</strong></em>")).toEqual(
      read("<strong><em>x</em></strong>"),
    );
  });

  it("reads a link, keeping its href", () => {
    expect(read('<a class="rp-link" href="https://a.example">go</a>')).toEqual([
      {
        type: "link",
        href: "https://a.example",
        children: [{ type: "text", text: "go" }],
      },
    ]);
  });

  it("drops a link with no text rather than keeping an unclickable one", () => {
    expect(read('<a href="https://a.example"></a>')).toEqual([]);
  });

  it("reads an icon back from the attributes the renderer wrote", () => {
    expect(
      read('<svg data-icon-name="envelope" data-icon-weight="duotone"></svg>'),
    ).toEqual([
      {
        type: "icon",
        icon: { library: "phosphor", name: "envelope", weight: "duotone" },
      },
    ]);
  });

  it("drops an icon weight this build does not know", () => {
    expect(
      read('<svg data-icon-name="envelope" data-icon-weight="wobbly"></svg>'),
    ).toEqual([
      { type: "icon", icon: { library: "phosphor", name: "envelope" } },
    ]);
  });

  /**
   * A browser splits text nodes on almost every keystroke. Without merging,
   * typing one word into a field would grow the document by a node per
   * character.
   */
  it("merges adjacent runs that carry the same marks", () => {
    expect(read("<strong>a</strong><strong>b</strong>")).toEqual([
      { type: "text", text: "ab", marks: ["bold"] },
    ]);
  });

  it("keeps adjacent runs with different marks apart", () => {
    expect(read("<strong>a</strong>b")).toEqual([
      { type: "text", text: "a", marks: ["bold"] },
      { type: "text", text: "b" },
    ]);
  });

  it("drops empty runs", () => {
    expect(read("<strong></strong>text")).toEqual([
      { type: "text", text: "text" },
    ]);
  });

  /** These are single-line print fields; a hard break would survive into the
   * PDF as a gap with no visible cause. */
  it("turns a line break into a space", () => {
    expect(read("a<br>b")).toEqual([{ type: "text", text: "a b" }]);
  });

  /**
   * The rule for anything the model has no room for: keep the words, lose the
   * formatting. A missing mark is visible and fixable; a missing sentence is
   * not.
   */
  it("keeps the text of an element it does not understand", () => {
    expect(read("<div><span>kept</span></div>")).toEqual([
      { type: "text", text: "kept" },
    ]);
  });

  it("reads a whole field of mixed content", () => {
    expect(
      read(
        'Led <strong class="rp-strong">three</strong> teams at ' +
          '<a class="rp-link" href="https://x.example">X</a>',
      ),
    ).toEqual([
      { type: "text", text: "Led " },
      { type: "text", text: "three", marks: ["bold"] },
      { type: "text", text: " teams at " },
      {
        type: "link",
        href: "https://x.example",
        children: [{ type: "text", text: "X" }],
      },
    ]);
  });
});
