import { describe, expect, it } from "vitest";

import { createSampleDocument } from "../sample";

import { documentSchema, plainText } from "./index";
import { letterFromResume } from "./letterStarter";

import type { Block, ResumeDocument } from "./document";

const paragraphs = (document: ResumeDocument): Array<string> =>
  (document.content.sections[0]?.blocks ?? []).map((block: Block) =>
    block.kind === "paragraph" ? plainText(block.text) : `[${block.kind}]`,
  );

describe("letterFromResume", () => {
  const resume = createSampleDocument("modern");

  it("is a letter on the resume's template, with the resume's header", () => {
    const letter = letterFromResume(resume, "Acme");

    expect(letter.kind).toBe("coverLetter");
    expect(letter.templateId).toBe("modern");
    expect(letter.meta.fullName).toBe("Ada Lovelace");
    expect(letter.content.header).toEqual(resume.content.header);
    expect(documentSchema.safeParse(letter).success).toBe(true);
  });

  it("is one untitled section with a recipient, a greeting, a closing and a signature", () => {
    const letter = letterFromResume(resume, "Acme");

    expect(letter.content.sections).toHaveLength(1);
    expect(plainText(letter.content.sections[0]?.title ?? [])).toBe("");
    expect(paragraphs(letter)).toEqual([
      "Hiring Team, Acme",
      "Dear Hiring Team,",
      "Yours sincerely,",
      "Ada Lovelace",
    ]);
  });

  it("names no recipient when there is no company, rather than inventing one", () => {
    expect(paragraphs(letterFromResume(resume))).toEqual([
      "Dear Hiring Team,",
      "Yours sincerely,",
      "Ada Lovelace",
    ]);
    expect(paragraphs(letterFromResume(resume, "   "))).toHaveLength(3);
  });

  it("is written in the language of the resume", () => {
    const indonesian = { ...resume, meta: { ...resume.meta, locale: "id" } };

    expect(paragraphs(letterFromResume(indonesian, "Acme"))).toEqual([
      "Tim Rekrutmen, Acme",
      "Yth. Tim Rekrutmen,",
      "Hormat saya,",
      "Ada Lovelace",
    ]);
  });

  it("shares nothing with the resume it came from", () => {
    const letter = letterFromResume(resume, "Acme");
    const signature = letter.content.sections[0]?.blocks.at(-1);

    if (signature?.kind === "paragraph") {
      signature.text = [{ type: "text", text: "Someone Else" }];
    }
    letter.content.header.name = [{ type: "text", text: "Changed" }];

    expect(plainText(resume.content.header.name)).toBe("Ada Lovelace");
  });

  it("uses a letter's design, not the resume's", () => {
    const letter = letterFromResume(resume, "Acme");

    expect(letter.design.paper.margin.top).toBe(1);
    expect(letter.design.typography.lineHeight).toBe(1.5);
  });
});
