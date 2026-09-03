import { expect, test } from '@playwright/test'

import {
  createResume,
  expectPaperReady,
  openEditorPane,
  openEmptyApp,
  paper,
} from './app'

/**
 * The editor on a screen that cannot hold three panes.
 *
 * The pane minimums add up to 888px, plus two handles and a 232px sidebar — so
 * three panes need a 1122px viewport before the layout is even usable. There was
 * no breakpoint anywhere in the app, so below that the editor overflowed
 * sideways and the paper was pushed off the screen.
 */

test('falls back to one pane at a time on a narrow screen', async ({
  page,
}) => {
  test.slow()

  await page.setViewportSize({ width: 900, height: 800 })

  await openEmptyApp(page)
  await createResume(page, 'Ada Lovelace')

  // The tab strip, which only exists below the breakpoint.
  await expect(
    page.getByRole('tablist', { name: 'Editor panes' }),
  ).toBeVisible()
  await expectPaperReady(page)

  // Nothing overflows sideways: the document is the whole width, not a third of
  // a layout that does not fit.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)

  // The other two panes are a tab away rather than gone.
  await openEditorPane(page, 'Code')
  await expect(page.locator('.monaco-editor').first()).toBeVisible()

  await openEditorPane(page, 'Style')
  await expect(page.getByLabel('Body size')).toBeVisible()

  /**
   * Back to the paper, and it paginates again.
   *
   * This is the assertion that matters for the tabs: an inactive Mantine panel
   * is `display: none`, so a preview left mounted in one would measure its paper
   * at zero width. Unmounting is what keeps the paper measured at the width it
   * is drawn at.
   */
  await openEditorPane(page, 'Paper')
  await expectPaperReady(page)
  await expect(paper(page).locator('.rp-page').first()).toBeVisible()
})

test('uses all three panes once there is room', async ({ page }) => {
  test.slow()

  await page.setViewportSize({ width: 1440, height: 900 })

  await openEmptyApp(page)
  await createResume(page, 'Ada Lovelace')

  // No tab strip, and all three panes at once.
  await expect(page.getByRole('tablist', { name: 'Editor panes' })).toHaveCount(
    0,
  )
  await expect(page.locator('.monaco-editor').first()).toBeVisible()
  await expect(page.getByLabel('Body size')).toBeVisible()
  await expectPaperReady(page)
})
