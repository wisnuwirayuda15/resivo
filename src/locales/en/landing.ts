/**
 * The public pages: the landing page at `/`, the About page, and the template
 * gallery. They are rendered on the server, in English, and move to the reader's
 * language once the page is on screen (see `lib/i18n/language.ts`).
 *
 * The page titles and descriptions a search engine reads are not here. They are
 * part of each route's `head`, which runs on the server and has no reader yet,
 * so they stay English and stay stable.
 */
export const landing = {
  nav: {
    templates: "Templates",
    about: "About",
    docs: "Docs",
    logo: "Resivo",
    openApp: "Open the app",
    lightTheme: "Light theme",
    darkTheme: "Dark theme",
    github: "Resivo on GitHub",
  },
  hero: {
    title: "Your resume never leaves this browser.",
    body: "Write it in Markdown, style it with real CSS, and export a PDF that matches the page exactly.",
    openApp: "Open the app",
    seeTemplates: "See the templates",
  },
  tour: {
    title: "The whole app in 28 seconds.",
    body: "Markdown in, seven templates, the ATS check, light and dark, and every export format. The film is made from the app's own code, so what it shows is what the app does.",
    label: "A 28 second tour of Resivo",
  },
  surfaces: {
    title: "Three ways to edit it. One document underneath.",
    markdown: {
      title: "Markdown",
      body: "CommonMark and GFM, plus a few directives for the things a heading convention cannot get back out again.",
    },
    paper: {
      title: "The paper",
      body: "Click any line to change it where it sits, or drag a block to move it. The page you edit is the page that prints.",
    },
    style: {
      title: "The style panel",
      body: "Every design token: paper size, margins, type, colour, rules, icons, and where the pages break.",
    },
    note: "A slider, a drag on the page and a keystroke in the Markdown all write to the same model, which is why one undo history covers all three.",
  },
  showcase: {
    title: "Every template is single column.",
    body: "Each is pure CSS over the same markup, so switching never rewrites what you wrote. Single column with headings in document order is also what an applicant tracking system can actually read.",
  },
  localFirst: {
    title: "No account. No server. No copy anywhere else.",
    body: "A resume is a document about you: where you live, who employs you, what you are paid. All of it stays in this browser, on this device. There is no backend to breach and no account to delete.",
    price:
      "That has a price, and it is worth knowing now rather than the first time it matters. Clearing this browser’s storage deletes your resumes. The backup file in Settings is the only thing that survives it, and writing one takes a click.",
  },
  capabilities: {
    title: "What the app does when you are not looking.",
    breaks: {
      title: "Page breaks are measured, not guessed",
      body: "Every block is laid out once at the real page width, measured, then placed. An entry never breaks mid-entry, and the export reuses the breaks the preview already found rather than working them out again.",
    },
    markdown: {
      title: "Markdown that comes back out",
      body: "Raw HTML, footnotes and link definitions are kept verbatim and reported, never dropped in silence.",
    },
    icons: {
      title: "1512 icons, six weights",
      body: "Searchable, and inlined as real SVG so they survive an export.",
    },
    assets: {
      title: "Images and fonts, shared",
      body: "Uploaded once and available to every resume on this device. Both pages also show what nothing refers to any more.",
    },
    keyboard: {
      title: "Everything from the keyboard",
      body: "A command palette over every page and command, with the shortcuts listed where you can find them.",
    },
    css: {
      title: "Your own stylesheet, scoped to the paper",
      body: "Sanitized on the way in, with no imports and no external requests, and injected into a cascade layer above the template. It can restyle the page and it cannot reach the app around it or break the pagination it was measured against.",
    },
  },
  closing: {
    title: "Start with a blank page.",
    body: "Nothing to sign up for. The first resume takes one click and a name.",
    openApp: "Open the app",
    footer: "Everything you write stays on this device.",
    settings: "Settings",
  },
  sourcePanel: {
    file: "resume.md",
  },
  about: {
    title: "About Resivo",
    keeps: {
      title: "A resume builder that keeps your resume",
      body: "A resume is a document about you: where you live, who employs you, what you are paid. Resivo keeps all of it in this browser, on this device. There is no account, no server, and no request that carries your data anywhere.",
    },
    costs: {
      title: "What that costs",
      body: "Clearing this browser’s storage deletes your resumes, and there is no copy anywhere else to fall back on. A private window keeps nothing after it closes, and another device sees none of this. The backup file in <settings>Settings</settings> is the only thing that survives a cleared browser or a lost machine, it is worth writing one now rather than the first time it matters.",
    },
    how: {
      title: "How it works",
      body: "One document, three ways to edit it: Markdown, the paper itself, and the style panel. All three write to the same model, which is what keeps a single undo history coherent across them. The preview is a document of its own rather than a styled box in the app, so what you are looking at is what a PDF export prints, page breaks are measured from the real thing rather than guessed.",
    },
    exports: {
      title: "Exports and imports",
      body: "HTML is a single file with no external reference of any kind, images, uploaded fonts and the bundled typefaces are all inlined, so it opens on a machine that has never seen Resivo. PDF is that same file, printed. Markdown round-trips: what the app cannot typeset is kept verbatim and reported rather than dropped.",
    },
    ats: {
      title: "Templates and ATS",
      body: "Every <templates>template</templates> is single-column and parser-safe: no tables holding the layout, no text in images, no two-column reading order for a machine to scramble. They differ in typeface, spacing, and how much hierarchy comes from rules rather than type size.",
    },
  },
  templatesPage: {
    title: "Templates",
    intro:
      "Every template is single-column and parser-safe. They differ in typeface, spacing and how much hierarchy comes from rules rather than type size.",
  },
} as const;
