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

/**
 * The rail is for the permanent sidebar only.
 *
 * Below Mantine's `sm` the navbar is an overlay the burger shows and hides, and
 * a third state between those two is not a state: 60px of icons is not a useful
 * way to present the one thing the overlay was opened to show. So a preference
 * carried over from a wide screen has to be ignored rather than honoured.
 */
test('ignores a collapsed sidebar where the sidebar is an overlay', async ({
  page,
}) => {
  await openEmptyApp(page)

  // Collapsed while the sidebar is still permanent, which is the only place the
  // control exists.
  await page.getByRole('button', { name: 'Toggle sidebar' }).click()

  await page.setViewportSize({ width: 600, height: 800 })

  // The toggle goes with the sidebar it toggles; the burger takes its place.
  await expect(
    page.getByRole('button', { name: 'Toggle sidebar' }),
  ).toBeHidden()
  await page.getByRole('button', { name: 'Toggle navigation' }).click()

  // A drawer, with its labels back — not the rail the stored preference still
  // asks for, and not the whole viewport either: a drawer with no page beside
  // it leaves nothing to tap to dismiss it.
  const width = await page
    .getByRole('navigation')
    .evaluate((node) => Math.round(node.getBoundingClientRect().width))
  expect(width).toBeLessThan(600)
  await expect(page.getByText('No account. No cloud.')).toBeVisible()
})

/** A phone, not a narrow desktop window. */
const PHONE = { width: 375, height: 812 }

/**
 * The editor at phone width.
 *
 * The 900px case above only exercises the pane fallback. At 375 the row of
 * controls over the paper is the thing that did not fit: the page dimensions,
 * both segmented controls and four zoom buttons in one 38px strip made that
 * header 433px wide, and since nothing there scrolls it took the whole editor —
 * and the document — with it.
 */
test('fits a phone, with nothing pushed off the side', async ({ page }) => {
  test.slow()

  await page.setViewportSize(PHONE)

  await openEmptyApp(page)
  await createResume(page, 'Ada Lovelace')
  await expectPaperReady(page)

  const overflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )

  expect(await overflow()).toBe(0)

  // Every pane, since each one is a different row of controls.
  for (const pane of ['Code', 'Style', 'Paper'] as const) {
    await openEditorPane(page, pane)
    expect(await overflow()).toBe(0)
  }

  // What the strip keeps at this width.
  await expect(page.getByText('1 page')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export' })).toBeVisible()

  /**
   * And what it folds away rather than drops.
   *
   * These three were simply absent on a phone, which is the complaint this
   * covers: an indicator that exists on a desktop and nowhere else is a
   * feature the small screen does not have.
   */
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeHidden()
  await page.getByRole('button', { name: 'Paper and zoom' }).click()

  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fit width' })).toBeVisible()
  // The label, not the radio: Mantine's segmented control parks the real input
  // off-screen and styles the label, so the input is never "visible".
  await expect(page.locator('label').filter({ hasText: /^A4$/ })).toBeVisible()

  // The zoom really is the paper's, not a readout of its own.
  const zoom = () => page.getByText(/^\d+%$/).innerText()
  const before = await zoom()

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect.poll(zoom).not.toBe(before)
})

/**
 * The navbar on a phone is a drawer.
 *
 * Mantine gives it the full viewport width below the breakpoint, which put it
 * over the header — so the burger that opened it was underneath it, and with no
 * scrim and nothing beside it to tap, the only way out was to navigate
 * somewhere. Opening the menu to look at it was a one-way trip.
 */
test('the navbar drawer closes when the page beside it is tapped', async ({
  page,
}) => {
  await page.setViewportSize(PHONE)
  await openEmptyApp(page)

  const drawer = page.locator('nav.mantine-AppShell-navbar')
  const settings = page.getByRole('link', { name: 'Settings' })

  await page.getByRole('button', { name: 'Toggle navigation' }).click()
  await expect(settings).toBeInViewport()

  // There is a page beside it to tap at all, which is the half of the fix that
  // is easy to lose: a full-width drawer has no outside.
  const box = await drawer.boundingBox()
  expect(box?.width ?? PHONE.width).toBeLessThan(PHONE.width)

  await page.mouse.click(PHONE.width - 20, 500)
  await expect(settings).not.toBeInViewport()
})

/**
 * The tour, on the screen where it had the least room to work.
 *
 * Two things were wrong at phone width. The popover renders at a fixed 374px,
 * so on a 375px screen the text was clipped and "Next" sat off the right edge —
 * a tour that could be started and not finished. And two of the library's steps
 * point at rows in the sidebar, which is a drawer here: the tour dimmed the app,
 * highlighted nothing, and left nothing on screen to go on with.
 */
test('the tour can be walked through on a phone', async ({ page }) => {
  test.slow()

  await page.setViewportSize(PHONE)
  await openEmptyApp(page)

  // Opted back in, the way the onboarding spec does.
  await page.evaluate(() => {
    localStorage.removeItem('resivo.onboarding.library')
    localStorage.removeItem('resivo.onboarding.editor')
  })
  await page.reload()

  const popover = page.locator(
    '.mantine-OnboardingTourPopoverContent-popoverContent',
  )
  const focused = page.locator('[data-onboarding-tour-focus-reveal-focused]')

  await expect(page.getByText('Start here')).toBeVisible({ timeout: 20_000 })

  // Inside the viewport at every step, and pointing at something visible at
  // every step — the two halves of "it works here at all".
  for (const heading of [
    'Images and fonts are shared',
    'This is the important one',
    'Everything, from the keyboard',
  ]) {
    await expect(popover).toBeInViewport({ ratio: 1 })
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText(heading)).toBeVisible()
    await expect(focused).toBeInViewport({ ratio: 1 })
  }

  await expect(popover).toBeInViewport({ ratio: 1 })
})
