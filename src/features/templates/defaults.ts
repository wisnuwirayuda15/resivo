import { deepEqual } from '@/lib/deep-equal'

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

/**
 * The same three, as an addressable set.
 *
 * The style panel offers exactly these until the font library arrives, and it
 * has to offer the same objects a template seeds — otherwise picking "the font
 * it already has" would register as a customisation.
 */
export const BUILTIN_FONTS: Record<'serif' | 'sans' | 'mono', FontRef> = {
  serif: SERIF,
  sans: SANS,
  mono: MONO,
}

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
      //
      // The whole type ramp is derived from `baseSize` and `scale` (the name is
      // four steps up — see `preview/css.ts`), so the larger name is expressed
      // as a wider scale rather than as a one-off size. 1.255 puts the 10.5pt
      // body at the 26pt name the design system specifies for this template.
      design.typography.scale = 1.255
      design.colors.accent = '#94271d'
      design.rules.showDividers = false
      design.spacing.section = 1.1
      break
  }

  return design
}

/**
 * Whether a document's style tokens are still exactly what its template seeded.
 *
 * This is the question behind "keep your customisations?" on a template switch.
 * Asking it when the answer is no — when nothing has been touched — trains the
 * user to dismiss the dialog, so the switch is silent in that case and only
 * prompts when there is something real to lose.
 *
 * Paper size is excluded deliberately. It is chosen from the preview toolbar
 * rather than the style panel, it is a property of the printer and not of the
 * design, and no template seeds anything but Letter — so counting a switch to A4
 * as "customised" would make the prompt appear for a choice the user does not
 * think of as styling.
 */
export const designMatchesTemplate = (
  design: DesignConfig,
  templateId: TemplateId,
): boolean => {
  const seeded = templateDefaults(templateId)

  return deepEqual(
    { ...design, paper: { ...design.paper, size: seeded.paper.size } },
    seeded,
  )
}
