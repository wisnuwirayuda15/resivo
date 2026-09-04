// @vitest-environment happy-dom
import { produce } from "immer";
import { describe, expect, it } from "vitest";

import { createEmptyDocument } from "@/features/resume/model/index";

import { exportHtml } from "./html";

import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * The HTML export.
 *
 * Pure and synchronous (assets arrive already inlined), so it can be tested
 * without a database, which is the reason for that split. The properties worth
 * asserting are the promises the format makes: one file, no network, the same
 * page breaks as the preview, and no trace of the editor.
 */

const sample = (): ResumeDocument =>
  produce(createEmptyDocument(), (draft) => {
    draft.content.header.name = [{ type: "text", text: "Avery Chen" }];
    draft.content.sections = [
      {
        id: "s1",
        kind: "experience",
        title: [{ type: "text", text: "Experience" }],
        blocks: [
          {
            id: "p1",
            kind: "paragraph",
            text: [{ type: "text", text: "One" }],
          },
          {
            id: "p2",
            kind: "paragraph",
            text: [{ type: "text", text: "Two" }],
          },
        ],
      },
    ];
  });

const render = (
  overrides: Partial<Parameters<typeof exportHtml>[0]> = {},
): string =>
  exportHtml({
    document: sample(),
    title: "Avery Chen",
    images: new Map(),
    fonts: [],
    ...overrides,
  });

const parse = (html: string): Document =>
  new DOMParser().parseFromString(html, "text/html");

describe("exportHtml", () => {
  it("writes a complete document with the title", () => {
    const html = render();

    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(parse(html).title).toBe("Avery Chen");
  });

  it("escapes a title that contains markup", () => {
    const html = render({ title: "Avery <script>alert(1)</script>" });

    expect(html).not.toContain("<script>");
    expect(parse(html).querySelectorAll("script")).toHaveLength(0);
  });

  /**
   * The promise the format makes. A single external reference would break a file
   * meant to be opened from a mail attachment on a machine with no network.
   */
  it("references nothing outside the file", () => {
    const document_ = parse(render());

    expect(document_.querySelectorAll("link, script")).toHaveLength(0);

    for (const element of Array.from(document_.querySelectorAll("[src]"))) {
      expect(element.getAttribute("src")).toMatch(/^data:/);
    }

    expect(render()).not.toMatch(/url\(\s*['"]?https?:/i);
  });

  it("inlines an image as the data URL it was given", () => {
    const resume = produce(sample(), (draft) => {
      draft.content.sections[0]?.blocks.push({
        id: "i1",
        kind: "image",
        imageId: "img",
        alt: "A photo",
      });
    });

    const html = render({
      document: resume,
      images: new Map([
        ["img", { url: "data:image/png;base64,AAA", width: 4, height: 2 }],
      ]),
    });

    const image = parse(html).querySelector("img.rp-image");

    expect(image?.getAttribute("src")).toBe("data:image/png;base64,AAA");
    // The intrinsic ratio travels with it, so the box is right before the bytes
    // decode in the reader's browser too.
    expect(image?.getAttribute("style")).toContain("4 / 2");
  });

  it("declares a custom font from the source it was given", () => {
    const html = render({
      fonts: [
        {
          font: {
            id: "f1",
            family: "Probe",
            weight: 600,
            style: "italic",
            format: "woff2",
            size: 10,
            createdAt: 0,
          },
          url: "data:font/woff2;base64,BBB",
        },
      ],
    });

    expect(html).toContain("font-family: 'Probe'");
    expect(html).toContain("data:font/woff2;base64,BBB");
  });

  it("carries the bundled faces it is handed", () => {
    expect(
      render({ builtinFontCss: "@font-face { font-family: Bundled; }" }),
    ).toContain("font-family: Bundled");
  });

  /**
   * Export uses the breaks the preview measured. Recomputing them here is
   * impossible (pagination is a measurement and there is nothing to measure in
   * a string), so the test is that they are honoured exactly.
   */
  it("lays out the pages it is given", () => {
    const html = render({
      pages: [["header", "section:s1"], ["block:p1"], ["block:p2"]],
    });
    const pages = parse(html).querySelectorAll(".rp-page");

    expect(pages).toHaveLength(3);
    expect(pages[1]?.textContent).toContain("One");
    expect(pages[2]?.textContent).toContain("Two");
    expect(pages[1]?.textContent).not.toContain("Two");
  });

  it("falls back to one continuous page when no breaks are known", () => {
    const document_ = parse(render());

    expect(document_.querySelectorAll(".rp-page")).toHaveLength(1);
    expect(document_.body.textContent).toContain("One");
    expect(document_.body.textContent).toContain("Two");
  });

  it("ignores an id that is no longer in the document", () => {
    const html = render({ pages: [["block:p1", "block:gone"]] });

    expect(parse(html).querySelectorAll(".rp-item")).toHaveLength(1);
  });

  it("carries the template and paper size onto every page", () => {
    const resume = produce(sample(), (draft) => {
      draft.templateId = "technical";
      draft.design.paper.size = "A4";
    });

    const page = parse(render({ document: resume })).querySelector(".rp-page");

    expect(page?.getAttribute("data-template")).toBe("technical");
    expect(page?.getAttribute("data-size")).toBe("A4");
  });

  /** `print` mode and no `apply`: an export cannot carry the editor's chrome or
   * an editable field, by construction rather than by filtering. */
  it("contains no editing markup", () => {
    const html = render();

    expect(html).not.toContain("rp-editable");
    expect(html).not.toContain("rp-chrome");
    expect(html).not.toContain("contenteditable");
  });

  it("sanitizes the custom CSS on the way out", () => {
    const resume = produce(sample(), (draft) => {
      draft.customCss =
        "@import url(https://evil.example/x.css); .rp-name { color: red }";
    });

    const html = render({ document: resume });

    expect(html).not.toContain("@import");
    expect(html).toContain("color: red");
  });
});
