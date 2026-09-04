import paperCssText from "./paper.css?raw";
import baseCssText from "./base.css?raw";
import { defaultComponents } from "./renderer/defaults";

import type { TemplateId } from "@/features/resume/model/document";
import type { TemplateComponents } from "./renderer/types";

/**
 * The template registry.
 *
 * A template is bundled, versioned code, never a database row. Only its `id` is
 * persisted, so a resume saved today keeps rendering when the template's markup
 * or CSS is improved tomorrow. Adding one means dropping a module in here and
 * registering it; the document model never learns anything about a template's
 * internals.
 *
 * Templates are thin by design. Nearly all visual difference is carried by the
 * `--paper-*` token scopes in `paper.css` and by `defaults.ts`, so a template
 * usually supplies a short CSS delta and nothing else. `components` exists for
 * the cases where a different look genuinely needs different markup.
 *
 * Every delta below is pure CSS for a reason: the paginator measures the markup
 * the renderers produce, and four templates producing four different DOM shapes
 * would be four sets of measurement behaviour to keep honest. Restyling the same
 * elements keeps one flow and one set of guarantees.
 */

export interface ResumeTemplate {
  id: TemplateId;
  /**
   * Bumped when this template's markup or CSS changes in a way that reflows an
   * existing resume. Nothing consumes it yet; it is what a future "re-paginate
   * cached page counts" step would key off.
   */
  version: number;
  /** Appended last inside `@layer template`, so restating a rule overrides the
   * shared one. */
  baseCss: string;
  /** Overrides for the shared renderers. Anything omitted uses the default. */
  components?: Partial<TemplateComponents>;
}

/**
 * Classic, the traditional single-column serif resume, and the default.
 *
 * Its one structural departure from the shared baseline is the centred header,
 * which is the convention the format is recognised by.
 */
const classic: ResumeTemplate = {
  id: "classic",
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
};

/**
 * Modern, clean contemporary sans.
 *
 * The rule moves from under the heading to beside it, filling the line, and the
 * heading drops the uppercase tracking. Both are the same two elements the
 * shared stylesheet renders, re-laid-out: `.rp-section` becomes a row and the
 * rule takes the leftover width.
 *
 * The heading stays literal text either way, which is what an applicant tracking
 * system reads, a decorative rule beside it changes nothing about parsing.
 */
const modern: ResumeTemplate = {
  id: "modern",
  version: 1,
  baseCss: `
.resivo-paper[data-template='modern'] .rp-section {
  display: flex;
  align-items: center;
  gap: 0.7em;
}

.resivo-paper[data-template='modern'] .rp-section-title {
  letter-spacing: 0.02em;
  text-transform: none;
}

.resivo-paper[data-template='modern'] .rp-section-rule {
  flex: 1 1 auto;
  margin-top: 0;
}

/* Weight, not colour, separates an entry's title from its employer. */
.resivo-paper[data-template='modern'] .rp-entry-subtitle {
  color: var(--paper-ink);
}
`,
};

/**
 * Technical, denser, with monospace headings.
 *
 * Dates and locations move to the monospace face with tabular figures so the
 * right-hand column of a long history lines up digit for digit. Square markers
 * and a tighter bullet indent buy back the horizontal space a mono face costs.
 */
const technical: ResumeTemplate = {
  id: "technical",
  version: 1,
  baseCss: `
.resivo-paper[data-template='technical'] .rp-section-title {
  letter-spacing: 0.02em;
}

.resivo-paper[data-template='technical'] .rp-entry-meta {
  font-family: var(--paper-font-head);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.resivo-paper[data-template='technical'] .rp-bullets {
  padding-left: 0.95em;
  list-style: square;
}
`,
};

/**
 * Editorial, serif throughout, hierarchy from type size rather than rules.
 *
 * Dividers are off in this template's defaults, so the section heading has to
 * carry the separation on its own: it is set larger, in the accent, without the
 * uppercase tracking, and the headline under the name is italic.
 */
const editorial: ResumeTemplate = {
  id: "editorial",
  version: 1,
  baseCss: `
.resivo-paper[data-template='editorial'] .rp-headline {
  font-style: italic;
  margin-top: 0.3em;
}

.resivo-paper[data-template='editorial'] .rp-section-title {
  font-size: calc(var(--paper-fs-section) * 1.1);
  letter-spacing: -0.005em;
  text-transform: none;
}

.resivo-paper[data-template='editorial'] .rp-entry-subtitle {
  font-style: italic;
}
`,
};

const TEMPLATES: Record<TemplateId, ResumeTemplate> = {
  classic,
  modern,
  technical,
  editorial,
};

export interface ResolvedTemplate {
  id: TemplateId;
  version: number;
  components: TemplateComponents;
}

export const resolveTemplate = (id: TemplateId): ResolvedTemplate => {
  const template = TEMPLATES[id];

  return {
    id: template.id,
    version: template.version,
    components: { ...defaultComponents, ...template.components },
  };
};

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
  [paperCssText, baseCssText, TEMPLATES[id].baseCss].join("\n");
