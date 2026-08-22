import { renderToStaticMarkup } from 'react-dom/server'

import { documentFlow, flowItemClass } from '@/features/preview/flow'
import { renderFlow } from '@/features/preview/renderFlow'
import { previewStylesheet } from '@/features/preview/css'
import { sanitizeCss } from '@/features/css/sanitize'
import { fontFaceCss } from '@/features/assets/fontFaces'
import { resolveTemplate } from '@/features/templates/registry'

import type { ImageMap } from '@/features/assets/useAssetUrls'
import type { FontSource } from '@/features/assets/fontFaces'
import type { ResumeDocument } from '@/features/resume/model/document'
import type { RenderContext } from '@/features/templates/renderer/types'

/**
 * HTML export: one file, no network.
 *
 * The same renderer, the same stylesheet and the same page boxes as the preview,
 * which is what makes "the export looks like the preview" true by construction
 * rather than by comparison. Nothing here re-implements a template.
 *
 * Everything external is inlined by the caller before it gets here — images and
 * fonts arrive as `data:` URLs through exactly the fields the preview fills with
 * object URLs. So this function has no idea whether it is producing a preview or
 * a file, and cannot get it half right.
 */

export interface HtmlExportInput {
  document: ResumeDocument
  title: string
  /** Images as `data:` URLs. Same shape the preview passes as object URLs. */
  images: ImageMap
  /** Custom fonts as `data:` URLs. */
  fonts: ReadonlyArray<FontSource>
  /**
   * The bundled typefaces, already inlined — see `inlineBuiltinFonts`.
   *
   * Without them the file falls back to the reader's system serif, which changes
   * the line breaks and therefore the pages of a document whose only job is to
   * look like the one that was laid out.
   */
  builtinFontCss?: string
  /**
   * The page breaks the preview settled on, as flow-item ids per page.
   *
   * Passed in rather than recomputed: pagination is a *measurement*, and there
   * is nothing to measure in a string. Exporting what the user is looking at is
   * both more honest and more accurate than re-deriving breaks from an estimate.
   *
   * `undefined` falls back to one continuous page and lets the printer break it,
   * which is what happens if a document is exported before its first
   * measurement lands.
   */
  pages?: ReadonlyArray<ReadonlyArray<string>>
}

/** Escapes text for a `<title>`, which is the one place export writes prose of
 * its own into the document. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const exportHtml = ({
  document: resume,
  title,
  images,
  fonts,
  builtinFontCss = '',
  pages,
}: HtmlExportInput): string => {
  const items = documentFlow(resume)
  const template = resolveTemplate(resume.templateId)

  /**
   * `print` mode, and no `apply`. Two independent reasons the output cannot
   * carry editing chrome — the mode says what this is for, and there is no store
   * for a field to write to even if one tried.
   */
  const context: RenderContext = {
    locale: resume.meta.locale,
    design: resume.design,
    images,
    mode: 'print',
  }

  const rendered = new Map(
    renderFlow(resume, template, context, items).map(({ item, node }) => [
      item.id,
      { item, node },
    ]),
  )

  const layout = pages ?? [items.map((item) => item.id)]

  const body = layout
    .map((ids) => {
      const contents = ids
        .map((id) => {
          const entry = rendered.get(id)

          return entry === undefined
            ? ''
            : `<div class="${flowItemClass(entry.item.type)}">${renderToStaticMarkup(entry.node)}</div>`
        })
        .join('')

      return (
        `<div class="resivo-paper rp-page" data-template="${resume.templateId}" ` +
        `data-size="${resume.design.paper.size}"><div class="rp-page-body">${contents}</div></div>`
      )
    })
    .join('')

  const css = previewStylesheet({
    templateId: resume.templateId,
    design: resume.design,
    customCss: sanitizeCss(resume.customCss).css,
    // The bundled faces first: a user font that happens to share a family name
    // with one of them should win, and later rules do.
    fontFaces: [builtinFontCss, fontFaceCss(fonts)]
      .filter((part) => part.trim() !== '')
      .join('\n'),
  })

  /**
   * `rp-root` and `rp-pages` are kept so the exported file uses the same layout
   * rules as the preview, minus the zoom — which is a screen affordance and has
   * no meaning in a file someone opens to read or print.
   */
  return `<!doctype html>
<html lang="${escapeHtml(resume.meta.locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${css}
</style>
</head>
<body>
<div class="rp-root"><div class="rp-pages">${body}</div></div>
</body>
</html>
`
}
