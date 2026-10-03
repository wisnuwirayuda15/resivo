import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ATS_RULE_NAMES } from "@/features/ats/types";
import { BUNDLE_LIMITS } from "@/features/bundle/format";
import { exportAdapters } from "@/features/export/adapters";
import { IMPORT_FORMATS } from "@/features/interchange/index";

import { DOCS_ROOT } from "./testing/contentFiles";

/**
 * The pages about checking, exporting and importing quote lists and limits that
 * live in code. Each test ties one to its source, in both languages, so a rule or
 * a format added without a page fails here by name.
 */

const LANGUAGES = ["en", "id"] as const;

const page = (lang: string, path: string): string =>
  readFileSync(join(DOCS_ROOT, lang, `${path}.mdx`), "utf8");

/** Rows of every table on a page, without the header and the divider. */
const tableRows = (source: string): number =>
  source.split("\n").filter((line) => line.startsWith("| ")).length -
  // One header row per table, and `| ---` dividers start with `| -`.
  source.split("\n").filter((line) => /^\| -/.test(line)).length * 2;

describe.each(LANGUAGES)("the usage pages in %s", (lang) => {
  it("has one row for every ATS rule", () => {
    expect(tableRows(page(lang, "checks/ats-rules"))).toBe(
      ATS_RULE_NAMES.length,
    );
  });

  it("names every export format", () => {
    const formats = page(lang, "export/export-formats");

    for (const adapter of exportAdapters) {
      expect(formats, `${lang}: ${adapter.label}`).toContain(
        `**${adapter.label}**`,
      );
      expect(formats, `${lang}: .${adapter.extension}`).toContain(
        `\`.${adapter.extension}\``,
      );
    }
  });

  it("quotes the limits a bundle is refused at", () => {
    const bundles = page(lang, "export/bundles");
    const megabytes = (bytes: number) => `${bytes / (1024 * 1024)} MB`;

    expect(bundles).toContain(megabytes(BUNDLE_LIMITS.totalBytes));
    expect(bundles).toContain(megabytes(BUNDLE_LIMITS.entryBytes));
    expect(bundles).toContain(`${BUNDLE_LIMITS.entries}`);
  });

  it("describes every kind of file an import reads", () => {
    const imports = page(lang, "export/import-formats");

    // Markdown, JSON Resume and plain text each have a section of their own.
    expect(IMPORT_FORMATS).toEqual(["markdown", "json-resume", "text"]);
    expect(imports).toContain("[#markdown]");
    expect(imports).toContain("[#json-resume]");
    expect(imports).toContain("[#text]");
  });
});
