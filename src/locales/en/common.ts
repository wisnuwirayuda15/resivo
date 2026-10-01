/**
 * Words used in more than one place. A string that is only ever on one screen
 * belongs in that screen's namespace, so this stays short.
 */
export const common = {
  cancel: "Cancel",
  close: "Close",
  delete: "Delete",
  save: "Save",
  rename: "Rename",
  reload: "Reload",
  errors: {
    somethingWrong: "Something went wrong",
    somethingWrongBody:
      "Your resumes are stored on this device and are unaffected. Reload to try again.",
    notFound: "Page not found",
    notFoundBody: "That address does not exist in Resivo.",
    goToResumes: "Go to resumes",
  },
} as const;
