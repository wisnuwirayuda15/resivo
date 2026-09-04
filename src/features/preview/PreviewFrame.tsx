import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { fontFaceCss } from '@/features/assets/fontFaces'
import { documentFontIds, documentImageIds } from '@/features/assets/references'
import { useFontUrls, useImageUrls } from '@/features/assets/useAssetUrls'
import { useFonts } from '@/features/assets/queries'

import { PreviewPaper } from './PreviewPaper'
import { sanitizeCss } from '@/features/css/sanitize'
import { previewStylesheet } from './css'

import paperFontsHref from './paper-fonts.css?url'

import type { Recipe } from '@/features/editor/mutations'
import type { RenderMode } from '@/features/templates/renderer/types'
import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * The preview host.
 *
 * An iframe, and not a Shadow DOM root or a scoped-selector rewrite, because
 * only a separate document gives all three of the things this needs:
 *
 *  - its own `@page` rule and pagination context, which Shadow DOM ignores;
 *  - a root font size and cascade the app cannot leak into, so the paper never
 *    inherits dark mode;
 *  - a document whose serialized HTML *is* the export, which is what makes
 *    "the PDF matches the preview" true by construction rather than by effort.
 *
 * React renders into it by portal, so there is one component tree and one
 * renderer (the app's) rather than a second React root to keep in step. The
 * iframe is sandboxed all the same: no script inside it can ever run, whatever a
 * future custom stylesheet tries to smuggle in.
 */

/**
 * A fixed, empty document. Constant so the iframe loads exactly once, a
 * changing `srcDoc` would reload the frame and throw away the portal on every
 * edit.
 */
const SKELETON = '<!doctype html><html><head></head><body></body></html>'

interface PreviewFrameProps {
  document: ResumeDocument
  /** `view` by default: a preview is a preview until something asks for the
   * editing surface. */
  mode?: RenderMode
  apply?: (recipe: Recipe) => void
  /** 1 = 100%. */
  zoom?: number
  className?: string
  title?: string
  /** Called whenever pagination settles on a different number of pages. */
  onPageCountChange?: (count: number) => void
  /** Called with the flow-item ids on each page whenever pagination settles. */
  onPaginated?: (pages: Array<Array<string>>) => void
  /**
   * Handed a function that prints the iframe.
   *
   * PDF export is the browser printing *this* document, not a second renderer
   * producing something that ought to match it. That is what makes "the PDF is
   * the preview" true rather than aspirational, and it is why the print handle
   * comes from here instead of from a separate route.
   */
}

export const PreviewFrame: React.FC<PreviewFrameProps> = ({
  document: resume,
  mode = 'view',
  apply,
  zoom = 1,
  className,
  title = 'Resume preview',
  onPageCountChange,
  onPaginated,
}) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const styleRef = useRef<HTMLStyleElement | null>(null)
  const [frameDocument, setFrameDocument] = useState<Document | null>(null)

  /**
   * Incremented every time the iframe finishes loading a batch of faces.
   *
   * A boolean would not do. `fonts.ready` on a document that has not yet asked
   * for a face resolves immediately, the paper would be measured against
   * fallback metrics and, since the promise only settles once, never measured
   * again. A counter makes every arrival re-paginate.
   */
  const [fontEpoch, setFontEpoch] = useState(0)

  /**
   * Only the assets this document names. Holding every uploaded image would mean
   * a gallery's worth of blobs alive for as long as the editor is open, and
   * every declared face delaying the first paint, see `font-display: block`.
   */
  const imageIds = useMemo(() => documentImageIds(resume), [resume])
  const fontIds = useMemo(() => documentFontIds(resume), [resume])

  const images = useImageUrls(imageIds)
  const fontUrls = useFontUrls(fontIds)
  const { data: fonts } = useFonts()

  /**
   * A face needs both halves: the row, for its family and weight, and the blob
   * URL. They arrive from different reads, so a font contributes nothing until
   * both are here, and when the second lands, `loadingdone` bumps `fontEpoch`
   * and the paper re-paginates against the real metrics.
   */
  const fontFaces = useMemo(
    () =>
      fontFaceCss(
        (fonts ?? []).flatMap((font) => {
          const url = fontUrls.get(font.id)

          return url === undefined ? [] : [{ font, url }]
        }),
      ),
    [fonts, fontUrls],
  )

  /**
   * The user's CSS is sanitized here rather than stored sanitized, so tightening
   * the rules later applies to every existing resume instead of only to what is
   * edited afterwards. The document keeps what the user wrote.
   */
  const css = useMemo(
    () =>
      previewStylesheet({
        templateId: resume.templateId,
        design: resume.design,
        customCss: sanitizeCss(resume.customCss).css,
        fontFaces,
        editing: mode === 'edit',
      }),
    [resume.templateId, resume.design, resume.customCss, fontFaces, mode],
  )

  // Create the head elements once per document, and tear them down with it.
  useEffect(() => {
    if (frameDocument === null) {
      return
    }

    const link = frameDocument.createElement('link')

    link.rel = 'stylesheet'
    link.href = paperFontsHref

    const style = frameDocument.createElement('style')

    frameDocument.head.append(link, style)
    styleRef.current = style

    return () => {
      link.remove()
      style.remove()
      styleRef.current = null
    }
  }, [frameDocument])

  /**
   * Update the one style element in place rather than replacing it. Swapping the
   * element would leave the iframe unstyled for a frame, which reads as a white
   * flash on every keystroke that touches the design.
   */
  useEffect(() => {
    const style = styleRef.current

    if (style !== null) {
      style.textContent = css
    }
  }, [frameDocument, css])

  useEffect(() => {
    if (frameDocument === null) {
      return
    }

    const faces = frameDocument.fonts
    const bump = () => setFontEpoch((epoch) => epoch + 1)

    faces.addEventListener('loadingdone', bump)

    return () => faces.removeEventListener('loadingdone', bump)
  }, [frameDocument])

  return (
    <>
      <iframe
        className={className}
        onLoad={() =>
          setFrameDocument(frameRef.current?.contentDocument ?? null)
        }
        ref={frameRef}
        /**
         * Same-origin so the portal can reach the document; no `allow-scripts`,
         * so nothing inside ever executes. `allow-modals` is what lets
         * `contentWindow.print()` open the print dialog, which is how PDF export
         * works.
         */
        sandbox="allow-same-origin allow-modals"
        srcDoc={SKELETON}
        title={title}
      />

      {frameDocument === null
        ? null
        : createPortal(
            <PreviewPaper
              document={resume}
              fontEpoch={fontEpoch}
              images={images}
              mode={mode}
              apply={apply}
              onPageCountChange={onPageCountChange}
              onPaginated={onPaginated}
              zoom={zoom}
            />,
            frameDocument.body,
          )}
    </>
  )
}
