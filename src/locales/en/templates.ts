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
  compact: {
    name: "Compact",
    description:
      "A dense sans layout with tight rhythm, for a long history that has to stay on few pages.",
    atsNotes:
      "Body text is 9.5pt with 0.5in margins, the smallest the ATS check accepts. Single column, so it reads in order.",
  },
  profile: {
    name: "Profile",
    description:
      "A header built around your photograph, with serif headings over a sans body.",
    atsNotes:
      "The photograph sits beside the name and is decorative. Without one the header is a plain left-aligned block. Still single column.",
  },
  bold: {
    name: "Bold",
    description:
      "A heavy upper-case name and strong section headings over a thick accent rule.",
    atsNotes:
      "Weight comes from type and a rule, not from layout. Case is styling only, so the text a parser reads is what you typed.",
  },
} as const;
