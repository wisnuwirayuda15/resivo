import { TEMPLATE_IDS } from '@/features/resume/model/document'

import type { SectionKind, TemplateId } from '@/features/resume/model/document'

/**
 * Template descriptions, for the picker and the template gallery.
 *
 * Separate from `defaults.ts` (which holds the style tokens) and from the
 * renderers (phase 6) so the picker can list templates without pulling in any
 * rendering code.
 */

export interface TemplateMeta {
  id: TemplateId
  name: string
  /** One sentence, the design system's rule for dialog and card subtitles. */
  description: string
  /** Sections the template renders with dedicated layout. Anything else falls
   * back to the generic section renderer. */
  supportedSections: Array<SectionKind>
  /** Notes on how the layout reads to an applicant tracking system. */
  atsNotes: string
}

const ALL_SECTIONS: Array<SectionKind> = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'awards',
  'publications',
  'languages',
  'interests',
  'custom',
]

export const TEMPLATE_CATALOG: Record<TemplateId, TemplateMeta> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description:
      'A traditional single-column resume in a serif face, with ruled section headings.',
    supportedSections: ALL_SECTIONS,
    atsNotes:
      'Single column, no tables, no columns, headings in document order. The safest choice for automated parsing.',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    description:
      'A clean contemporary layout in a sans face, using weight and space instead of rules.',
    supportedSections: ALL_SECTIONS,
    atsNotes:
      'Single column with generous spacing. Section headings stay literal text, so parsers read them normally.',
  },
  technical: {
    id: 'technical',
    name: 'Technical',
    description:
      'A denser layout with monospace headings, suited to engineering roles with long skill lists.',
    supportedSections: ALL_SECTIONS,
    atsNotes:
      'Smaller body size fits more content per page. Skills render as plain comma-separated text rather than chips, which parses reliably.',
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description:
      'A serif layout with a large name and generous leading, for writing and design roles.',
    supportedSections: ALL_SECTIONS,
    atsNotes:
      'Dividers are off by default and hierarchy comes from type size. Still single column and parser-safe.',
  },
}

export const templateList: Array<TemplateMeta> = TEMPLATE_IDS.map(
  (id) => TEMPLATE_CATALOG[id],
)

export const templateName = (id: TemplateId): string =>
  TEMPLATE_CATALOG[id].name
