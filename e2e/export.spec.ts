import { expect, test } from '@playwright/test'

import { createResume, openEmptyApp, typeMarkdown } from './app'

import type { Page } from '@playwright/test'

/**
 * The PDF path.
 *
 * PDF is the one export that produces no file: it hands a document to the
 * browser to print. What is asserted here is *which* document — it used to be
 * the live preview iframe, so the output depended on the editor's zoom, its
 * measuring pass and fonts held as object URLs. It is now the same
 * self-contained document the HTML export writes, printed in a frame of its own
 * and thrown away.
 */

const FRAME = '#resivo-print-document'

/**
 * Watches for the print frame, and records the call.
 *
 * The stub is not there to fake anything: `print()` in headless Chromium opens
 * no dialog and returns immediately, so without recording the call there is no
 * way to tell a print from a no-op — and without capturing `srcdoc` as the frame
 * appears, the document is gone before it can be read, since the frame is
 * removed as soon as the print is handed over.
 */
const watchPrint = (page: Page) =>
  page.addInitScript(() => {
    const log: Array<{ event: string; markup?: string }> = []

    Object.defineProperty(window, '__printLog', { value: log })

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (
            node instanceof HTMLIFrameElement &&
            node.id === 'resivo-print-document'
          ) {
            log.push({ event: 'added', markup: node.srcdoc })

            const view = node.contentWindow

            if (view !== null) {
              const original = view.print.bind(view)

              view.print = () => {
                log.push({ event: 'print' })
                original()
              }
            }
          }
        }

        for (const node of record.removedNodes) {
          if (
            node instanceof HTMLIFrameElement &&
            node.id === 'resivo-print-document'
          ) {
            log.push({ event: 'removed' })
          }
        }
      }
    })

    document.addEventListener('DOMContentLoaded', () =>
      observer.observe(document.body, { childList: true }),
    )
  })

const printLog = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __printLog: Array<{ event: string }> })
        .__printLog,
  )

const printedMarkup = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __printLog: Array<{ event: string; markup?: string }>
        }
      ).__printLog.find((entry) => entry.event === 'added')?.markup ?? '',
  )

test('prints the exported document, not the preview', async ({ page }) => {
  test.slow()

  await watchPrint(page)
  await openEmptyApp(page)
  await createResume(page, 'Ada Lovelace')

  await typeMarkdown(page, '# Ada Lovelace\n\nAnalytical engines\n')

  await page.getByRole('button', { name: 'Export' }).click()

  const pdf = page.getByRole('menuitem', { name: /PDF/ })

  // Enabled only once the first pagination has landed: the page breaks are a
  // measurement, and printing before one would fall back to a single page.
  await expect(pdf).toBeEnabled()
  await pdf.click()

  await expect
    .poll(async () => (await printLog(page)).map((entry) => entry.event))
    .toEqual(['added', 'print', 'removed'])

  const markup = await printedMarkup(page)

  // The document is the export: page boxes, the resume's own text, and the
  // typefaces embedded rather than referenced.
  expect(markup).toContain('resivo-paper')
  expect(markup).toContain('Analytical engines')
  expect(markup).toContain('@page')
  expect(markup).toContain('@font-face')
  expect(markup).toContain('data:font/woff2;base64,')

  /**
   * And nothing from the editor.
   *
   * Asserted on the markup rather than the stylesheet: the sheet is the
   * preview's own and legitimately carries rules for classes that are not in
   * this document. What must be absent is the elements — the measuring pass's
   * container, and any editable run.
   */
  expect(markup).not.toContain('data-measure-flow')
  expect(markup).not.toContain('data-editable')
  expect(markup).not.toContain('vite')

  // The frame is gone, so a second print starts from nothing.
  await expect(page.locator(FRAME)).toHaveCount(0)
})
