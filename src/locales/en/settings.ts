/**
 * The Settings page: the interface language, backup and restore, what the device
 * is holding, and installing the app.
 */
export const settings = {
  language: {
    title: "Language",
    description:
      "The language of menus, dialogs and messages. It does not translate what you write in a resume, which has a language setting of its own in the style panel.",
    label: "Interface language",
  },
  backup: {
    title: "Backup and restore",
    intro:
      "Everything Resivo stores lives in this browser, on this device. There is no copy anywhere else, so a backup is the only thing that survives a cleared browser or a lost machine.",
    backUp: "Back up",
    backUpBody:
      "Writes every resume, group, image and font on this device to one JSON file. Nothing is sent anywhere, the file is saved by your browser.",
    download: "Download backup",
    restore: "Restore",
    restoreBody:
      "Adds the contents of a backup to this device. Nothing already here is replaced or deleted: a resume that collides with one you already have is restored beside it, marked <code>(restored)</code>, and an image whose bytes are already stored is not duplicated.",
    choose: "Choose a backup file",
    restoring: "Restoring…",
    failedTitle: "Nothing was restored",
    restoredTitle: "Restored",
    writeFailed: "The backup could not be written.",
    restoreFailed: "That file could not be restored.",
    summary: {
      resumes_one: "{{count}} resume restored",
      resumes_other: "{{count}} resumes restored",
      alongside: "({{count}} kept alongside an existing copy)",
      groups_one: "{{count}} group restored",
      groups_other: "{{count}} groups restored",
      images_one: "{{count}} image restored",
      images_other: "{{count}} images restored",
      imagesPresent_one:
        "{{count}} image was already stored, so it was not duplicated",
      imagesPresent_other:
        "{{count}} images were already stored, so they were not duplicated",
      fonts_one: "{{count}} font restored",
      fonts_other: "{{count}} fonts restored",
      fontsPresent_one: "{{count}} font was already stored",
      fontsPresent_other: "{{count}} fonts were already stored",
      settings_one:
        "{{count}} setting restored, leaving the ones this device already had",
      settings_other:
        "{{count}} settings restored, leaving the ones this device already had",
      empty: "That backup was empty. Nothing changed.",
    },
    rejected: {
      notJson: "That file is not valid JSON, so it is not a Resivo backup.",
      notBackup:
        'That JSON file is not a Resivo backup. A backup starts with "kind": "{{kind}}".',
      newer:
        "That backup was written by a newer version of Resivo (format {{version}}, this build reads {{supported}}). Update before restoring it, restoring it here could lose part of it.",
      unreadable: "That backup could not be read. Nothing was changed.",
      unreadableAt:
        "That backup could not be read: {{detail}} (at {{path}}). Nothing was changed.",
    },
  },
  storage: {
    title: "Storage",
    intro:
      "Every image and font is stored once and shared by every resume on this device.",
    images: "Images",
    fonts: "Fonts",
    files_one: "{{count}} file",
    files_other: "{{count}} files",
    unused: "{{count}} unused",
    note: "Resumes themselves are text and take a negligible amount of room; images and fonts are what a device notices. Nothing is deleted automatically, because an asset can be unused simply because it has not been placed yet: the Images and Fonts pages are where that decision is made.",
  },
  install: {
    title: "Install on this device",
    intro:
      "Resivo can be installed like any other application, and once it is cached it opens whether or not there is a network.",
    installed: "Installed on this device, and running in its own window.",
    button: "Install Resivo",
    availableBody:
      "Installing puts Resivo in your dock, taskbar or home screen. It gets a window of its own with no address bar, and opens at your resumes rather than at the landing page. Nothing is uploaded and nothing changes about where your data is kept.",
    notOffered:
      "This browser has not offered to install Resivo. Where installing is supported, the address bar carries an install icon; on an iPhone or iPad it is Share, then Add to Home Screen.",
    cache: {
      ready:
        "The app itself is cached on this device, so it opens and runs with no network at all.",
      pending:
        "The app has just been cached on this device. The next time it is opened it will work with no network.",
      absent:
        "The app is not cached on this device yet, so opening it still needs a connection. Your resumes are stored here either way.",
    },
  },
} as const;
