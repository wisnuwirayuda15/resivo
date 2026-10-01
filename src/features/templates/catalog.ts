import { TEMPLATE_IDS } from "@/features/resume/model/document";

import type { SectionKind, TemplateId } from "@/features/resume/model/document";

/**
 * Template descriptions, for the picker and the template gallery.
 *
 * Only what is not words is here. A template's name, its one-sentence
 * description and its notes on how it reads to a parser are in the `templates`
 * message namespace, keyed by id, and `useTemplateText` is how a component reads
 * them. Words kept in this file could be neither translated nor changed without
 * touching the data that decides what a template is.
 *
 * Separate from `defaults.ts` (which holds the style tokens) and from the
 * renderers so the picker can list templates without pulling in any rendering
 * code.
 */

export interface TemplateMeta {
  id: TemplateId;
  /** Sections the template renders with dedicated layout. Anything else falls
   * back to the generic section renderer. */
  supportedSections: Array<SectionKind>;
}

const ALL_SECTIONS: Array<SectionKind> = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "awards",
  "publications",
  "languages",
  "interests",
  "custom",
];

export const TEMPLATE_CATALOG: Record<TemplateId, TemplateMeta> = {
  classic: { id: "classic", supportedSections: ALL_SECTIONS },
  modern: { id: "modern", supportedSections: ALL_SECTIONS },
  technical: { id: "technical", supportedSections: ALL_SECTIONS },
  editorial: { id: "editorial", supportedSections: ALL_SECTIONS },
};

export const templateList: Array<TemplateMeta> = TEMPLATE_IDS.map(
  (id) => TEMPLATE_CATALOG[id],
);
