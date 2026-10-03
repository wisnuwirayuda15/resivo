/**
 * The two first-run tours, one step at a time, and the buttons on them.
 *
 * Chosen for what a new user would otherwise miss rather than for what is
 * obvious: that the backup in Settings is the only copy of a local-first
 * document is the sentence this app most needs someone to read before they need
 * it.
 */
export const onboarding = {
  buttons: {
    next: "Next",
    end: "End",
    prev: "Prev",
    skip: "Skip",
  },
  library: {
    newResume: {
      title: "Start here",
      content:
        "Pick a single-column template, or import a Markdown file you already have, the importer keeps what it cannot typeset rather than dropping it.",
    },
    assets: {
      title: "Images and fonts are shared",
      content:
        "Uploaded once and available to every resume on this device, so the same photograph never has to be added twice. Both pages also show what nothing refers to any more, which is the only safe way to reclaim the space.",
    },
    settings: {
      title: "This is the important one",
      content:
        "Everything lives in this browser and nowhere else. Clearing its storage deletes your resumes, and no server has a copy. The backup file in Settings is the only thing that survives that, writing one now is cheaper than wishing you had.",
    },
    appMenu: {
      title: "Everything, from the keyboard",
      content:
        "Ctrl+K (or Cmd+K) opens a command palette over the whole app: every page, every command, searchable. The menu here lists the other shortcuts, and is where this tour can be started again.",
    },
  },
  editor: {
    code: {
      title: "Markdown, and your own CSS",
      content:
        "Two tabs. The Markdown is the document (headings, lists, tables, task lists), and the CSS is yours to restyle the paper with. It is sanitized and scoped, so it cannot reach the app around it or break the pagination it was measured against.",
    },
    guide: {
      title: "Every directive, with an example",
      content:
        "The format is Markdown plus a few directives (an entry, a contact, a list of skills). This opens the documentation on it in a new tab: each directive written down with an example that is checked against the real parser, and a prompt that states the whole format to an assistant, including what never to write, so a resume you asked one for comes back in a shape this app can read.",
    },
    paper: {
      title: "The paper is editable too",
      content:
        "Switch to Visual and click any text to change it in place, or drag a block to move it. Every edit goes to the same document as the Markdown, which is why one undo history covers all of it.",
    },
    paperTitlebar: {
      title: "Export is the same document",
      content:
        "HTML is one self-contained file (images and fonts inlined, no external reference of any kind), and PDF is that same file printed, so the two cannot disagree. Markdown uses the same writer the editor reads.",
    },
    inspector: {
      title: "Four tabs worth knowing",
      content:
        "Style is every design token: paper size, margins, type, colour, rules, and where pages break. Sections is the outline: reorder, hide, add an icon, start a section on a new page. Assets places an image or sets the resume in an uploaded face. ATS lists the common ways a resume reads badly to an applicant tracking system, and fixes some of them in one click.",
    },
    history: {
      title: "Nothing here is one-way",
      content:
        "Undo and redo cover the document, whichever surface the change came from: a slider, a drag, a keystroke on the paper. Autosave writes to this device as you go.",
    },
  },
} as const;
