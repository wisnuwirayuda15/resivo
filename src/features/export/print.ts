/**
 * Printing, from a document built for printing.
 *
 * PDF export used to be `previewIframe.contentWindow.print()` — the live preview,
 * printed where it stood. That made the output depend on the state of the app at
 * that moment: the zoom (neutralised by an `!important`, but still coupled), the
 * measuring pass (hidden by a print rule, but still in the document), the
 * editing chrome, and fonts held as object URLs belonging to the app's own
 * origin rather than embedded in what was printed.
 *
 * So the print now happens on the *export* document instead: the same file the
 * HTML export writes, with the typefaces and images inlined as `data:` URLs and
 * the measured page breaks already baked into page boxes. It is written into a
 * frame of its own, printed, and thrown away. What is printed is therefore
 * exactly what "Export → HTML" would have handed the user — one artefact, two
 * destinations — and nothing about the editor's current state can reach it.
 *
 * What this does *not* do is replace the browser's print engine, and no
 * client-side library can. A PDF built by a library either rasterises the page,
 * which destroys the text layer a résumé parser reads, or re-lays the document
 * out with its own engine, which means the PDF stops being the thing the
 * paginator measured. Printing is the only path from HTML and CSS to vector text
 * in a browser. The remaining variation between browsers is the print dialog's
 * own settings, which live outside the page.
 */

/** One frame, reused by id, so a second attempt cannot leave two behind. */
const FRAME_ID = 'resivo-print-document'

/**
 * How long to keep the frame after `print()` returns, when `afterprint` never
 * arrives. Not every engine has fired it reliably, and a frame left in the
 * document for ever is a leak; ten seconds is long after a print job has been
 * handed over and short enough not to matter.
 */
const CLEANUP_FALLBACK_MS = 10_000

const removeFrame = (): void => {
  document.getElementById(FRAME_ID)?.remove()
}

/**
 * Prints one self-contained HTML document.
 *
 * Resolves once the print has been handed to the browser and the frame is gone.
 * Rejects only if the document could not be prepared — a dialog the user
 * cancels is not a failure, and there is no way to tell the two apart from here.
 */
export const printExportHtml = async (html: string): Promise<void> => {
  removeFrame()

  const frame = document.createElement('iframe')

  frame.id = FRAME_ID
  frame.title = 'Print document'
  frame.setAttribute('aria-hidden', 'true')

  /**
   * Positioned off screen rather than `display: none`.
   *
   * A frame that is not laid out has no layout to print. Written as inline text
   * because this element is created imperatively, outside React and outside
   * Tailwind's reach — everything the app renders uses classes.
   */
  frame.style.cssText =
    'position:fixed;left:-10000px;top:0;width:1024px;height:1400px;border:0'

  /**
   * Not sandboxed, deliberately. The document is one this app just wrote and
   * contains no script, and a sandbox without `allow-modals` is refused
   * `print()` — which is the only thing the frame exists for.
   */
  frame.srcdoc = html

  document.body.append(frame)

  try {
    await new Promise<void>((resolve, reject) => {
      frame.addEventListener('load', () => resolve(), { once: true })
      frame.addEventListener(
        'error',
        () => reject(new Error('The print document could not be prepared.')),
        { once: true },
      )
    })

    const view = frame.contentWindow
    const printed = frame.contentDocument

    if (view === null || printed === null) {
      throw new Error('The print document could not be prepared.')
    }

    /**
     * Fonts before the dialog.
     *
     * The faces are `data:` URLs in this document, so they resolve without a
     * network — but they still resolve asynchronously, and a face that lands
     * after the print has been captured is a résumé printed in a fallback, with
     * different line breaks from the one on screen.
     */
    await printed.fonts.ready

    const settled = new Promise<void>((resolve) => {
      view.addEventListener('afterprint', () => resolve(), { once: true })
      setTimeout(resolve, CLEANUP_FALLBACK_MS)
    })

    view.focus()
    view.print()

    await settled
  } finally {
    removeFrame()
  }
}
