import { createId } from "@/lib/id";

import { createEmptyDocument, text } from "./factory";

import type { Block, ResumeDocument } from "./document";

/**
 * A cover letter that begins from a resume.
 *
 * The header is the resume's, copied, because a letter is sent by the same person
 * with the same contacts and retyping them is the part nobody wants to do. The
 * rest is the frame of a letter and none of its substance: a recipient line, a
 * greeting and a closing, in the language of the resume, for the author to write
 * between. Nothing is invented. The company is the one the version was written
 * for if there is one, and the recipient is a role (the hiring team) and not a
 * person's name, because a name the app made up would be wrong and sent.
 *
 * These are document content, like the section titles: they become the letter's
 * own words the moment they exist, so they follow the language of the document
 * and not the language of the menus.
 */

const WORDS = {
  en: {
    recipient: (company: string) => `Hiring Team, ${company}`,
    greeting: "Dear Hiring Team,",
    closing: "Yours sincerely,",
  },
  id: {
    recipient: (company: string) => `Tim Rekrutmen, ${company}`,
    greeting: "Yth. Tim Rekrutmen,",
    closing: "Hormat saya,",
  },
} as const;

const paragraph = (value: string): Block => ({
  id: createId(),
  kind: "paragraph",
  text: text(value),
});

export const letterFromResume = (
  resume: ResumeDocument,
  company?: string,
): ResumeDocument => {
  const language = resume.meta.locale.toLowerCase().startsWith("id")
    ? "id"
    : "en";
  const words = WORDS[language];
  const letter = createEmptyDocument(
    resume.templateId,
    resume.meta.locale,
    "coverLetter",
  );
  const name = resume.content.header.name;

  const blocks: Array<Block> = [
    ...(company === undefined || company.trim() === ""
      ? []
      : [paragraph(words.recipient(company.trim()))]),
    paragraph(words.greeting),
    paragraph(words.closing),
    // The name again, to sign with. Cloned so editing the signature does not edit
    // the header.
    { id: createId(), kind: "paragraph", text: structuredClone(name) },
  ];

  const section = letter.content.sections[0];

  if (section !== undefined) {
    section.blocks = blocks;
  }

  return {
    ...letter,
    meta: { ...letter.meta, fullName: resume.meta.fullName },
    content: {
      ...letter.content,
      header: structuredClone(resume.content.header),
    },
  };
};
