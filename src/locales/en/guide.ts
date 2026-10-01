/**
 * The writing guide: the drawer's own labels and the prose of every chapter.
 *
 * The code in the guide (the Markdown and CSS snippets) is not here. It is the
 * same in every language and is parsed by the real codec in a test, so it lives
 * in `features/guide/content.ts` beside the ids that tie a snippet to its words.
 * What is here is what is said about them.
 *
 * Paragraphs are arrays, so a language that needs more or fewer sentences than
 * another is not forced into the same count, and a backtick pair marks a code
 * span the drawer draws as code.
 */
export const guide = {
  title: "Writing guide",
  button: "Guide",
  tabs: "Guide",
  copyPrompt: "Copy the AI prompt",
  copyGuide: "Copy this guide",
  copied: "Copied",
  promptNote:
    "The prompt states the whole format, and what not to write. Paste it into any assistant, add your history under it, and paste what comes back into the Markdown pane.",
  heading: "Writing a resume in Resivo",
  summary:
    "Resivo-Markdown is CommonMark and GFM plus a few directives, because a resume has structure that headings and lists cannot express.",
  chapters: {
    markdown: {
      title: "Markdown",
      intro:
        "The document is the Markdown. Everything on the paper comes from this file, and every edit made on the paper is written back into it, so a file in this shape is a finished resume, whoever or whatever typed it.",
      sections: {
        shape: {
          title: "The shape of the file",
          body: [
            "`#` is your name. There is one, it comes first, and it is the only thing the file has to have.",
            "The paragraph under it is the headline, the single line that sits beneath your name.",
            "`##` opens a section, and its text is that section's title. A handful of titles also tell a template what kind of section it is: Summary, Experience, Education, Skills, Projects, Certifications, Awards, Publications, Languages, Interests. Any other title is fine and renders identically.",
            "A file written with `###` headings instead works as pasted: the shallowest heading level in the file is taken as the section level, and normalised on the first save.",
          ],
        },
        contacts: {
          title: "Contacts",
          body: [
            "One `::contact` per line, one per detail. The text in brackets is what prints; `icon` is a Phosphor icon name in kebab-case, and `href` is optional. With it, the line becomes a link in the PDF and the HTML export.",
            "The Sections tab in the inspector has a picker for all of this, so the icon name never has to be guessed by hand.",
          ],
        },
        entries: {
          title: "Entries",
          body: [
            "An entry is the one block a heading convention cannot express. `### Lead Engineer, Difference Engine Co., London (2021-2024)` means guessing at punctuation to get the four facts back out, and guessing is what makes a round trip lossy. So they are written as attributes.",
            'All of `subtitle`, `location`, `start` and `end` are optional. `current="true"` replaces `end` for something still held.',
            'Dates are `YYYY-MM` or `YYYY`, and are formatted for the document\'s locale. Anything else is printed exactly as typed, so "Summer 2019" is a valid date range and not an error.',
            "Inside the block, the first paragraph is the entry's summary and the list is its bullets.",
          ],
        },
        tags: {
          title: "Skills, labels and icons",
          body: [
            "`::tags` takes a comma-separated list and draws it as pills, the right shape for skills, tools and languages.",
            "`::label` is one line with an icon in front of it. `:icon` puts one inside a run of text, mid-sentence.",
            "Both take a `weight`: thin, light, regular, bold, fill or duotone. All 1512 Phosphor icons are available in all six, and the inspector's picker searches them.",
          ],
        },
        imagesBreaks: {
          title: "Images and page breaks",
          body: [
            "`::pagebreak` forces whatever follows it onto a new sheet. A section can also be set to start on one, from the Sections tab, and one document-wide setting decides whether a heading may be the last thing on a page.",
            "An image is referenced by an id, and that id belongs to this browser's database, so it cannot be written by hand or guessed. Add the image from the Assets tab and the directive is written for you; `width` is a percentage of the text column, and the paper's own controls set it.",
          ],
        },
        ordinary: {
          title: "Everything else is ordinary Markdown",
          body: [
            "CommonMark and GFM, and all of it is typeset: headings, bullet and numbered lists at any depth, task lists, tables, quotes, code fences, thematic breaks, and bold, italic and links inline.",
            "What the model cannot represent (raw HTML, footnotes, link reference definitions) is kept verbatim and reported as a warning rather than silently dropped. Text that arrives above the first heading goes into an untitled section instead of being refused.",
          ],
        },
      },
    },
    styling: {
      title: "Styling",
      intro:
        "Most of styling here is not CSS. The Style tab is a control for every design token the templates read, and moving one there is both easier and safer than overriding it: the paper is measured at those values, so the pagination stays correct.",
      sections: {
        tokens: {
          title: "Try the Style tab first",
          body: [
            "Paper size and margins, the type family and its scale, colour, vertical rhythm, section rules, icon defaults, and where pages are allowed to break: all of it is a control rather than a rule to write.",
            "Every template is single-column and ATS-friendly, and all of them are pure CSS over one shared markup. Switching template never changes the document, only how it is drawn.",
          ],
        },
        customCss: {
          title: "Custom CSS, and what it can reach",
          body: [
            "The CSS tab beside the Markdown applies to the paper and nothing else. It is injected into the preview inside `@layer custom`, the highest layer, so it beats the template without needing `!important`, and it cannot reach the app around it.",
            "It travels with the resume: the HTML export inlines it, and the PDF is that exported file printed, so a rule written here is in every form of the document.",
          ],
        },
        classes: {
          title: "The class names",
          body: [
            "One page: `.rp-page`. The header: `.rp-name`, `.rp-headline`, `.rp-contacts` and `.rp-contact`.",
            "A section: `.rp-section`, `.rp-section-title`, `.rp-section-rule`.",
            "An entry: `.rp-entry-title`, `.rp-entry-subtitle`, `.rp-entry-meta`, `.rp-entry-summary`, and `.rp-bullets` for its list.",
            "The rest: `.rp-tags` and `.rp-tag`, `.rp-icon-label`, `.rp-table`, `.rp-quote`, `.rp-code-block`, `.rp-figure` and `.rp-figure-caption`, `.rp-divider`, `.rp-link`.",
          ],
        },
        refused: {
          title: "What is refused, and why",
          body: [
            "`@import`, and any `url()` that is not `data:` or `blob:`. Resivo is local-first, and a stylesheet that fetches is a stylesheet that announces itself, on every render.",
            "`@page` and `position: fixed`. Both would make the printed document disagree with the paginated preview, which is the one guarantee the preview exists to give.",
            "`expression()`, `behavior` and `-moz-binding`: the old routes from a stylesheet to running script. Long dead, cheap to refuse, and this text may be read years from now by a browser that is not this one.",
            "Nothing is dropped quietly: each refusal is reported as a warning with the line and column it was on.",
          ],
        },
        limits: {
          title: "What CSS cannot do here",
          body: [
            "It cannot move a page break. Pagination is measured (every block is laid out once at the exact page width, measured, and then distributed into page boxes), and each box is assigned exactly one sheet.",
            "So an entry is never split across pages, a paragraph is never balanced across a break, and `break-inside`, `orphans` and `widows` are deliberately absent from the print stylesheet: there is no CSS fragmentation left for them to influence. Use `::pagebreak`, or a section's own setting, instead.",
          ],
        },
      },
    },
  },
} as const;
