import { parseDocument } from "@/features/markdown/index";

import { createEmptyDocument, syncMeta } from "./model/index";

import type { ResumeDocument, TemplateId } from "./model/document";

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
 * Parsed with no previous document, and deliberately not through
 * `applyMarkdown`. Given one, the parser hands each heading the identity of a
 * section that was already there, falling back to position when no title
 * matches, which is what lets a section be renamed without losing its icon or
 * its id. Against a freshly created empty document that fallback is wrong in a
 * way nothing later corrects: this file's Projects heading would inherit the
 * leftover Education section's kind, and templates lay a section out by kind.
 *
 * So the content comes from the source alone, and only the empty document's
 * design tokens are kept, which is the part the chosen template decides.
 */
export const createSampleDocument = (
  templateId: TemplateId = "classic",
): ResumeDocument =>
  syncMeta({
    ...createEmptyDocument(templateId),
    content: parseDocument(SAMPLE_SOURCE).content,
  });

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

export const createStartingDocument = (
  start: ResumeStart,
  templateId: TemplateId,
): ResumeDocument =>
  start === "blank"
    ? createEmptyDocument(templateId)
    : createSampleDocument(templateId);
