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
    letters: "Cover letters",
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
    letterBadge: "Cover letter",
    createLetter: "Create cover letter",
    letterTitle: "{{title}} cover letter",
    exportZip: "Export as zip",
    exportFailed: "The bundle for {{title}} could not be written.",
  },
  bundle: {
    rejected: {
      notZip: "That file is not a zip archive, so it is not a Resivo bundle.",
      notBundle:
        "That zip is not a Resivo resume bundle. A bundle holds a manifest that names it.",
      newer:
        "That bundle was written by a newer version of Resivo (format {{version}}, this build reads {{supported}}). Update before importing it. Nothing was changed.",
      missing: "The bundle is missing {{name}}. Nothing was changed.",
      unreadable:
        "The bundle could not be read: {{detail}}. Nothing was changed.",
      document:
        "The resume inside the bundle is not valid: {{detail}} Nothing was changed.",
      corrupt:
        "{{name}} does not match the checksum recorded in the bundle, so it is damaged. Nothing was changed.",
      tooLarge:
        "That bundle is {{size}}. The limit is {{limit}}, and a resume is far smaller.",
      entryTooLarge:
        "{{name}} inside the bundle is {{size}}, over the {{limit}} limit for one file.",
      tooManyEntries:
        "The bundle holds more than {{limit}} files, which no resume does.",
    },
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
    kind: "Kind of document",
    kindResume: "Resume",
    kindLetter: "Cover letter",
    exampleLetter: "Example letter",
    blankLetter: "Blank letter",
    exampleLetterHint:
      "A finished letter to write over, with a greeting, three paragraphs and a sign-off already there.",
    blankLetterHint:
      "Your name and contacts at the top and one empty page to write on.",
    importedHint: "The imported file decides what is on the page.",
    name: "Name",
    namePlaceholder: "Staff Engineer 2026",
    group: "Group",
    noGroup: "No group",
    importFile: "Import a file",
    chooseAnother: "Choose another file",
    submit: "Create resume",
    tooBig:
      "{{name}} is {{size}} KB. A resume file is a few kilobytes; this is probably not one.",
    empty: "{{name}} is empty.",
    bundleHint:
      "A bundle keeps its own template and style, so the template chosen above is not used.",
    templateChanged:
      "The template has changed since this bundle was exported (revision {{from}}, now {{to}}), so a page may break differently from the original.",
    importHint:
      "Markdown, JSON Resume, plain text, or a Resivo bundle (.zip). The headings in a text file decide its sections, so check them over once it opens.",
    readClean: "Read with nothing left over.",
    dropped: "Left out, because a resume here has no place for it: {{fields}}.",
    droppedFields: {
      image: "the photograph",
      urls: "links on jobs, schools and projects",
      score: "grades",
      courses: "courses",
      level: "skill levels",
      keywords: "project keywords",
    },
    errors: {
      invalidJson: "That file is not valid JSON.",
      notJsonResume:
        "That JSON file is not a JSON Resume, so there is nothing here to read as a resume.",
      invalid: "That file could not be turned into a resume. {{detail}}",
    },
    readWarnings_one:
      "Read. {{count}} line could not be typeset and is kept as source text, the editor points at it.",
    readWarnings_other:
      "Read. {{count}} lines could not be typeset and are kept as source text, the editor points at each one.",
  },
  version: {
    action: "Create version for a job",
    title: "New version",
    intro:
      "A copy of {{title}} to tailor for one job. It is a resume of its own, and the two stay comparable.",
    company: "Company",
    role: "Role",
    url: "Posting link",
    urlHint: "Optional. Where the posting is, for when it is time to prepare.",
    urlInvalid: "A link starts with http:// or https://",
    companyRequired: "Say which company it is for.",
    titleFor: "{{title}} for {{company}}",
    submit: "Create version",
    for: "For {{company}}, {{role}}",
    forCompany: "For {{company}}",
    count_one: "{{count}} version",
    count_other: "{{count}} versions",
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
