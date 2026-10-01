import { produce } from "immer";
import { describe, expect, it } from "vitest";

import { checkDocument } from "@/features/ats/check";
import { setTemplate } from "@/features/editor/mutations";
import { applyMarkdown, serializeDocument } from "@/features/markdown/index";
import { documentFlow } from "@/features/preview/flow";
import {
  designMatchesTemplate,
  templateDefaults,
} from "@/features/templates/defaults";

import { createEmptyDocument, documentSchema, text } from "./model/index";
import { createSampleDocument, createSampleLetter } from "./sample";

import type { ResumeDocument } from "./model/document";

/**
 * A cover letter is a resume with a different `kind`, so what is worth testing is
 * the places that read it: the flow, the design defaults, the ATS rules, and the
 * round trips that must not lose it.
 */

const rulesOf = (document: ResumeDocument, pageCount: number | null = null) =>
  checkDocument(document, { pageCount }).map((issue) => issue.rule);

describe("the document kind", () => {
  it("is written for a letter and absent for a resume, so old rows are unchanged", () => {
    expect(createEmptyDocument("classic", "en", "coverLetter").kind).toBe(
      "coverLetter",
    );
    expect("kind" in createEmptyDocument("classic")).toBe(false);
  });

  it("validates, and a document without one is still valid", () => {
    expect(documentSchema.safeParse(createSampleLetter()).success).toBe(true);
    expect(documentSchema.safeParse(createSampleDocument()).success).toBe(true);
    expect(
      documentSchema.safeParse({ ...createSampleDocument(), kind: "memo" })
        .success,
    ).toBe(false);
  });

  it("survives an edit made in the Markdown pane", () => {
    const letter = createSampleLetter();
    const { document } = applyMarkdown(letter, serializeDocument(letter));

    expect(document.kind).toBe("coverLetter");
    expect(document.content.sections).toHaveLength(1);
  });
});

describe("the flow of a letter", () => {
  it("has no section heading, so nothing sits above the first paragraph", () => {
    const letter = createSampleLetter();
    const items = documentFlow(letter);

    expect(items[0]?.type).toBe("header");
    expect(items.some((item) => item.type === "sectionHeading")).toBe(false);
    expect(items.filter((item) => item.type === "block")).toHaveLength(
      letter.content.sections[0]?.blocks.length ?? 0,
    );
  });

  it("keeps a forced break above the section on its first paragraph", () => {
    const letter = produce(createSampleLetter(), (draft) => {
      const section = draft.content.sections[0];

      if (section !== undefined) {
        section.style = { breakBefore: "page" };
      }
    });
    const blocks = documentFlow(letter).filter((item) => item.type === "block");

    expect(blocks[0]?.breakBefore).toBe(true);
  });

  it("still draws a resume's headings", () => {
    expect(
      documentFlow(createSampleDocument()).some(
        (item) => item.type === "sectionHeading",
      ),
    ).toBe(true);
  });
});

describe("a letter's design", () => {
  it("is set as a letter, over whichever template", () => {
    for (const id of ["classic", "compact", "technical"] as const) {
      const design = templateDefaults(id, "coverLetter");

      expect(design.paper.margin).toEqual({
        top: 1,
        right: 1,
        bottom: 1,
        left: 1,
      });
      expect(design.typography.baseSize).toBeGreaterThanOrEqual(11);
      expect(design.typography.lineHeight).toBe(1.5);
    }
  });

  it("keeps the template's own faces and colours", () => {
    expect(templateDefaults("modern", "coverLetter").colors).toEqual(
      templateDefaults("modern").colors,
    );
    expect(
      templateDefaults("technical", "coverLetter").typography.headingFont,
    ).toEqual(templateDefaults("technical").typography.headingFont);
  });

  it("does not make a resume's own larger body smaller", () => {
    // Compact is 9.5pt, which a letter raises; nothing here lowers a size.
    expect(templateDefaults("compact", "coverLetter").typography.baseSize).toBe(
      11,
    );
    expect(
      templateDefaults("classic", "coverLetter").typography.baseSize,
    ).toBeGreaterThanOrEqual(templateDefaults("classic").typography.baseSize);
  });

  it("is what a new letter is seeded with, so it never looks customised", () => {
    for (const id of ["classic", "bold"] as const) {
      const letter = createEmptyDocument(id, "en", "coverLetter");

      expect(designMatchesTemplate(letter.design, id, "coverLetter")).toBe(
        true,
      );
      // And is not a resume's, which is why the kind has to be asked.
      expect(designMatchesTemplate(letter.design, id)).toBe(false);
    }
  });

  it("is kept when the template is switched and the customisations are dropped", () => {
    const switched = produce(createSampleLetter("classic"), (draft) => {
      setTemplate("bold", { resetDesign: true })(draft);
    });

    expect(switched.design).toEqual(templateDefaults("bold", "coverLetter"));
  });
});

describe("the ATS check of a letter", () => {
  const letter = () => createSampleLetter();

  it("finds nothing in the example letter, on every template", () => {
    for (const id of [
      "classic",
      "modern",
      "technical",
      "editorial",
      "compact",
      "profile",
      "bold",
    ] as const) {
      expect(checkDocument(createSampleLetter(id))).toEqual([]);
    }
  });

  it("does not ask a letter for the sections a resume has", () => {
    const rules = rulesOf(createEmptyDocument("classic", "en", "coverLetter"));

    expect(rules).not.toContain("ats.section-title-empty");
    expect(rules).not.toContain("ats.core-sections-missing");
    expect(rules).not.toContain("ats.section-empty");
    // The same document as a resume is asked, and does complain.
    expect(rulesOf(createEmptyDocument("classic"))).toContain(
      "ats.core-sections-missing",
    );
  });

  it("still asks for a name, an email and a phone number", () => {
    const rules = rulesOf(createEmptyDocument("classic", "en", "coverLetter"));

    expect(rules).toEqual(
      expect.arrayContaining([
        "ats.name-missing",
        "ats.email-missing",
        "ats.phone-missing",
      ]),
    );
  });

  it("still reads type, margins and colour", () => {
    const small = produce(letter(), (draft) => {
      draft.design.typography.baseSize = 8;
      draft.design.paper.margin = {
        top: 0.2,
        right: 0.2,
        bottom: 0.2,
        left: 0.2,
      };
    });

    expect(rulesOf(small)).toEqual(
      expect.arrayContaining(["ats.font-size-small", "ats.margins-narrow"]),
    );
  });

  it("limits a letter to one page, in the letter's words, and a resume to two", () => {
    const issues = checkDocument(letter(), { pageCount: 2 }).filter(
      (issue) => issue.rule === "ats.page-count",
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.params).toEqual({ count: 2, context: "letter" });

    expect(rulesOf(letter(), 1)).not.toContain("ats.page-count");
    // Two pages is fine for a resume.
    expect(rulesOf(createSampleDocument(), 2)).not.toContain("ats.page-count");
    expect(rulesOf(createSampleDocument(), 3)).toContain("ats.page-count");
  });

  it("says when a letter is long, by words and without a measurement", () => {
    const long = produce(letter(), (draft) => {
      draft.content.sections[0]?.blocks.push({
        id: "padding",
        kind: "paragraph",
        text: text(Array.from({ length: 500 }, () => "word").join(" ")),
      });
    });

    expect(rulesOf(long)).toContain("ats.letter-long");
    expect(rulesOf(letter())).not.toContain("ats.letter-long");
    // A resume has no such rule, whatever its length.
    expect(rulesOf(createSampleDocument())).not.toContain("ats.letter-long");
  });
});
