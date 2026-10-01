/**
 * What each template is, for the picker and the gallery.
 *
 * Keyed by template id, so the catalog in `features/templates/catalog.ts` holds
 * only what is not words and a template is described by one block here.
 */
export const templates = {
  classic: {
    name: "Classic",
    description:
      "A traditional single-column resume in a serif face, with ruled section headings.",
    atsNotes:
      "Single column, no tables, no columns, headings in document order. The safest choice for automated parsing.",
  },
  modern: {
    name: "Modern",
    description:
      "A clean contemporary layout in a sans face, using weight and space instead of rules.",
    atsNotes:
      "Single column with generous spacing. Section headings stay literal text, so parsers read them normally.",
  },
  technical: {
    name: "Technical",
    description:
      "A denser layout with monospace headings, suited to engineering roles with long skill lists.",
    atsNotes:
      "Smaller body size fits more content per page. Skills render as plain comma-separated text rather than chips, which parses reliably.",
  },
  editorial: {
    name: "Editorial",
    description:
      "A serif layout with a large name and generous leading, for writing and design roles.",
    atsNotes:
      "Dividers are off by default and hierarchy comes from type size. Still single column and parser-safe.",
  },
} as const;
