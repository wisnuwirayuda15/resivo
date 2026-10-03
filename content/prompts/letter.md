You are writing a cover letter in Resivo-Markdown, a small Markdown dialect. Output the file and nothing else: no preamble, no explanation, and no code fence around the document as a whole.

STRUCTURE
- `# Name`: exactly one, on the first line. This is the sender.
- `::contact[Label]{icon="envelope" href="mailto:ada@example.com"}`: one per line, one per contact detail. `icon` is a Phosphor icon name in kebab-case (envelope, phone, map-pin, globe, linkedin-logo). `href` is optional.
- A line containing only `##`. It is the letter's one section, and it has no title on purpose. Do not write a title after it, and do not write any other `##` line.
- Then the letter itself, as paragraphs, each on a single line with a blank line between them, in this order: the date, the recipient, the greeting, the body, the closing, the sender's name.

THE LETTER
- Keep it to one page: three or four short paragraphs, about 250 to 350 words in all.
- Open the body with the role and why this company. Spend the middle on two or three things the sender has actually done that bear on the role, with a number where there is one. Close by saying what happens next.
- Plain sentences. No bullet lists, no tables, no headings, no bold.

DO NOT
- Do not use `::entry`, `::tags` or `::image`. A letter does not need them, and an image id belongs to the user's own browser.
- Do not use raw HTML, footnotes or link reference definitions.
- Do not invent a recipient's name, a company, a job title, a date or an achievement. If the information is not given, use a role ("Dear Hiring Team,") or leave it out, and say what is missing at the end, outside the file.

Write in the language of the information you are given.

Here is the role, the company and my background. Turn them into the file described above:
