/**
 * The frame around every page: the app bar, the sidebar, and the keyboard
 * sheet.
 */
export const shell = {
  appBar: {
    toggleSidebar: "Toggle sidebar",
    toggleNavigation: "Toggle navigation",
    toggleTheme: "Toggle theme",
    lightTheme: "Light theme",
    darkTheme: "Dark theme",
    applicationMenu: "Application menu",
    keyboardShortcuts: "Keyboard shortcuts",
    about: "About Resivo",
    takeTheTour: "Take the tour",
  },
  sidebar: {
    newResume: "New resume",
    allResumes: "All resumes",
    archived: "Archived",
    groups: "Groups",
    ungrouped: "Ungrouped",
    newGroup: "New group",
    library: "Library",
    templates: "Templates",
    images: "Images",
    fonts: "Fonts",
    settings: "Settings",
    privacy: "No account. No cloud.",
  },
  shortcuts: {
    title: "Keyboard shortcuts",
    or: "or",
    anywhere: {
      title: "Anywhere in the app",
      palette: "Open the command palette",
      sidebar: "Collapse or expand the sidebar",
      undo: "Undo the last change to the resume",
      redo: "Redo",
    },
    code: {
      title: "In the Markdown and CSS panes",
      note: "The code editor keeps its own history, so undo there means the text you typed rather than the document as a whole.",
      undo: "Undo typing, a step at a time",
      find: "Find in the pane",
      commands: "The code editor's own command list",
    },
    paper: {
      title: "On the paper, in Visual mode",
      note: "The paper is a document of its own, which is why a keystroke inside it does not reach the app around it.",
      edit: "Edit the highlighted text",
      keep: "Finish editing and keep the change",
      discard: "Finish editing and discard it",
    },
  },
} as const;
