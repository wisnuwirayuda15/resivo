import { documentFromMarkdown } from "@/features/markdown/index";

import { createEmptyDocument } from "./model/index";

import type {
  DocumentKind,
  ResumeDocument,
  TemplateId,
} from "./model/document";

/**
 * The example resume, written in the format it teaches.
 *
 * A new resume used to be four empty sections and nothing else, on the
 * reasoning that a document should never contain text its owner did not write.
 * That reasoning still holds, and it is why this is one of two choices in the
 * new-resume dialog rather than what every resume starts as. What it left out
 * was the first minute: an empty page does not show what an entry is, that
 * skills are a `::tags` line, or that a date range is two attributes, and the
 * guide is a drawer someone has to know to open.
 *
 * Kept as Markdown rather than as a hand-built tree for the same reason the
 * guide's snippets are: this is the only representation a reader can check
 * against what they see in the code pane, and `sample.test.ts` parses it with
 * the real codec and fails on a single warning. A tree assembled by hand would
 * be a second way of saying the same thing, and the two would drift.
 *
 * Ada Lovelace throughout, because she is already the example in the writing
 * guide and on the landing page, and because a resume dated 1843 cannot be
 * mistaken for content the user forgot to replace.
 *
 * One line per paragraph and per bullet, deliberately. The serializer writes
 * each run on a single line, so a wrapped paragraph here would be rewritten on
 * the first save and show up as an edit nobody made.
 */
export const SAMPLE_SOURCE = `# Ada Lovelace

Mathematician, and the first programmer

::contact[ada@example.com]{icon="envelope" href="mailto:ada@example.com"}
::contact[+44 20 7946 0958]{icon="phone"}
::contact[London, UK]{icon="map-pin"}
::contact[ada.example.com]{icon="globe" href="https://ada.example.com"}

## Summary

Mathematician working on mechanical computation. Wrote the first published algorithm, for a machine that was never built, along with the argument for why such a machine would one day do more than arithmetic.

## Experience

:::entry{title="Analyst" subtitle="Difference Engine Co." location="London" start="1842-10" current="true"}
Translated and then extended the only published account of the Analytical Engine.

- Wrote Note G, the first published algorithm, computing Bernoulli numbers by machine
- Tripled the length of Menabrea's memoir in footnotes, and it is the footnotes that are still read
- Argued in print that the engine could compose music, not only calculate
:::

:::entry{title="Independent researcher" subtitle="Correspondence with Charles Babbage" location="London" start="1833-06" end="1842-09"}
Nine years of letters on the design of a machine nobody had finished building.

- Checked the engine's arithmetic against tables computed by hand
- Kept the notes that survive as the design's clearest description
:::

## Projects

:::entry{title="Note G" subtitle="Bernoulli numbers, by machine" start="1843"}
A table of operations for computing Bernoulli numbers on the Analytical Engine.

- Expressed a loop and the reuse of intermediate results, neither of which the machine had an instruction for
:::

## Education

:::entry{title="Mathematics, private tuition" subtitle="Augustus De Morgan, University of London" start="1840" end="1842"}
Calculus, and the beginnings of symbolic logic.
:::

## Skills

::tags[Mechanical computation, Symbolic logic, Calculus, Technical translation]

## Publications

- Sketch of the Analytical Engine, with Notes by the Translator. Taylor's Scientific Memoirs, 1843

## Languages

::tags[English, French]
`;

/**
 * The example resume as a document, on the given template.
 *
 * `documentFromMarkdown` and not `applyMarkdown`, which is the difference
 * between building a document and editing one: this file's Projects heading
 * would otherwise inherit the empty document's leftover Education section, and
 * a template lays a section out by kind. The empty document is here only for
 * the template's design tokens.
 */
export const createSampleDocument = (
  templateId: TemplateId = "classic",
): ResumeDocument =>
  documentFromMarkdown(createEmptyDocument(templateId), SAMPLE_SOURCE).document;

/**
 * The example cover letter, from the same person to the same engineer.
 *
 * Written in the format it teaches, and held to the same two tests as the resume
 * above (it parses without a warning, and it is its own serialization). The bare
 * `##` is the letter's one untitled section: the flow draws no heading for it,
 * and the Markdown writes it as it is, so the line is the first thing worth
 * explaining and the guide does.
 *
 * One paragraph per line, for the reason the resume gives. The recipient is one
 * line because a paragraph is the only block that can hold it, and a letter's
 * address block set as four paragraphs would be spaced like four.
 */
export const SAMPLE_LETTER_SOURCE = `# Ada Lovelace

Mathematician

::contact[ada@example.com]{icon="envelope" href="mailto:ada@example.com"}
::contact[+44 20 7946 0958]{icon="phone"}
::contact[London, UK]{icon="map-pin"}

##

14 March 1843

Charles Babbage, Difference Engine Co., London

Dear Mr. Babbage,

I am writing about the Analytical Engine, and to ask whether I might join the work on it. I have translated Menabrea's account of the machine, and in the course of it I found there was more to say than he had set down.

My notes are three times the length of the memoir. The longest of them describes how the engine could compute the Bernoulli numbers, which I believe is the first program written for a machine that does not yet exist. I would welcome the chance to show you how it was done, and what else I think the engine could be made to do.

Thank you for your time, and for the machine.

Yours sincerely,

Ada Lovelace
`;

export const createSampleLetter = (
  templateId: TemplateId = "classic",
): ResumeDocument =>
  documentFromMarkdown(
    createEmptyDocument(templateId, "en", "coverLetter"),
    SAMPLE_LETTER_SOURCE,
  ).document;

/**
 * What a new resume starts as.
 *
 * Two, and only two. A gallery of starting points is a second template picker
 * dressed up as content, and the template picker is already the first thing in
 * the dialog: the question here is whether the page arrives written on or empty,
 * which has exactly two answers.
 */
export const RESUME_STARTS = ["sample", "blank"] as const;
export type ResumeStart = (typeof RESUME_STARTS)[number];

/**
 * `locale` is the language of the page being started and applies to a blank
 * page only. The example is Ada Lovelace's resume in English, a document and not
 * an interface, and translating it would be writing a different resume.
 */
export const createStartingDocument = (
  start: ResumeStart,
  templateId: TemplateId,
  locale = "en",
  kind: DocumentKind = "resume",
): ResumeDocument => {
  if (kind === "coverLetter") {
    return start === "blank"
      ? createEmptyDocument(templateId, locale, kind)
      : createSampleLetter(templateId);
  }

  return start === "blank"
    ? createEmptyDocument(templateId, locale)
    : createSampleDocument(templateId);
};
