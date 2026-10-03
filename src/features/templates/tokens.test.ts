import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { designVars } from "@/features/preview/css";

import { templateDefaults } from "./defaults";

/**
 * A `var(--paper-*)` with no declaration anywhere is invalid at computed-value
 * time, so the property silently falls back to its inherited value. That is how
 * `--paper-ink-head` (a typo for `--paper-heading`) left subheadings and table
 * headers ignoring the Style tab's "Headings" colour with nothing failing.
 * Every token the stylesheets read has to be declared by the stylesheets or
 * written by `designVars`.
 */
const dir = import.meta.dirname;

const sheets = readdirSync(dir)
  .filter((file) => file.endsWith(".css"))
  .map((file) => ({ file, css: readFileSync(join(dir, file), "utf8") }));

const names = (css: string, pattern: RegExp): string[] =>
  Array.from(css.matchAll(pattern), (match) => match[1] ?? "");

const declared = new Set<string>([
  ...sheets.flatMap(({ css }) => names(css, /(--paper-[a-z0-9-]+)s*:/g)),
  ...names(designVars(templateDefaults("classic")), /(--paper-[a-z0-9-]+)s*:/g),
]);

describe("paper tokens", () => {
  it("declares every --paper-* custom property the template CSS reads", () => {
    const undeclared = sheets.flatMap(({ file, css }) =>
      names(css, /var\(\s*(--paper-[a-z0-9-]+)/g)
        .filter((name) => !declared.has(name))
        .map((name) => `${file}: ${name}`),
    );

    expect(undeclared).toEqual([]);
  });
});
