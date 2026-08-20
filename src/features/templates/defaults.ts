import type {
  DesignConfig,
  FontRef,
  TemplateId,
} from '@/features/resume/model/document'

/**
 * Default style tokens per template.
 *
 * These mirror the `.resivo-paper[data-template=...]` scopes in `paper.css` —
 * that file is what the preview iframe loads, and this is the same baseline
 * expressed as data so the style panel has something to bind to and the
 * document has something to store.
 *
 * Selecting a template seeds `document.design` from here. Once seeded the values
 * belong to the document: changing a template later asks before overwriting
 * them, because the user may have customised them.
 */

/** The three locally vendored families. See `styles/fonts.css`. */
const SERIF: FontRef = { family: 'Source Serif 4 Variable', source: 'builtin' }
const SANS: FontRef = { family: 'Instrument Sans Variable', source: 'builtin' }
const MONO: FontRef = { family: 'JetBrains Mono Variable', source: 'builtin' }

/** Ink, muted ink and rule colours are shared by every template. */
const PAPER_INK = '#1a1a18'
const PAPER_INK_MUTED = '#55554e'
const PAPER_RULE = '#d8d8d3'

/**
 * Everything a template does not override. Letter at 0.6in margins is the
 * design system's paper baseline.
 */
const base = (): DesignConfig => ({
  paper: {
    size: 'Letter',
    margin: { top: 0.6, right: 0.6, bottom: 0.6, left: 0.6 },
  },
  typography: {
    bodyFont: SERIF,
    headingFont: SERIF,
    baseSize: 10.5,
    scale: 1.2,
    lineHeight: 1.42,
    weights: { body: 400, heading: 600 },
  },
  colors: {
    text: PAPER_INK,
    heading: PAPER_INK,
    accent: '#0e7c76',
    muted: PAPER_INK_MUTED,
    rule: PAPER_RULE,
  },
  spacing: { section: 0.9, paragraph: 0.35, heading: 0.4 },
  rules: { showDividers: true, width: 1, color: PAPER_RULE },
  image: { avatarShape: 'circle', avatarSize: 84 },
  icons: { size: 12, color: PAPER_INK_MUTED, defaultWeight: 'regular' },
})

/**
 * Deep-clones so callers can freely mutate the document they are handed — a
 * shared nested object would otherwise leak edits across resumes.
 */
export const templateDefaults = (templateId: TemplateId): DesignConfig => {
  const design = base()

  switch (templateId) {
    case 'classic':
      // Traditional single-column serif; the baseline as-is.
      break

    case 'modern':
      // Clean contemporary sans, ink accent rather than colour.
      design.typography.bodyFont = SANS
      design.typography.headingFont = SANS
      design.colors.accent = '#1d1d1a'
      design.spacing.section = 1
      break

    case 'technical':
      // Sans body with monospace headings, tighter body size.
      design.typography.bodyFont = SANS
      design.typography.headingFont = MONO
      design.typography.baseSize = 10
      design.colors.accent = '#2563a8'
      break

    case 'editorial':
      // Serif throughout, larger name, red accent, no dividers — the hierarchy
      // is carried by type size instead of rules.
      design.colors.accent = '#94271d'
      design.rules.showDividers = false
      design.spacing.section = 1.1
      break
  }

  return design
}
