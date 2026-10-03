import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseDocument, serializeDocument } from "@/features/markdown/index";
import {
  CONTACT_DIRECTIVE,
  ENTRY_DIRECTIVE,
  ICON_DIRECTIVE,
  IMAGE_DIRECTIVE,
  LABEL_DIRECTIVE,
  PAGE_BREAK_DIRECTIVE,
  TAGS_DIRECTIVE,
} from "@/features/markdown/spec";
import { createSampleLetter } from "@/features/resume/sample";

import { PROMPTS_ROOT } from "./testing/contentFiles";

/**
 * The AI prompts have to be complete and true.
 *
 * They are text files in `content/prompts`, read by the docs pages that include
 * them and by nothing else, so this reads the same files. A hand-written prompt
 * falls behind the format it describes the first time a directive gains a
 * feature, and the only mechanism that notices is a test against the format's
 * own list of directive names.
 */

const resume = readFileSync(join(PROMPTS_ROOT, "resume.md"), "utf8");
const letter = readFileSync(join(PROMPTS_ROOT, "letter.md"), "utf8");

describe("the resume prompt", () => {
  it("tells the model about every directive it may write", () => {
    for (const name of [
      CONTACT_DIRECTIVE,
      ENTRY_DIRECTIVE,
      ICON_DIRECTIVE,
      LABEL_DIRECTIVE,
      PAGE_BREAK_DIRECTIVE,
      TAGS_DIRECTIVE,
    ]) {
      expect(resume).toContain(name);
    }
  });

  it("forbids the one directive a model cannot produce", () => {
    // An image id belongs to one browser's database, so it can only be guessed.
    expect(resume).toContain(`Do not write \`::${IMAGE_DIRECTIVE}\``);
  });

  it("forbids inventing facts, and ends on the hand-off", () => {
    expect(resume).toContain("Do not invent an employer");
    expect(resume.trimEnd().endsWith(":")).toBe(true);
  });
});

describe("the cover letter prompt", () => {
  it("states the letter format: a sender, contacts, and one untitled section", () => {
    expect(letter).toContain(`::${CONTACT_DIRECTIVE}[`);
    expect(letter).toContain("A line containing only `##`");
  });

  it("forbids what a letter has no use for, and inventing what the author never gave", () => {
    expect(letter).toContain(
      `Do not use \`::${ENTRY_DIRECTIVE}\`, \`::${TAGS_DIRECTIVE}\` or \`::${IMAGE_DIRECTIVE}\``,
    );
    expect(letter).toContain("Do not invent a recipient");
    expect(letter.trimEnd().endsWith(":")).toBe(true);
  });

  it("describes a document the codec reads back without a warning", () => {
    // The shape the prompt asks for is the shape the example letter has.
    expect(
      parseDocument(serializeDocument(createSampleLetter())).warnings,
    ).toEqual([]);
  });
});
