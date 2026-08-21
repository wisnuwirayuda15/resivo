/**
 * `@font-face` rules for the preview iframe and, later, for HTML export.
 *
 * The iframe carries no app stylesheet, so a font the user uploaded has to be
 * declared inside it. The same text, with `data:` URLs instead of object URLs, is
 * what makes an exported HTML file self-contained — hence one builder taking the
 * source as an argument rather than two that could drift apart.
 */

import type { FontSummary } from '@/database/repositories/fonts'
import type { FontRecord } from '@/database/records'

/** The `format()` hint. Wrong hints are not ignored — a browser will refuse a
 * face whose declared format does not match its bytes. */
const FORMAT_HINTS: Record<FontRecord['format'], string> = {
  woff2: 'woff2',
  woff: 'woff',
  ttf: 'truetype',
  otf: 'opentype',
}

/**
 * Anything that could end the declaration, the rule, or the stylesheet.
 *
 * A family name reaches here from a file name the user picked, which means it is
 * the one part of this rule that is not generated. It is emitted inside quotes,
 * so a stray quote or brace would be an injection point rather than a typo.
 */
const sanitizeFamily = (family: string): string =>
  family.replace(/["'\\;{}<>()]/g, '').trim()

export interface FontSource {
  font: FontSummary
  /** An object URL, or a `data:` URL for an export. */
  url: string
}

export const fontFaceCss = (sources: ReadonlyArray<FontSource>): string =>
  sources
    .map(({ font, url }) => {
      const family = sanitizeFamily(font.family)

      if (family === '') {
        return ''
      }

      return [
        '@font-face {',
        `font-family: '${family}';`,
        `src: url(${url}) format('${FORMAT_HINTS[font.format]}');`,
        `font-weight: ${Math.min(1000, Math.max(1, Math.round(font.weight)))};`,
        `font-style: ${font.style};`,
        /**
         * `block` rather than the usual `swap`. A resume is measured before it is
         * paginated: swapping a face in after the fact changes every line's
         * height and therefore where the pages break. Blocking means the first
         * measurement is taken against the real metrics.
         */
        'font-display: block;',
        '}',
      ].join(' ')
    })
    .filter((rule) => rule !== '')
    .join('\n')
