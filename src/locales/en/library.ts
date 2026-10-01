/**
 * The library: the grid of resumes, a card and its menu, the dialogs that make
 * and rename things, and the groups.
 *
 * Counts use i18next's plural suffixes. Indonesian has no singular form, and
 * writes both suffixes with the same text so that the two languages have the
 * same keys, which is what the type check and the parity test compare.
 */
export const library = {
  title: {
    all: "All resumes",
    archived: "Archived",
  },
  search: {
    placeholder: "Search resumes",
    label: "Search resumes",
    noMatches: "No matches",
    noMatchesBody:
      'Nothing in this view matches "{{query}}". Try a shorter search, or clear it to see everything.',
  },
  sort: {
    label: "Sort resumes",
    by: "Sort by",
    edited: "Last edited",
    created: "Date created",
    name: "Name",
  },
  newResume: "New resume",
  empty: {
    none: "No resumes yet",
    noneBody:
      "Create a resume to get started. Everything you write stays on this device.",
    group: "Nothing in {{group}}",
    groupBody: "Move a resume into this group, or create one here.",
    archived: "Nothing archived",
    archivedBody:
      "Archiving hides a resume from the library without deleting it. Archived resumes show up here.",
  },
  card: {
    edited: "Edited",
    more: "More",
    actions: "Actions for {{title}}",
    rename: "Rename",
    duplicate: "Duplicate",
    moveTo: "Move to",
    archive: "Archive",
    restore: "Restore",
    delete: "Delete",
  },
  delete: {
    title: 'Delete "{{title}}"?',
    body: "It is removed from this device and cannot be recovered. Archive it instead to keep it out of the way.",
    confirm: "Delete",
  },
  rename: {
    title: "Rename resume",
    name: "Name",
    submit: "Rename",
  },
  create: {
    title: "New resume",
    template: "Template",
    startFrom: "Start from",
    example: "Example resume",
    blank: "Blank page",
    exampleHint:
      "A finished resume to edit over, with entries, dates and a skills list already written.",
    blankHint: "The four sections almost every resume has, each empty.",
    importedHint: "The imported file decides what is on the page.",
    name: "Name",
    namePlaceholder: "Staff Engineer 2026",
    group: "Group",
    noGroup: "No group",
    importMarkdown: "Import Markdown",
    chooseAnother: "Choose another file",
    submit: "Create resume",
    tooBig:
      "{{name}} is {{size}} KB. Markdown resumes are a few kilobytes; this is probably not one.",
    empty: "{{name}} is empty.",
    readClean: "Read with nothing left over.",
    readWarnings_one:
      "Read. {{count}} line could not be typeset and is kept as source text, the editor points at it.",
    readWarnings_other:
      "Read. {{count}} lines could not be typeset and are kept as source text, the editor points at each one.",
  },
  group: {
    ungrouped: "Ungrouped",
    newTitle: "New group",
    name: "Name",
    placeholder: "Applications",
    create: "Create group",
    actions: "Actions for {{name}}",
    rename: "Rename",
    renameTitle: "Rename group",
    delete: "Delete group",
    deleteTitle: "Delete {{name}}?",
    deleteEmpty: "The group is empty, so nothing else changes.",
    deleteSome_one:
      "The resume in it becomes ungrouped. Nothing is deleted but the group itself.",
    deleteSome_other:
      "The {{count}} resumes in it become ungrouped. Nothing is deleted but the group itself.",
  },
} as const;
