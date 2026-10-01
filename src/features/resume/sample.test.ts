import { describe, expect, it } from "vitest";

import { parseDocument, serializeDocument } from "@/features/markdown/index";
import { plainText } from "./model/index";
import {
  SAMPLE_LETTER_SOURCE,
  SAMPLE_SOURCE,
  createSampleDocument,
  createSampleLetter,
  createStartingDocument,
} from "./sample";

import type { EntryBlock, TagListBlock } from "./model/document";

/**
 * The example resume has to be true, and it has to be stable.
 *
 * True, because it is the first Resivo syntax most people will read and the
 * document they will edit over: the parser reports a warning for anything it
 * could not represent, so a warning here is the example teaching syntax the app
 * does not accept.
 *
 * Stable, because the editor's buffer is a serialization of the model. If the
 * source and the round trip disagree, opening the example and touching nothing
 * still leaves an unsaved change, and the first autosave rewrites a document
 * the user never edited.
 */
describe("the example resume", () => {
  it("parses with no warnings", () => {
    // Read here rather than through `createSampleDocument`, which drops the
    // warnings by design because nothing at the call site could act on them.
    expect(parseDocument(SAMPLE_SOURCE).warnings).toEqual([]);
  });

  it("round-trips back to its own source", () => {
    expect(serializeDocument(createSampleDocument())).toBe(SAMPLE_SOURCE);
  });

  it("fills the header the list and the templates read", () => {
    const document = createSampleDocument();

    expect(document.meta.fullName).toBe("Ada Lovelace");
    expect(plainText(document.content.header.headline ?? [])).not.toBe("");
    expect(document.content.header.contacts).toHaveLength(4);

    // Every contact carries an icon, because a contact row without one is not
    // the shape the example should be showing off.
    for (const contact of document.content.header.contacts) {
      expect(contact.icon?.name).toBeTypeOf("string");
    }
  });

  it("shows the sections a template lays out specially", () => {
    const kinds = createSampleDocument().content.sections.map(
      (section) => section.kind,
    );

    expect(kinds).toEqual([
      "summary",
      "experience",
      "projects",
      "education",
      "skills",
      "publications",
      "languages",
    ]);
  });

  it("shows an entry with every field filled in, and one still current", () => {
    const experience = createSampleDocument().content.sections.find(
      (section) => section.kind === "experience",
    );

    const entries = (experience?.blocks ?? []).filter(
      (block): block is EntryBlock => block.kind === "entry",
    );

    expect(entries).toHaveLength(2);

    const first = entries[0];

    expect(plainText(first?.title ?? [])).not.toBe("");
    expect(plainText(first?.subtitle ?? [])).not.toBe("");
    expect(plainText(first?.location ?? [])).not.toBe("");
    expect(first?.dateRange?.current).toBe(true);
    expect(plainText(first?.summary ?? [])).not.toBe("");
    expect((first?.bullets ?? []).length).toBeGreaterThan(1);

    // The second is a closed range, so the example shows both forms of date.
    expect(entries[1]?.dateRange?.end).toBeTypeOf("string");
  });

  it("writes skills as a tag list rather than a paragraph", () => {
    const skills = createSampleDocument().content.sections.find(
      (section) => section.kind === "skills",
    );

    const tags = skills?.blocks.find(
      (block): block is TagListBlock => block.kind === "tagList",
    );

    expect((tags?.tags ?? []).length).toBeGreaterThan(2);
  });

  it("takes its design tokens from the template it was asked for", () => {
    expect(createSampleDocument("technical").templateId).toBe("technical");
    expect(createSampleDocument("editorial").design).not.toEqual(
      createSampleDocument("classic").design,
    );
  });
});

describe("createStartingDocument", () => {
  it("starts a blank page in the language it is given", () => {
    const blank = createStartingDocument("blank", "modern", "id");

    expect(blank.meta.locale).toBe("id");
    expect(
      blank.content.sections.map((section) => plainText(section.title)),
    ).toEqual(["Ringkasan", "Pengalaman", "Pendidikan", "Keahlian"]);
  });

  it("does not translate the example, which is a resume and not an interface", () => {
    const sample = createStartingDocument("sample", "modern", "id");

    expect(sample.meta.locale).toBe("en");
    expect(plainText(sample.content.header.name)).toBe("Ada Lovelace");
  });
});

describe("the example cover letter", () => {
  it("parses with no warnings", () => {
    expect(parseDocument(SAMPLE_LETTER_SOURCE).warnings).toEqual([]);
  });

  it("round-trips back to its own source", () => {
    expect(serializeDocument(createSampleLetter())).toBe(SAMPLE_LETTER_SOURCE);
  });

  it("is a letter: one untitled section of paragraphs, and a letter's design", () => {
    const letter = createSampleLetter("modern");

    expect(letter.kind).toBe("coverLetter");
    expect(letter.content.sections).toHaveLength(1);
    expect(plainText(letter.content.sections[0]?.title ?? [])).toBe("");
    expect(
      letter.content.sections[0]?.blocks.every(
        (block) => block.kind === "paragraph",
      ),
    ).toBe(true);
    expect(letter.design.paper.margin.left).toBe(1);
    expect(letter.design.typography.lineHeight).toBe(1.5);
  });

  it("is chosen by kind, for the example and for a blank page", () => {
    expect(
      createStartingDocument("sample", "classic", "en", "coverLetter").kind,
    ).toBe("coverLetter");

    const blank = createStartingDocument(
      "blank",
      "classic",
      "en",
      "coverLetter",
    );

    expect(blank.kind).toBe("coverLetter");
    expect(blank.content.sections).toHaveLength(1);
    expect(blank.content.sections[0]?.blocks).toEqual([]);
    // A resume is untouched by all of this.
    expect(createStartingDocument("sample", "classic").kind).toBeUndefined();
  });
});
