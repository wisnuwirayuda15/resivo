import paperCssText from './paper.css?raw'
import baseCssText from './base.css?raw'
import { defaultComponents } from './renderer/defaults'

import type { TemplateId } from '@/features/resume/model/document'
import type { TemplateComponents } from './renderer/types'

/**
 * The template registry.
 *
 * A template is bundled, versioned code — never a database row. Only its `id` is
 * persisted, so a resume saved today keeps rendering when the template's markup
 * or CSS is improved tomorrow. Adding one means dropping a module in here and
 * registering it; the document model never learns anything about a template's
 * internals.
 *
 * Templates are thin by design. Nearly all visual difference is carried by the
 * `--paper-*` token scopes in `paper.css` and by `defaults.ts`, so a template
 * usually supplies a short CSS delta and nothing else. `components` exists for
 * the cases where a different look genuinely needs different markup.
 */

export interface ResumeTemplate {
  id: TemplateId
  /**
   * Bumped when this template's markup or CSS changes in a way that reflows an
   * existing resume. Nothing consumes it yet; it is what a future "re-paginate
   * cached page counts" step would key off.
   */
  version: number
  /** Appended last inside `@layer template`, so restating a rule overrides the
   * shared one. */
  baseCss: string
  /** Overrides for the shared renderers. Anything omitted uses the default. */
  components?: Partial<TemplateComponents>
}

/**
 * Classic — the traditional single-column serif resume, and the default.
 *
 * Its one structural departure from the shared baseline is the centred header,
 * which is the convention the format is recognised by.
 */
const classic: ResumeTemplate = {
  id: 'classic',
  version: 1,
  baseCss: `
.resivo-paper[data-template='classic'] .rp-header {
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.resivo-paper[data-template='classic'] .rp-contacts {
  justify-content: center;
}
`,
}

/**
 * The remaining three are token-only for now.
 *
 * They are not stubs: `paper.css` gives each its own fonts, accent and body
 * size, and `defaults.ts` its own spacing and rules, so all three already render
 * as distinctly different resumes. Phase 6 gives them the layout deltas that
 * make them fully themselves.
 */
const tokenOnly = (id: TemplateId): ResumeTemplate => ({
  id,
  version: 1,
  baseCss: '',
})

const TEMPLATES: Record<TemplateId, ResumeTemplate> = {
  classic,
  modern: tokenOnly('modern'),
  technical: tokenOnly('technical'),
  editorial: tokenOnly('editorial'),
}

export interface ResolvedTemplate {
  id: TemplateId
  version: number
  components: TemplateComponents
}

export const resolveTemplate = (id: TemplateId): ResolvedTemplate => {
  const template = TEMPLATES[id]

  return {
    id: template.id,
    version: template.version,
    components: { ...defaultComponents, ...template.components },
  }
}

/**
 * Everything that belongs in the preview's `template` cascade layer, in
 * precedence order.
 *
 * `paper.css` first because it only declares tokens, then the shared element
 * styles that read them, then the template's own delta. The preview wraps the
 * result in `@layer template`; the app imports `paper.css` normally so in-app
 * paper miniatures pick up the same tokens.
 */
export const templateLayerCss = (id: TemplateId): string =>
  [paperCssText, baseCssText, TEMPLATES[id].baseCss].join('\n')
