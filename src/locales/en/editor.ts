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
    },
    failed: "The export could not be written.",
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
    imageWidth: "Image width",
    drag: "Drag to move",
    moveUp: "Move up",
    moveDown: "Move down",
    delete: "Delete",
  },
  route: {
    couldNotOpen: "This resume could not be opened",
    couldNotRead: "The stored document could not be read.",
    notFound: "Resume not found",
    notFoundBody:
      "It may have been deleted on this device. Go back to the library to see what is there.",
    untitled: "Resume",
  },
} as const;
