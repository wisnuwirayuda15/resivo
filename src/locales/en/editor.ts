/**
 * The editor: its panes, the save readout, undo and redo, the strip above the
 * paper, the controls drawn on the paper while editing, and export.
 *
 * What a parser says about a line of Markdown or CSS is not here. Those
 * messages come out of the codecs with a line and a column and are shown as
 * editor markers, in English, as a compiler's would be.
 */
export const editor = {
  panes: {
    label: "Editor panes",
    code: "Code",
    paper: "Paper",
    style: "Style",
  },
  code: {
    sourceFiles: "Source files",
    guide: "Guide",
    guideHint: "The format, in the documentation. Opens in a new tab.",
    notices_one: "{{count}} notice",
    notices_other: "{{count}} notices",
  },
  history: {
    undo: "Undo ({{shortcut}})",
    redo: "Redo ({{shortcut}})",
  },
  save: {
    saved: {
      label: "Saved",
      detail: "Written to this device. There is no copy anywhere else.",
    },
    saving: {
      label: "Saving",
      detail: "Writing to this device.",
    },
    error: {
      label: "Not saved",
      detail:
        "The last write failed, and this resume is not on disk. Your edits are still on screen, export a copy before closing the tab.",
    },
  },
  export: {
    button: "Export",
    print: "Print",
    file: "File",
    pdf: {
      name: "PDF",
      hint: "Prints the exported document. Choose “Save as PDF”, and leave the scale and margins as they are.",
    },
    formats: {
      html: {
        hint: "One self-contained file. Same layout as the preview, no network.",
      },
      markdown: {
        hint: "Content only, in the same dialect the editor reads. Styling is lost.",
      },
      "json-resume": {
        hint: "Content in the JSON Resume format other tools read. Sections with no equivalent are left out.",
      },
      text: {
        hint: "Plain text with no styling, for a form that asks you to paste your resume.",
      },
      bundle: {
        hint: "This resume with its images, fonts and style. Import it anywhere and it looks the same.",
      },
    },
    letterFile: "{{name}} cover letter",
    failed: "The export could not be written.",
  },
  versions: {
    chip: "Version for {{company}}",
    chipAria: "This resume is a version for {{company}}",
    openBase: "Open {{title}}",
    compare: "Compare",
    title: "Changes from {{title}}",
    intro: "What this version has that {{title}} does not, and what it lacks.",
    identical: "Nothing differs from {{title}} yet.",
    noSharedIdentity:
      "These two share no sections by identity, which is what happens when one had its Markdown replaced whole. Everything below is therefore shown as new, and a line-by-line comparison is not possible.",
    header: {
      name: "Name",
      headline: "Headline",
      contact: "Contact",
    },
    settings: {
      template: "A different template",
      design: "Different style settings",
      customCss: "Different custom CSS",
    },
    section: {
      added: "Section added",
      removed: "Section removed",
      moved: "Moved",
      hidden: "Hidden here",
      shown: "Shown here",
      renamed: "Renamed from {{from}}",
      style: "Style differs",
    },
    block: {
      added: "Added",
      removed: "Removed",
      changed: "Changed",
      moved: "Moved",
      formatOnly: "Same words, different formatting",
    },
    unchanged_one: "{{count}} section is unchanged.",
    unchanged_other: "{{count}} sections are unchanged.",
  },
  preview: {
    pages_one: "{{count}} page",
    pages_other: "{{count}} pages",
    paperSize: "Paper size",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    fitWidth: "Fit width",
    mode: "Preview mode",
    read: "Read",
    visual: "Visual",
    paperAndZoom: "Paper and zoom",
    paper: "Paper",
    zoom: "Zoom",
    frameTitle: "Resume preview",
    page: "Page {{number}}",
  },
  chrome: {
    insertBreak: "Insert a page break after this",
    insert: "Insert a block after this",
    insertPlaceholder: "Insert",
    duplicate: "Duplicate",
    resize: "Drag to resize",
    sectionBreak: "Start this section on a new page",
    sectionBreakOff: "Stop this section starting on a new page",
    confirmDelete: "Press again to delete this section and everything in it",
    sure: "Sure?",
    placeholder: "Click to write",
    blocks: {
      paragraph: "Paragraph",
      heading: "Heading",
      bulletList: "Bulleted list",
      entry: "Entry",
      quote: "Quote",
      divider: "Divider",
      pageBreak: "Page break",
    },
    imageWidth: "Image width",
    drag: "Drag to move",
    menu: "Item actions",
    moveUp: "Move up",
    moveDown: "Move down",
    delete: "Delete",
  },
  route: {
    couldNotOpen: "This document could not be opened",
    couldNotRead: "The stored document could not be read.",
    notFound: "Document not found",
    notFoundBody:
      "It may have been deleted on this device. Go back to the library to see what is there.",
    untitled: "Untitled",
  },
} as const;
