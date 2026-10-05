// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { produce } from "immer";
import { describe, expect, it } from "vitest";

import { createEmptyDocument } from "@/features/resume/model/index";
import { resolveTemplate } from "@/features/templates/registry";
import { TEMPLATE_IDS } from "@/features/resume/model/document";

import { documentFlow } from "./flow";
import { renderFlow } from "./renderFlow";

import type {
  RenderContext,
  RenderMode,
} from "@/features/templates/renderer/types";
import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * The invariant that makes the visual editor safe to switch on.
 *
 * Page breaks come from measured heights, and the measuring pass renders the
 * same elements the paged pass does. If edit mode changed the rendered markup in
 * a way that could affect layout, turning the editor on would move the breaks of
 * a document the user had already laid out.
 *
 * It adds exactly one thing: a `span.rp-editable` around each run of text. A
 * `span` is an inline box with no layout of its own, and `frame.css` gives it
 * only `outline`, `background` and `cursor`, none of which can change a height.
 * This test holds the structural half: unwrap those spans and the markup is
 * identical to view mode.
 *
 * The editing chrome (handles, drop rules) is not covered here because it is
 * not rendered here. It lives in the paged pass only, which is never measured.
 */

const sample = (): ResumeDocument =>
  produce(createEmptyDocument(), (draft) => {
    draft.content.header.name = [{ type: "text", text: "Avery Chen" }];
    draft.content.header.headline = [
      { type: "text", text: "Staff engineer" },
      { type: "text", text: " - infra", marks: ["italic"] },
    ];
    draft.content.header.contacts = [
      {
        id: "c1",
        label: [{ type: "text", text: "ada@example.com" }],
        icon: { library: "phosphor", name: "envelope" },
      },
      {
        id: "c2",
        label: [{ type: "text", text: "github.com/ada" }],
        href: "https://github.com/ada",
      },
    ];

    draft.content.sections = [
      {
        id: "s1",
        kind: "experience",
        title: [{ type: "text", text: "Experience" }],
        blocks: [
          {
            id: "e1",
            kind: "entry",
            title: [{ type: "text", text: "Staff engineer" }],
            subtitle: [{ type: "text", text: "Northwind" }],
            location: [{ type: "text", text: "Remote" }],
            summary: [{ type: "text", text: "Led the platform team." }],
            dateRange: { start: "2021-03", end: "2024-08" },
            bullets: [
              [{ type: "text", text: "Cut deploy time in half" }],
              [{ type: "text", text: "Ran the on-call rotation" }],
            ],
          },
          {
            id: "p1",
            kind: "paragraph",
            text: [
              { type: "text", text: "A paragraph with " },
              { type: "text", text: "bold", marks: ["bold"] },
            ],
          },
          {
            id: "b1",
            kind: "bulletList",
            items: [
              {
                text: [{ type: "text", text: "One" }],
                list: {
                  ordered: true,
                  items: [{ text: [{ type: "text", text: "Nested" }] }],
                },
              },
              { text: [{ type: "text", text: "Done" }], checked: true },
            ],
          },
          {
            id: "h1",
            kind: "heading",
            level: 3,
            text: [{ type: "text", text: "A subheading" }],
          },
          {
            id: "q1",
            kind: "quote",
            paragraphs: [[{ type: "text", text: "A quoted line." }]],
          },
          { id: "c1", kind: "code", language: "go", code: "func main() {}" },
          {
            id: "tb1",
            kind: "table",
            head: [[{ type: "text", text: "Area" }]],
            rows: [[[{ type: "text", text: "Web" }]]],
            align: ["center"],
          },
          { id: "t1", kind: "tagList", tags: ["Go", "Rust"] },
          {
            id: "i1",
            kind: "iconLabel",
            icon: { library: "phosphor", name: "map-pin" },
            label: [{ type: "text", text: "Berlin" }],
          },
          { id: "d1", kind: "divider" },
          { id: "r1", kind: "raw", markdown: "| a | b |" },
        ],
      },
    ];
  });

const markup = (
  resume: ResumeDocument,
  mode: RenderMode,
  options: { writable?: boolean } = {},
): string => {
  const writable = options.writable ?? mode === "edit";
  const context: RenderContext = {
    locale: resume.meta.locale,
    design: resume.design,
    images: new Map(),
    mode,
    ...(writable ? { apply: () => undefined } : {}),
  };

  return renderFlow(
    resume,
    resolveTemplate(resume.templateId),
    context,
    documentFlow(resume),
  )
    .map(({ node }) => renderToStaticMarkup(<>{node}</>))
    .join("");
};

/** Replaces each `span.rp-editable` with its own children, leaving everything
 * else (including any other span) exactly as it was. */
const unwrapEditable = (html: string): string => {
  const host = document.createElement("div");

  host.innerHTML = html;

  for (const span of Array.from(host.querySelectorAll("span.rp-editable"))) {
    span.replaceWith(...Array.from(span.childNodes));
  }

  return host.innerHTML;
};

/** Normalised through the same parser, so a comparison is about structure and
 * not about how React chose to serialise an attribute. */
const parsed = (html: string): string => {
  const host = document.createElement("div");

  host.innerHTML = html;

  return host.innerHTML;
};

describe("edit mode markup", () => {
  it.each(TEMPLATE_IDS)(
    "adds nothing but editable spans in the %s template",
    (templateId) => {
      const resume = produce(sample(), (draft) => {
        draft.templateId = templateId;
      });

      const view = markup(resume, "view");
      const edit = markup(resume, "edit");

      expect(edit).not.toBe(view);
      expect(edit).toContain("rp-editable");
      expect(unwrapEditable(edit)).toBe(parsed(view));
    },
  );

  it("renders print mode identically to view mode", () => {
    const resume = sample();

    expect(markup(resume, "print")).toBe(markup(resume, "view"));
  });

  /**
   * Edit mode with no way to write is not edit mode. This is what keeps an
   * export (which renders with no `apply`) free of editing markup even if it
   * asked for the wrong mode.
   */
  it("renders view markup for edit mode with no way to write", () => {
    const resume = sample();

    expect(markup(resume, "edit", { writable: false })).toBe(
      markup(resume, "view"),
    );
  });

  /** Every field the visual editor claims to edit has to actually be wrapped.
   * Counted rather than named, so adding a field to the renderer without making
   * it editable shows up here. */
  it("wraps every run of text on the page", () => {
    const edit = markup(sample(), "edit");
    const count = (edit.match(/class="rp-editable"/g) ?? []).length;

    // name, headline, two contacts, section title, entry title/subtitle/
    // dates/location/summary, two entry bullets, paragraph, three list items across
    // two levels, a subheading, a quoted paragraph, a table heading and a table
    // cell, two tags, one icon label. A code block is not counted: its content
    // is literal, so it is edited in the Markdown pane rather than on the paper.
    expect(count).toBe(23);
  });
});
