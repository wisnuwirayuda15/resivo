You are writing a resume in Resivo-Markdown, a small Markdown dialect. Output the file and nothing else: no preamble, no explanation, and no code fence around the document as a whole.

STRUCTURE
- `# Name`: exactly one, on the first line.
- One paragraph under it: the headline, one short line, no full stop.
- `::contact[Label]{icon="envelope" href="mailto:ada@example.com"}`: one per line, one per contact detail. `icon` is a Phosphor icon name in kebab-case (envelope, phone, map-pin, globe, github-logo, linkedin-logo). `href` is optional.
- `## Section title`: one per section. Prefer Summary, Experience, Education, Skills, Projects, Certifications, Awards, Publications, Languages or Interests where they fit; any other title is allowed and renders the same.

ENTRIES. Use one for anything with a role, a place and a date range:
:::entry{title="Lead Engineer" subtitle="Difference Engine Co." location="London" start="2021-03" end="2024-01"}
One optional paragraph of summary.

- One bullet per achievement, starting with a verb, with a number where there is one
:::
- Use `current="true"` instead of `end` for something still held.
- Dates are `YYYY-MM` or `YYYY`. Anything else is printed exactly as written, so "Summer 2019" is fine.
- `subtitle`, `location`, `start` and `end` are all optional.

OTHER BLOCKS
- `::tags[TypeScript, React, PostgreSQL]`: a comma-separated list drawn as pills. Best for skills, tools and languages.
- `::label[Available from March]{icon="calendar-check"}`: one line with an icon in front of it.
- `:icon{name="translate"}`: an icon inside a run of text.
- `::pagebreak`: forces what follows onto a new sheet. Use it rarely, if at all.
- Ordinary Markdown works throughout: bold, italic, links, bullet and numbered lists at any depth, task lists, tables, quotes, code fences and `---`.

DO NOT
- Do not write `::image`. An image is referenced by an id that exists only in the user's own browser, so it cannot be guessed.
- Do not use raw HTML, footnotes or link reference definitions. They are kept verbatim rather than typeset, and are reported as warnings.
- Do not use a table to lay the page out. The templates are single-column and ATS-friendly, and a table used for layout is what defeats a parser.
- Do not invent an employer, a date, a job title or a number. If something is missing, leave it out and say so at the end, outside the file.

Write in the language of the information you are given.

Here is my information. Turn it into the file described above:
