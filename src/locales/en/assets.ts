/**
 * Images and fonts: the Assets tab in the inspector, the two pages of their own,
 * the dialogs that delete them, and why an upload was refused.
 */
export const assets = {
  images: {
    title: "Images",
    add: "Add image",
    stored_one: "{{count}} stored",
    stored_other: "{{count}} stored",
    empty:
      "No images yet. Add one and it is available to every resume on this device.",
    tooltip: "{{name}}, {{width}}×{{height}}, {{size}}",
    tooltipUnused: "{{name}}, {{width}}×{{height}}, {{size}}, unused",
    imageName: "Image name",
    usePhoto: "Use as photo",
    removePhoto: "Remove as photo",
    sectionTo: "Section to insert into",
    insertInto: "Insert into section…",
    insert: "Insert",
    usedByNone: "Used by no resume",
    inUse: "In use",
    delete: "Delete",
    untitledSection: "Untitled section",
  },
  fonts: {
    title: "Fonts",
    add: "Add font",
    empty:
      "The three built-in families need no upload. Add a WOFF2, WOFF, TrueType or OpenType file to use your own, it is embedded in an HTML export, so the file stays self-contained.",
    body: "Body",
    headings: "Headings",
  },
  card: {
    unused: "unused",
    italic: "italic",
    delete: "Delete",
  },
  dialogs: {
    deleteImage: {
      confirm: "Delete image",
      title: "Delete {{name}}?",
      fallbackName: "image",
      inUse:
        "A resume still refers to this image. Deleting it leaves that resume showing a missing-image box.",
      unused:
        "This image is not used by any resume. Deleting it frees the space it takes on this device.",
    },
    deleteFont: {
      confirm: "Delete font",
      title: "Delete {{name}}?",
      fallbackName: "font",
      inUse:
        "A resume is set in this font. Deleting it makes that resume print in a fallback face instead, which changes where its pages break.",
      unused:
        "No resume is set in this font. Deleting it frees the space it takes on this device.",
    },
  },
  imagesPage: {
    intro:
      "Images are stored on this device and shared by every resume on it, so the same photograph does not have to be uploaded twice. Nothing is deleted automatically: an image can be unused simply because it has not been placed yet.",
    stats: "{{count}} stored · {{size}} · {{unused}} unused",
    filter: "Filter images",
    filterAll: "All",
    filterUnused: "Unused",
    nameOf: "Name of {{name}}",
    meta: "{{width}}×{{height}} · {{size}}",
    metaUnused: "{{width}}×{{height}} · {{size}} · unused",
    emptyTitle: "No images yet",
    emptyBody:
      "Upload an image to use it as a photo or place it in a resume. It stays on this device and can be reused across resumes.",
    nothingUnusedTitle: "Nothing unused",
    nothingUnusedBody:
      "Every stored image is referenced by at least one resume.",
  },
  fontsPage: {
    intro:
      "Resivo ships with Instrument Sans, JetBrains Mono and Source Serif 4, which need no upload. Add a WOFF2, WOFF, TrueType or OpenType file to use your own, the browser’s own font parser validates it on upload, so a bad file is refused rather than silently falling back, and the face is embedded into an HTML export.",
    stats: "{{count}} stored · {{size}} · {{unused}} unused",
    emptyTitle: "No custom fonts",
    emptyBody:
      "Upload a WOFF2, WOFF or TrueType file to set a resume in your own typeface. It stays on this device and is embedded into exports.",
  },
  rejected: {
    image: {
      notDecodable:
        "That file could not be decoded as an image. It may be corrupt, or named with an extension that does not match its contents.",
      unsupported:
        "{{type}} is not a supported image. Use PNG, JPEG, WebP or GIF.",
      unsupportedUnknown:
        "That file is not a supported image. Use PNG, JPEG, WebP or GIF.",
      tooLarge:
        "That image is {{size}}. The limit is {{limit}}, export a smaller copy, since a resume prints it a few inches wide at most.",
    },
    font: {
      unreadable:
        "That file is not a font this browser can read. If it is an older format, converting it to WOFF2 usually works.",
      tooLarge:
        "That file is {{size}}. The limit is {{limit}}, which is generous for one weight of a text face.",
      notAFont:
        "That file is not a WOFF2, WOFF, TrueType or OpenType font, whatever its name says.",
    },
  },
} as const;
