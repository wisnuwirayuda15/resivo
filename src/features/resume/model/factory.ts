import { createId } from '@/lib/id'
import { templateDefaults } from '@/features/templates/defaults'

import { DOCUMENT_VERSION } from './document'

import type {
  ContactItem,
  IconRef,
  InlineText,
  ResumeDocument,
  Section,
  SectionKind,
  TemplateId,
} from './document'

/**
 * Constructors for document nodes.
 *
 * Everything that creates a node goes through here, so ids are never forgotten
 * and new documents always carry the current `schemaVersion`.
 */

/** Plain unformatted text. The common case by far. */
export const text = (value: string): InlineText =>
  value === '' ? [] : [{ type: 'text', text: value }]

/** Reads the plain string back out, dropping formatting. Used for search,
 * denormalized metadata and Markdown serialization of simple runs. */
export const plainText = (inline: InlineText): string =>
  inline
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.text
        case 'link':
          return plainText(node.children)
        case 'icon':
          return ''
      }
    })
    .join('')

const icon = (name: string): IconRef => ({ library: 'phosphor', name })

export const createContact = (
  label: string,
  options: { icon?: string; href?: string } = {},
): ContactItem => ({
  id: createId(),
  label: text(label),
  ...(options.icon === undefined ? {} : { icon: icon(options.icon) }),
  ...(options.href === undefined ? {} : { href: options.href }),
})

export const createSection = (
  kind: SectionKind,
  title: string,
  blocks: Section['blocks'] = [],
): Section => ({
  id: createId(),
  kind,
  title: text(title),
  blocks,
})

/**
 * A new, empty resume.
 *
 * Starts with the four sections almost every resume has, each empty, rather
 * than a blank page: an empty section is a visible affordance ("add an entry"),
 * whereas a blank document gives the user nothing to click. Sample content is
 * deliberately not inserted — the user's document should never contain text
 * they did not write.
 */
export const createEmptyDocument = (
  templateId: TemplateId = 'classic',
): ResumeDocument => ({
  schemaVersion: DOCUMENT_VERSION,
  templateId,
  meta: { fullName: '', locale: 'en' },
  content: {
    header: {
      name: [],
      contacts: [],
    },
    sections: [
      createSection('summary', 'Summary'),
      createSection('experience', 'Experience'),
      createSection('education', 'Education'),
      createSection('skills', 'Skills'),
    ],
  },
  design: templateDefaults(templateId),
  customCss: '',
})

/**
 * Recomputes the denormalized `meta` fields from `content.header`.
 *
 * `meta` exists so the resume list can search and sort without parsing every
 * document, which means it has to be refreshed whenever the header changes.
 * Call this on save rather than on every keystroke.
 */
export const syncMeta = (document: ResumeDocument): ResumeDocument => {
  const fullName = plainText(document.content.header.name)
  const headline =
    document.content.header.headline === undefined
      ? undefined
      : plainText(document.content.header.headline)

  return {
    ...document,
    meta: {
      ...document.meta,
      fullName,
      ...(headline === undefined || headline === '' ? {} : { headline }),
    },
  }
}
