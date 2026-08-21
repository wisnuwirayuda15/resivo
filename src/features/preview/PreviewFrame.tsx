import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { PreviewPaper } from './PreviewPaper'
import { sanitizeCss } from '@/features/css/sanitize'
import { previewStylesheet } from './css'

import paperFontsHref from './paper-fonts.css?url'

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
 * renderer — the app's — rather than a second React root to keep in step. The
 * iframe is sandboxed all the same: no script inside it can ever run, whatever a
 * future custom stylesheet tries to smuggle in.
 */

/**
 * A fixed, empty document. Constant so the iframe loads exactly once — a
 * changing `srcDoc` would reload the frame and throw away the portal on every
 * edit.
 */
const SKELETON = '<!doctype html><html><head></head><body></body></html>'

interface PreviewFrameProps {
  document: ResumeDocument
  /** 1 = 100%. */
  zoom?: number
  className?: string
  title?: string
  /** Called whenever pagination settles on a different number of pages. */
  onPageCountChange?: (count: number) => void
}

export const PreviewFrame: React.FC<PreviewFrameProps> = ({
  document: resume,
  zoom = 1,
  className,
  title = 'Resume preview',
  onPageCountChange,
}) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const styleRef = useRef<HTMLStyleElement | null>(null)
  const [frameDocument, setFrameDocument] = useState<Document | null>(null)

  /**
   * Incremented every time the iframe finishes loading a batch of faces.
   *
   * A boolean would not do. `fonts.ready` on a document that has not yet asked
   * for a face resolves immediately — the paper would be measured against
   * fallback metrics and, since the promise only settles once, never measured
   * again. A counter makes every arrival re-paginate.
   */
  const [fontEpoch, setFontEpoch] = useState(0)

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
      }),
    [resume.templateId, resume.design, resume.customCss],
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

    const fonts = frameDocument.fonts
    const bump = () => setFontEpoch((epoch) => epoch + 1)

    fonts.addEventListener('loadingdone', bump)

    return () => fonts.removeEventListener('loadingdone', bump)
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
              onPageCountChange={onPageCountChange}
              zoom={zoom}
            />,
            frameDocument.body,
          )}
    </>
  )
}
