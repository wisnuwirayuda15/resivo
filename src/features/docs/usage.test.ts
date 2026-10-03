import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ATS_RULE_NAMES } from "@/features/ats/types";
import { BACKUP_KIND } from "@/features/backup/format";
import { BUNDLE_LIMITS } from "@/features/bundle/format";
import { exportAdapters } from "@/features/export/adapters";
import { IMPORT_FORMATS } from "@/features/interchange/index";
import { LANGUAGE_NAMES, RESOURCES } from "@/lib/i18n/language";

import { DOCS_ROOT } from "./testing/contentFiles";

/**
 * The pages about checking, exporting, importing, backing up and the tours quote
 * lists and limits that live in code. Each test ties one to its source, in both languages, so a rule or
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

describe.each(LANGUAGES)("the data and help pages in %s", (lang) => {
  it("names the backup's kind and file name as the app writes them", () => {
    const backup = page(lang, "data/backup-restore");

    expect(backup).toContain(BACKUP_KIND);
    expect(backup).toContain("resivo-backup-");
  });

  it("names every step of both tours, in the words the tour uses", () => {
    const tours = page(lang, "help/tours");
    const { library, editor } = RESOURCES[lang].onboarding;
    const steps = [...Object.values(library), ...Object.values(editor)];

    expect(steps.length).toBeGreaterThan(8);

    for (const step of steps) {
      expect(tours, `${lang}: ${step.title}`).toContain(`**${step.title}**`);
    }
  });

  it("names each interface language as the picker does", () => {
    const language = page(lang, "help/language");

    for (const name of Object.values(LANGUAGE_NAMES)) {
      expect(language, `${lang}: ${name}`).toMatch(
        new RegExp(name === "English" ? "English|Inggris" : name),
      );
    }
  });
});
