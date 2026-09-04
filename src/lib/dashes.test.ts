import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * House style, enforced rather than remembered.
 *
 * The project writes prose with hyphens and full stops. An em dash is banned
 * outright, and an en dash everywhere except the one place it is real
 * typography: the separator printed between two dates on a resume, which is
 * what an en dash is for and which a hyphen would get wrong on paper.
 *
 * A test rather than a one-off sweep, because a rule about writing is a rule
 * every future comment has to follow too, and 765 of these had already
 * accumulated before anyone counted. It runs over the working tree, so it also
 * covers Markdown, CSS and the committed codegen output.
 *
 * The characters are written as escapes so this file does not fail itself.
 */

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/** The one file allowed an en dash, and why. */
const EN_DASH_ALLOWED = "src/features/templates/renderer/dates.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");

const SKIP = new Set([
  "node_modules",
  ".git",
  ".output",
  ".nitro",
  ".vite",
  "dist",
  "test-results",
  "playwright-report",
]);

/** Text the rule applies to. Binaries and lockfiles are not prose. */
const TEXT = /\.(ts|tsx|mjs|js|css|md|html|txt|yml|yaml)$/i;

const walk = (dir: string): Array<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) {
      return [];
    }

    const full = join(dir, entry.name);

    return entry.isDirectory() ? walk(full) : [full];
  });

const files = walk(ROOT)
  .map((file) => relative(ROOT, file).replaceAll("\\", "/"))
  .filter((file) => TEXT.test(file));

const occurrences = (file: string, character: string): number => {
  const text = readFileSync(join(ROOT, file), "utf8");

  return text.split(character).length - 1;
};

describe("house style", () => {
  it("scans a real tree", () => {
    // A guard on the guard: a walk that found nothing would pass everything.
    expect(files.length).toBeGreaterThan(100);
  });

  it("has no em dash anywhere", () => {
    const offenders = files
      .map((file) => ({ file, count: occurrences(file, EM_DASH) }))
      .filter((row) => row.count > 0);

    expect(offenders).toEqual([]);
  });

  it("has an en dash only where one is printed on paper", () => {
    const offenders = files
      .filter((file) => file !== EN_DASH_ALLOWED)
      .map((file) => ({ file, count: occurrences(file, EN_DASH) }))
      .filter((row) => row.count > 0);

    expect(offenders).toEqual([]);
  });

  it("still prints an en dash between two dates", () => {
    // The exception is a fact about the resume, not a loophole: if this stops
    // being true the allowance above should go with it.
    expect(occurrences(EN_DASH_ALLOWED, EN_DASH)).toBeGreaterThan(0);
  });
});
