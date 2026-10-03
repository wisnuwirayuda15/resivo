import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES } from "@/features/assets/readImage";
import { MAX_FONT_BYTES } from "@/features/assets/readFont";
import { sanitizeCss } from "@/features/css/sanitize";
import { designVars } from "@/features/preview/css";
import { ICON_WEIGHTS, TEMPLATE_IDS } from "@/features/resume/model/document";
import { templateDefaults } from "@/features/templates/defaults";

import { DOCS_ROOT } from "./testing/contentFiles";

/**
 * The design pages state numbers, names and limits that live in code, and a page
 * that quotes them falls behind the first time one moves. Each test here ties a
 * sentence to the thing it describes, in both languages, so the failure names the
 * page that needs rewriting.
 */

const LANGUAGES = ["en", "id"] as const;

const page = (lang: string, slug: string): string =>
  readFileSync(join(DOCS_ROOT, lang, "design", `${slug}.mdx`), "utf8");

const SRC = resolve(import.meta.dirname, "..", "..");

const source = (path: string): string => readFileSync(join(SRC, path), "utf8");

const MEGABYTE = 1024 * 1024;

describe("the design pages", () => {
  describe.each(LANGUAGES)("in %s", (lang) => {
    it("names every template, and aims a rule at each by its id", () => {
      const templates = page(lang, "templates");
      const reference = page(lang, "css-class-reference");

      for (const id of TEMPLATE_IDS) {
        const name = `${id[0]?.toUpperCase()}${id.slice(1)}`;

        expect(templates, `${lang}: templates page, ${name}`).toContain(
          `**${name}**`,
        );
        expect(reference, `${lang}: class reference, ${id}`).toContain(
          `\`${id}\``,
        );
      }
    });

    it("lists every CSS variable the Style tab writes", () => {
      const tokens = page(lang, "design-tokens");
      const written = [
        ...designVars(templateDefaults("classic")).matchAll(/--paper-[\w-]+/g),
      ].map((match) => match[0]);

      expect(written.length).toBeGreaterThan(20);

      for (const name of new Set(written)) {
        // `colors.rule` has no control: the Rules group sets `rules.color`,
        // which is `--paper-rule-color`, and that is the one a rule reads.
        if (name === "--paper-rule") {
          continue;
        }

        expect(tokens, `${lang}: ${name}`).toContain(`\`${name}\``);
      }
    });

    it("documents only class names the paper really uses", () => {
      const reference = page(lang, "css-class-reference");
      const named = new Set(
        [...reference.matchAll(/`\.(rp-[a-z-]+)/g)].map((match) => match[1]),
      );

      expect(named.size).toBeGreaterThan(30);

      // The markup, and not the stylesheet: a rule in base.css can outlive the
      // element it styled, which is how `rp-figure-caption` nearly shipped.
      const markup = [
        source("features/templates/renderer/defaults.tsx"),
        source("features/templates/renderer/inline.tsx"),
        source("features/preview/PreviewPaper.tsx"),
      ].join("\n");

      for (const name of named) {
        expect(markup, `${lang}: .${name} is not drawn`).toContain(name);
      }
    });

    it("lists the at-rules the sanitizer allows, and the ones it refuses", () => {
      const limits = page(lang, "css-limits");

      for (const name of [
        "media",
        "supports",
        "container",
        "scope",
        "keyframes",
        "font-face",
        "counter-style",
        "property",
        "font-feature-values",
      ]) {
        expect(limits, `${lang}: @${name}`).toContain(`\`@${name}\``);

        const asRules = sanitizeCss(`@${name} x { a { color: red; } }`);
        const asDeclarations = sanitizeCss(`@${name} x { color: red; }`);

        // Allowed means the name is never reported as unsupported, in whichever
        // shape its block takes.
        for (const result of [asRules, asDeclarations]) {
          expect(
            result.warnings.map((warning) => warning.message),
            `${lang}: @${name}`,
          ).not.toContainEqual(
            expect.stringContaining("is not supported here"),
          );
        }
      }

      for (const name of [
        "import",
        "page",
        "layer",
        "charset",
        "namespace",
        "document",
      ]) {
        expect(limits, `${lang}: @${name}`).toContain(`\`@${name}\``);
        expect(
          sanitizeCss(`@${name} x { a { color: red; } }`).warnings.length,
          `${lang}: @${name} should be refused`,
        ).toBeGreaterThan(0);
      }
    });

    it("quotes the upload limits as they are", () => {
      const assets = page(lang, "images-and-fonts");

      expect(assets).toContain(`${MAX_IMAGE_BYTES / MEGABYTE} MB`);
      expect(assets).toContain(`${MAX_FONT_BYTES / MEGABYTE} MB`);
    });

    it("quotes the sizes a template and a letter start from", () => {
      const templates = page(lang, "templates");
      const compact = templateDefaults("compact");
      const technical = templateDefaults("technical");
      const letter = templateDefaults("classic", "coverLetter");

      expect(templates).toContain(`${compact.typography.baseSize}pt`);
      expect(templates).toContain(`${compact.paper.margin.top}in`);
      expect(templates).toContain(`${technical.typography.baseSize}pt`);
      expect(templates).toContain(`${letter.typography.baseSize}pt`);
      expect(templates).toContain(`${letter.typography.lineHeight}`);
    });

    it("names every icon weight", () => {
      const icons = page(lang, "icons");

      for (const weight of ICON_WEIGHTS) {
        expect(icons, `${lang}: ${weight}`).toContain(`\`${weight}\``);
      }
    });
  });
});
