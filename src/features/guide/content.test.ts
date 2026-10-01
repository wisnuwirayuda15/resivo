import { describe, expect, it } from "vitest";

import { parseDocument } from "@/features/markdown/index";
import { sanitizeCss } from "@/features/css/sanitize";
import {
  CONTACT_DIRECTIVE,
  ENTRY_DIRECTIVE,
  ICON_DIRECTIVE,
  IMAGE_DIRECTIVE,
  LABEL_DIRECTIVE,
  PAGE_BREAK_DIRECTIVE,
  TAGS_DIRECTIVE,
} from "@/features/markdown/spec";

import { SUPPORTED_LANGUAGES } from "@/lib/i18n/language";

import {
  AI_PROMPT,
  GUIDE,
  guideMarkdown,
  guideWords,
  sectionWords,
} from "./content";

/**
 * The guide has to be true.
 *
 * A syntax guide's failure mode is not being badly written, it is documenting
 * syntax the parser rejects, and nothing about writing prose would catch that.
 * So every snippet here goes through the real codec and the real sanitizer, and
 * a warning is a failure: the parser reports one for anything it could not
 * represent, which is exactly what a wrong example produces.
 *
 * The prompt is checked the other way round, against the format's own list of
 * directive names. A directive added to `markdown/spec.ts` therefore fails here
 * until someone has written it up, which is the only mechanism that keeps a
 * hand-written prompt from falling behind the thing it describes.
 */

const snippets = GUIDE.flatMap((chapter) =>
  chapter.sections.flatMap((section) =>
    section.snippet === undefined
      ? []
      : [{ id: `${chapter.id}/${section.id}`, ...section.snippet }],
  ),
);

/**
 * A snippet is an excerpt, so it is given the one thing a document must have.
 *
 * Only when it does not already open with the name, the first snippet is a
 * whole file, and a second H1 would make it a document with a heading in it.
 */
const asDocument = (code: string): string =>
  code.startsWith("# ") ? code : `# Ada Lovelace\n\n${code}\n`;

describe("the writing guide", () => {
  it("has snippets in both chapters", () => {
    expect(snippets.filter((one) => one.language === "markdown")).not.toEqual(
      [],
    );
    expect(snippets.filter((one) => one.language === "css")).not.toEqual([]);
  });

  describe("every Markdown snippet parses cleanly", () => {
    for (const snippet of snippets.filter(
      (one) => one.language === "markdown",
    )) {
      it(snippet.id, () => {
        const result = parseDocument(asDocument(snippet.code));

        expect(result.warnings).toEqual([]);
      });
    }
  });

  describe("every CSS snippet survives the sanitizer", () => {
    for (const snippet of snippets.filter((one) => one.language === "css")) {
      it(snippet.id, () => {
        const result = sanitizeCss(snippet.code);

        expect(result.warnings).toEqual([]);
        expect(result.css).not.toBe("");
      });
    }
  });

  it("reaches the whole directive vocabulary between the guide and the prompt", () => {
    // In every language: a directive is named in code, and a translation that
    // lost the name would teach a reader something that does not parse.
    for (const language of SUPPORTED_LANGUAGES) {
      const everywhere = `${guideMarkdown(language)}\n${AI_PROMPT}`;

      for (const name of [
        CONTACT_DIRECTIVE,
        ENTRY_DIRECTIVE,
        ICON_DIRECTIVE,
        IMAGE_DIRECTIVE,
        LABEL_DIRECTIVE,
        PAGE_BREAK_DIRECTIVE,
        TAGS_DIRECTIVE,
      ]) {
        expect(everywhere, `${language}: ${name}`).toContain(name);
      }
    }

    const everywhere = `${guideMarkdown()}\n${AI_PROMPT}`;

    for (const name of [
      CONTACT_DIRECTIVE,
      ENTRY_DIRECTIVE,
      ICON_DIRECTIVE,
      IMAGE_DIRECTIVE,
      LABEL_DIRECTIVE,
      PAGE_BREAK_DIRECTIVE,
      TAGS_DIRECTIVE,
    ]) {
      expect(everywhere).toContain(name);
    }
  });

  it("tells the model about every directive it may write", () => {
    // `image` is the exception, and is in the prompt as a prohibition: an image
    // id belongs to one browser's database, so a model cannot produce one.
    for (const name of [
      CONTACT_DIRECTIVE,
      ENTRY_DIRECTIVE,
      ICON_DIRECTIVE,
      LABEL_DIRECTIVE,
      PAGE_BREAK_DIRECTIVE,
      TAGS_DIRECTIVE,
    ]) {
      expect(AI_PROMPT).toContain(name);
    }

    expect(AI_PROMPT).toContain(`Do not write \`::${IMAGE_DIRECTIVE}\``);
  });

  describe.each(SUPPORTED_LANGUAGES)(
    "the copied Markdown, in %s",
    (language) => {
      const markdown = guideMarkdown(language);
      const words = guideWords(language);

      it("carries every chapter and section", () => {
        for (const chapter of GUIDE) {
          expect(markdown).toContain(`## ${words.chapters[chapter.id].title}`);

          for (const section of chapter.sections) {
            const text = sectionWords(words, chapter.id, section.id);

            // A section with no words would print its id, which is the fallback.
            expect(text.title).not.toBe(section.id);
            expect(text.body.length).toBeGreaterThan(0);
            expect(markdown).toContain(`### ${text.title}`);
          }
        }
      });

      it("closes every fence it opens", () => {
        const fences = markdown
          .split("\n")
          .filter((line) => line.startsWith("```"));

        expect(fences.length % 2).toBe(0);
        expect(fences.length).toBe(snippets.length * 2);
      });
    },
  );
});
