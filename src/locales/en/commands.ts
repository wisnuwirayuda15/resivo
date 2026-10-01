/**
 * The command palette. `keywords` are what a query is matched against besides
 * the label, so they are translated too, and the Indonesian ones carry the
 * English words as well: a person who knows the English name of a thing should
 * still find it.
 */
export const commands = {
  groups: {
    create: "Create",
    goTo: "Go to",
    app: "This app",
  },
  newResume: {
    label: "New resume",
    description: "Pick a template, or import a file",
    keywords: "create add import",
  },
  newLetter: {
    label: "New cover letter",
    description: "Write a letter to go with a resume",
    keywords: "create add letter application",
  },
  newGroup: {
    label: "New group",
    description: "A folder for a set of resumes",
    keywords: "create add folder",
  },
  resumes: { label: "All resumes", keywords: "library home" },
  archive: { label: "Archived", keywords: "hidden" },
  templates: {
    label: "Templates",
    description: "What each layout is for, and how it reads to a parser",
    keywords: "ats layout design",
  },
  images: {
    label: "Images",
    description: "Every image on this device, and what nothing uses",
    keywords: "photo avatar assets unused",
  },
  fonts: {
    label: "Fonts",
    description: "Uploaded typefaces",
    keywords: "typeface assets woff",
  },
  settings: {
    label: "Settings",
    description: "Back up and restore, and what the device is holding",
    keywords: "backup restore export storage language",
  },
  about: { label: "About Resivo", keywords: "help privacy local" },
  theme: {
    light: "Light theme",
    dark: "Dark theme",
    keywords: "dark light appearance colour color",
  },
  sidebar: {
    label: "Toggle sidebar",
    description: "Collapse it to a rail of icons, or bring it back",
    keywords: "navbar rail collapse expand hide narrow",
  },
  shortcuts: { label: "Keyboard shortcuts", keywords: "keys help bindings" },
  tour: {
    label: "Take the tour",
    description: "A short walk through what is worth knowing",
    keywords: "onboarding help guide intro",
  },
  language: {
    label: "Switch language to {{language}}",
    keywords: "language bahasa translate locale",
  },
  nothingFound: "No command matches that.",
  search: "Search commands…",
} as const;
