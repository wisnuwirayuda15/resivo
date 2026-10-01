/**
 * The writing guide, as structure.
 *
 * What is said (every title and paragraph) is in the `guide` messages, in each
 * language. What is here is what does not change with the language: which
 * chapters and sections there are, and the code in them.
 *
 * One source for three outputs (the panel in the editor, the Markdown copied
 * by "Copy the guide", and the section list a test walks) because the failure
 * mode of a syntax guide is not being ugly, it is being *wrong*. A second copy
 * of the same rules in a different file drifts the first time a directive gains
 * an attribute, and a guide that documents syntax the parser rejects is worse
 * than no guide.
 *
 * `content.test.ts` is what keeps that honest: every Markdown snippet below is
 * parsed with the real codec and has to come back with no warnings, and the AI
 * prompt has to mention every directive name the format defines. So a directive
 * added to `markdown/spec.ts` fails a test here until it is written up. The
 * words are held to the same standard from the other side: both languages must
 * have a title and the same number of paragraphs for every section listed here.
 *
 * The AI prompt stays in English. It is an instruction to a model and not
 * interface text, and the last line of it tells the model to write in the
 * language of the information it is given.
 */

import { RESOURCES } from "@/lib/i18n/language";

import type { AppLanguage } from "@/lib/i18n/language";
import type { Widen } from "@/locales/widen";
import type { en } from "@/locales/en";

export interface GuideSection {
  /** Stable, so a heading can be linked to and a test can name one. */
  id: string;
  snippet?: {
    language: "markdown" | "css";
    code: string;
  };
}

export interface GuideChapter {
  id: "markdown" | "letters" | "styling";
  sections: Array<GuideSection>;
}

const MARKDOWN_CHAPTER: GuideChapter = {
  id: "markdown",
  sections: [
    {
      id: "shape",
      snippet: {
        language: "markdown",
        code: `# Ada Lovelace

Mathematician, and the first programmer

::contact[ada@example.com]{icon="envelope" href="mailto:ada@example.com"}
::contact[London, UK]{icon="map-pin"}

## Summary

Wrote the first published algorithm, for a machine that was never built.`,
      },
    },
    {
      id: "contacts",
      snippet: {
        language: "markdown",
        code: `::contact[+44 20 7946 0958]{icon="phone"}
::contact[ada.example.com]{icon="globe" href="https://ada.example.com"}
::contact[@ada]{icon="github-logo" href="https://github.com/ada"}`,
      },
    },
    {
      id: "entries",
      snippet: {
        language: "markdown",
        code: `## Experience

:::entry{title="Lead Engineer" subtitle="Difference Engine Co." location="London" start="2021-03" current="true"}
Owned the compiler, and the people who wrote it.

- Cut the build from 14 minutes to 90 seconds
- Hired and mentored four engineers
:::`,
      },
    },
    {
      id: "tags",
      snippet: {
        language: "markdown",
        code: `## Skills

::tags[TypeScript, React, PostgreSQL, Rust]

::label[Available from March]{icon="calendar-check" weight="bold"}

Fluent in English and French :icon{name="translate"}`,
      },
    },
    {
      id: "images-breaks",
      snippet: {
        language: "markdown",
        code: `::image[Portrait]{id="8f14e45f" width="40"}

::pagebreak

## Publications`,
      },
    },
    {
      id: "ordinary",
      snippet: {
        language: "markdown",
        code: `## Education

**MSc Mathematics**, University of London (1842)

| Award | Year |
| ----- | ---- |
| Gold Medal | 1843 |

> The Analytical Engine weaves algebraic patterns.

- [ ] Still to write up
- [x] Notes published`,
      },
    },
  ],
};

const LETTERS_CHAPTER: GuideChapter = {
  id: "letters",
  sections: [
    {
      id: "shape",
      snippet: {
        language: "markdown",
        code: `# Ada Lovelace

::contact[ada@example.com]{icon="envelope" href="mailto:ada@example.com"}
::contact[London, UK]{icon="map-pin"}

##

14 March 1843

Charles Babbage, Difference Engine Co., London

Dear Mr. Babbage,

I am writing about the Analytical Engine.

Thank you for your time.

Yours sincerely,

Ada Lovelace`,
      },
    },
    { id: "habits" },
  ],
};

const STYLING_CHAPTER: GuideChapter = {
  id: "styling",
  sections: [
    { id: "tokens" },
    {
      id: "custom-css",
      snippet: {
        language: "css",
        code: `.rp-name {
  letter-spacing: -0.02em;
}

.rp-section-title {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.rp-entry-meta {
  font-variant-numeric: tabular-nums;
}`,
      },
    },
    { id: "classes" },
    { id: "refused" },
    { id: "limits" },
  ],
};

export const GUIDE: Array<GuideChapter> = [
  MARKDOWN_CHAPTER,
  LETTERS_CHAPTER,
  STYLING_CHAPTER,
];

/** What the guide says, for one language, as plain data. */
export type GuideWords = Widen<(typeof en)["guide"]>;

export const guideWords = (language: AppLanguage): GuideWords =>
  RESOURCES[language].guide;

/**
 * The words of one section. Section ids with a hyphen (`images-breaks`) are
 * filed under camelCase keys (`imagesBreaks`), which is what a message key can
 * be written as without quoting.
 */
export const sectionKey = (id: string): string =>
  id.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

export const sectionWords = (
  words: GuideWords,
  chapter: GuideChapter["id"],
  id: string,
): { title: string; body: ReadonlyArray<string> } => {
  const sections = words.chapters[chapter].sections as Record<
    string,
    { title: string; body: ReadonlyArray<string> }
  >;

  return sections[sectionKey(id)] ?? { title: id, body: [] };
};

/**
 * The guide as one Markdown file.
 *
 * Generated rather than written, so "Copy the guide" cannot fall behind the
 * panel it was copied from. Backticks in the body survive as backticks: this is
 * Markdown going to a Markdown reader, and the panel strips them for display.
 * In the language the interface is in, since that is the language of the person
 * who is about to paste it.
 */
export const guideMarkdown = (language: AppLanguage = "en"): string => {
  const words = guideWords(language);
  const lines: Array<string> = [`# ${words.heading}`, "", words.summary];

  for (const chapter of GUIDE) {
    const chapterWords = words.chapters[chapter.id];

    lines.push("", `## ${chapterWords.title}`, "", chapterWords.intro);

    for (const section of chapter.sections) {
      const sectionText = sectionWords(words, chapter.id, section.id);

      lines.push("", `### ${sectionText.title}`, "");
      lines.push(sectionText.body.join("\n\n"));

      if (section.snippet !== undefined) {
        lines.push(
          "",
          "```" + section.snippet.language,
          section.snippet.code,
          "```",
        );
      }
    }
  }

  return `${lines.join("\n")}\n`;
};

/**
 * The prompt, for writing a resume with a language model.
 *
 * An instruction rather than a summary of the guide, which is why it is written
 * out here instead of generated from the chapters above: the guide explains a
 * format to someone reading it, and this tells a model exactly what to emit and
 * what never to emit. Both have to say the same things, and the test asserts the
 * overlap that matters, every directive name.
 *
 * The last line is the hand-off. It ends on a colon so whatever the user pastes
 * after it reads as the input rather than as more instructions.
 */
export const AI_PROMPT = `You are writing a resume in Resivo-Markdown, a small Markdown dialect. Output the file and nothing else: no preamble, no explanation, and no code fence around the document as a whole.

STRUCTURE
- \`# Name\`: exactly one, on the first line.
- One paragraph under it: the headline, one short line, no full stop.
- \`::contact[Label]{icon="envelope" href="mailto:ada@example.com"}\`: one per line, one per contact detail. \`icon\` is a Phosphor icon name in kebab-case (envelope, phone, map-pin, globe, github-logo, linkedin-logo). \`href\` is optional.
- \`## Section title\`: one per section. Prefer Summary, Experience, Education, Skills, Projects, Certifications, Awards, Publications, Languages or Interests where they fit; any other title is allowed and renders the same.

ENTRIES. Use one for anything with a role, a place and a date range:
:::entry{title="Lead Engineer" subtitle="Difference Engine Co." location="London" start="2021-03" end="2024-01"}
One optional paragraph of summary.

- One bullet per achievement, starting with a verb, with a number where there is one
:::
- Use \`current="true"\` instead of \`end\` for something still held.
- Dates are \`YYYY-MM\` or \`YYYY\`. Anything else is printed exactly as written, so "Summer 2019" is fine.
- \`subtitle\`, \`location\`, \`start\` and \`end\` are all optional.

OTHER BLOCKS
- \`::tags[TypeScript, React, PostgreSQL]\`: a comma-separated list drawn as pills. Best for skills, tools and languages.
- \`::label[Available from March]{icon="calendar-check"}\`: one line with an icon in front of it.
- \`:icon{name="translate"}\`: an icon inside a run of text.
- \`::pagebreak\`: forces what follows onto a new sheet. Use it rarely, if at all.
- Ordinary Markdown works throughout: bold, italic, links, bullet and numbered lists at any depth, task lists, tables, quotes, code fences and \`---\`.

DO NOT
- Do not write \`::image\`. An image is referenced by an id that exists only in the user's own browser, so it cannot be guessed.
- Do not use raw HTML, footnotes or link reference definitions. They are kept verbatim rather than typeset, and are reported as warnings.
- Do not use a table to lay the page out. The templates are single-column and ATS-friendly, and a table used for layout is what defeats a parser.
- Do not invent an employer, a date, a job title or a number. If something is missing, leave it out and say so at the end, outside the file.

Write in the language of the information you are given.

Here is my information. Turn it into the file described above:
`;

/**
 * The prompt, for writing a cover letter with a language model.
 *
 * Its own text and not a variation on `AI_PROMPT`: a letter has no entries, tags
 * or sections to describe, and a model given the resume's rules would write
 * headings into it. What it adds is what a letter needs to be told, which is
 * what *not* to invent: the one thing a model does with a cover letter, left to
 * itself, is a recipient, a company and an accomplishment the author never had.
 * The last line is the hand-off, as in the other.
 */
export const AI_PROMPT_LETTER = `You are writing a cover letter in Resivo-Markdown, a small Markdown dialect. Output the file and nothing else: no preamble, no explanation, and no code fence around the document as a whole.

STRUCTURE
- \`# Name\`: exactly one, on the first line. This is the sender.
- \`::contact[Label]{icon="envelope" href="mailto:ada@example.com"}\`: one per line, one per contact detail. \`icon\` is a Phosphor icon name in kebab-case (envelope, phone, map-pin, globe, linkedin-logo). \`href\` is optional.
- A line containing only \`##\`. It is the letter's one section, and it has no title on purpose. Do not write a title after it, and do not write any other \`##\` line.
- Then the letter itself, as paragraphs, each on a single line with a blank line between them, in this order: the date, the recipient, the greeting, the body, the closing, the sender's name.

THE LETTER
- Keep it to one page: three or four short paragraphs, about 250 to 350 words in all.
- Open the body with the role and why this company. Spend the middle on two or three things the sender has actually done that bear on the role, with a number where there is one. Close by saying what happens next.
- Plain sentences. No bullet lists, no tables, no headings, no bold.

DO NOT
- Do not use \`::entry\`, \`::tags\` or \`::image\`. A letter does not need them, and an image id belongs to the user's own browser.
- Do not use raw HTML, footnotes or link reference definitions.
- Do not invent a recipient's name, a company, a job title, a date or an achievement. If the information is not given, use a role ("Dear Hiring Team,") or leave it out, and say what is missing at the end, outside the file.

Write in the language of the information you are given.

Here is the role, the company and my background. Turn them into the file described above:
`;
