/**
 * The writing guide, as data.
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
 * added to `markdown/spec.ts` fails a test here until it is written up.
 */

export interface GuideSection {
  /** Stable, so a heading can be linked to and a test can name one. */
  id: string
  title: string
  /** Paragraphs, in order. Plain text, no inline markup to render. */
  body: Array<string>
  snippet?: {
    language: 'markdown' | 'css'
    code: string
  }
}

export interface GuideChapter {
  id: 'markdown' | 'styling'
  title: string
  intro: string
  sections: Array<GuideSection>
}

const MARKDOWN_CHAPTER: GuideChapter = {
  id: 'markdown',
  title: 'Markdown',
  intro:
    'The document is the Markdown. Everything on the paper comes from this file, and every edit made on the paper is written back into it, so a file in this shape is a finished resume, whoever or whatever typed it.',
  sections: [
    {
      id: 'shape',
      title: 'The shape of the file',
      body: [
        '`#` is your name. There is one, it comes first, and it is the only thing the file has to have.',
        'The paragraph under it is the headline, the single line that sits beneath your name.',
        "`##` opens a section, and its text is that section's title. A handful of titles also tell a template what kind of section it is: Summary, Experience, Education, Skills, Projects, Certifications, Awards, Publications, Languages, Interests. Any other title is fine and renders identically.",
        'A file written with `###` headings instead works as pasted: the shallowest heading level in the file is taken as the section level, and normalised on the first save.',
      ],
      snippet: {
        language: 'markdown',
        code: `# Ada Lovelace

Mathematician, and the first programmer

::contact[ada@example.com]{icon="envelope" href="mailto:ada@example.com"}
::contact[London, UK]{icon="map-pin"}

## Summary

Wrote the first published algorithm, for a machine that was never built.`,
      },
    },
    {
      id: 'contacts',
      title: 'Contacts',
      body: [
        'One `::contact` per line, one per detail. The text in brackets is what prints; `icon` is a Phosphor icon name in kebab-case, and `href` is optional. With it, the line becomes a link in the PDF and the HTML export.',
        'The Sections tab in the inspector has a picker for all of this, so the icon name never has to be guessed by hand.',
      ],
      snippet: {
        language: 'markdown',
        code: `::contact[+44 20 7946 0958]{icon="phone"}
::contact[ada.example.com]{icon="globe" href="https://ada.example.com"}
::contact[@ada]{icon="github-logo" href="https://github.com/ada"}`,
      },
    },
    {
      id: 'entries',
      title: 'Entries',
      body: [
        'An entry is the one block a heading convention cannot express. `### Lead Engineer, Difference Engine Co., London (2021-2024)` means guessing at punctuation to get the four facts back out, and guessing is what makes a round trip lossy. So they are written as attributes.',
        'All of `subtitle`, `location`, `start` and `end` are optional. `current="true"` replaces `end` for something still held.',
        'Dates are `YYYY-MM` or `YYYY`, and are formatted for the document\'s locale. Anything else is printed exactly as typed, so "Summer 2019" is a valid date range and not an error.',
        "Inside the block, the first paragraph is the entry's summary and the list is its bullets.",
      ],
      snippet: {
        language: 'markdown',
        code: `## Experience

:::entry{title="Lead Engineer" subtitle="Difference Engine Co." location="London" start="2021-03" current="true"}
Owned the compiler, and the people who wrote it.

- Cut the build from 14 minutes to 90 seconds
- Hired and mentored four engineers
:::`,
      },
    },
    {
      id: 'tags',
      title: 'Skills, labels and icons',
      body: [
        '`::tags` takes a comma-separated list and draws it as pills, the right shape for skills, tools and languages.',
        '`::label` is one line with an icon in front of it. `:icon` puts one inside a run of text, mid-sentence.',
        "Both take a `weight`: thin, light, regular, bold, fill or duotone. All 1512 Phosphor icons are available in all six, and the inspector's picker searches them.",
      ],
      snippet: {
        language: 'markdown',
        code: `## Skills

::tags[TypeScript, React, PostgreSQL, Rust]

::label[Available from March]{icon="calendar-check" weight="bold"}

Fluent in English and French :icon{name="translate"}`,
      },
    },
    {
      id: 'images-breaks',
      title: 'Images and page breaks',
      body: [
        '`::pagebreak` forces whatever follows it onto a new sheet. A section can also be set to start on one, from the Sections tab, and one document-wide setting decides whether a heading may be the last thing on a page.',
        "An image is referenced by an id, and that id belongs to this browser's database, so it cannot be written by hand or guessed. Add the image from the Assets tab and the directive is written for you; `width` is a percentage of the text column, and the paper's own controls set it.",
      ],
      snippet: {
        language: 'markdown',
        code: `::image[Portrait]{id="8f14e45f" width="40"}

::pagebreak

## Publications`,
      },
    },
    {
      id: 'ordinary',
      title: 'Everything else is ordinary Markdown',
      body: [
        'CommonMark and GFM, and all of it is typeset: headings, bullet and numbered lists at any depth, task lists, tables, quotes, code fences, thematic breaks, and bold, italic and links inline.',
        'What the model cannot represent (raw HTML, footnotes, link reference definitions) is kept verbatim and reported as a warning rather than silently dropped. Text that arrives above the first heading goes into an untitled section instead of being refused.',
      ],
      snippet: {
        language: 'markdown',
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
}

const STYLING_CHAPTER: GuideChapter = {
  id: 'styling',
  title: 'Styling',
  intro:
    'Most of styling here is not CSS. The Style tab is a control for every design token the templates read, and moving one there is both easier and safer than overriding it: the paper is measured at those values, so the pagination stays correct.',
  sections: [
    {
      id: 'tokens',
      title: 'Try the Style tab first',
      body: [
        'Paper size and margins, the type family and its scale, colour, vertical rhythm, section rules, icon defaults, and where pages are allowed to break: all of it is a control rather than a rule to write.',
        'There are four templates, all single-column and ATS-friendly, and all of them pure CSS over one shared markup. Switching template never changes the document, only how it is drawn.',
      ],
    },
    {
      id: 'custom-css',
      title: 'Custom CSS, and what it can reach',
      body: [
        'The CSS tab beside the Markdown applies to the paper and nothing else. It is injected into the preview inside `@layer custom`, the highest layer, so it beats the template without needing `!important` (and cannot reach the app around it.',
        'It travels with the resume: the HTML export inlines it, and the PDF is that exported file printed), so a rule written here is in every form of the document.',
      ],
      snippet: {
        language: 'css',
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
    {
      id: 'classes',
      title: 'The class names',
      body: [
        'One page: `.rp-page`. The header: `.rp-name`, `.rp-headline`, `.rp-contacts` and `.rp-contact`.',
        'A section: `.rp-section`, `.rp-section-title`, `.rp-section-rule`.',
        'An entry: `.rp-entry-title`, `.rp-entry-subtitle`, `.rp-entry-meta`, `.rp-entry-summary`, and `.rp-bullets` for its list.',
        'The rest: `.rp-tags` and `.rp-tag`, `.rp-icon-label`, `.rp-table`, `.rp-quote`, `.rp-code-block`, `.rp-figure` and `.rp-figure-caption`, `.rp-divider`, `.rp-link`.',
      ],
    },
    {
      id: 'refused',
      title: 'What is refused, and why',
      body: [
        '`@import`, and any `url()` that is not `data:` or `blob:`. Resivo is local-first, and a stylesheet that fetches is a stylesheet that announces itself, on every render.',
        '`@page` and `position: fixed`. Both would make the printed document disagree with the paginated preview, which is the one guarantee the preview exists to give.',
        '`expression()`, `behavior` and `-moz-binding`: the old routes from a stylesheet to running script. Long dead, cheap to refuse, and this text may be read years from now by a browser that is not this one.',
        'Nothing is dropped quietly: each refusal is reported as a warning with the line and column it was on.',
      ],
    },
    {
      id: 'limits',
      title: 'What CSS cannot do here',
      body: [
        'It cannot move a page break. Pagination is measured (every block is laid out once at the exact page width, measured, and then distributed into page boxes), and each box is assigned exactly one sheet.',
        "So an entry is never split across pages, a paragraph is never balanced across a break, and `break-inside`, `orphans` and `widows` are deliberately absent from the print stylesheet: there is no CSS fragmentation left for them to influence. Use `::pagebreak`, or a section's own setting, instead.",
      ],
    },
  ],
}

export const GUIDE: Array<GuideChapter> = [MARKDOWN_CHAPTER, STYLING_CHAPTER]

/**
 * The guide as one Markdown file.
 *
 * Generated rather than written, so "Copy the guide" cannot fall behind the
 * panel it was copied from. Backticks in the body survive as backticks: this is
 * Markdown going to a Markdown reader, and the panel strips them for display.
 */
export const guideMarkdown = (): string => {
  const lines: Array<string> = [
    '# Writing a resume in Resivo',
    '',
    'Resivo-Markdown is CommonMark and GFM plus a few directives, because a resume has structure that headings and lists cannot express.',
  ]

  for (const chapter of GUIDE) {
    lines.push('', `## ${chapter.title}`, '', chapter.intro)

    for (const section of chapter.sections) {
      lines.push('', `### ${section.title}`, '')
      lines.push(section.body.join('\n\n'))

      if (section.snippet !== undefined) {
        lines.push(
          '',
          '```' + section.snippet.language,
          section.snippet.code,
          '```',
        )
      }
    }
  }

  return `${lines.join('\n')}\n`
}

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
`
