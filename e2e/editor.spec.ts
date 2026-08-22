import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

import {
  createResume,
  expectPaperReady,
  openEmptyApp,
  openInspectorTab,
  paper,
  markdownPaneText,
  paperText,
  typeMarkdown,
} from './app'

/**
 * The editor's three surfaces, and the history behind them.
 *
 * What these cover that a unit test cannot: a Monaco editor that has actually
 * laid itself out, a preview iframe that has actually paginated, and an edit made
 * by clicking on the paper — which only exists as a `contenteditable` inside
 * another document, reached through a React portal.
 */

test.beforeEach(async ({ page }) => {
  await openEmptyApp(page)
  await createResume(page, 'Ada Lovelace')
})

const bodySize = (page: Page) => page.getByLabel('Body size')

test('undo and redo a style change', async ({ page }) => {
  await openInspectorTab(page, 'Style')

  const undo = page.getByRole('button', { name: /^Undo/ })
  const redo = page.getByRole('button', { name: /^Redo/ })

  // A fresh document has no history, so neither is available. This is the state
  // the buttons were stuck in before they were wired up at all.
  await expect(undo).toBeDisabled()
  await expect(redo).toBeDisabled()

  // The field shows its unit, so the value read back is "10.5 pt" rather than a
  // bare number. Compared as written rather than parsed: what matters is that it
  // returns to exactly what it was.
  const before = await bodySize(page).inputValue()

  await bodySize(page).fill('13')
  await bodySize(page).blur()

  await expect(undo).toBeEnabled()

  await undo.click()
  await expect(bodySize(page)).toHaveValue(before)
  await expect(redo).toBeEnabled()

  await redo.click()
  await expect(bodySize(page)).toHaveValue(/^13/)
})

test('undo is bound to the keyboard outside the code panes', async ({
  page,
}) => {
  await openInspectorTab(page, 'Style')

  const before = await bodySize(page).inputValue()

  await bodySize(page).fill('13')
  await bodySize(page).blur()

  // Pressed on the body, not in an input: Monaco and the paper each keep the
  // shortcut for their own undo, and this is the case where it means the
  // document.
  await page.locator('body').click({ position: { x: 5, y: 400 } })
  await page.keyboard.press('ControlOrMeta+z')

  await expect(bodySize(page)).toHaveValue(before)
})

test('edits text on the paper, and the Markdown follows', async ({ page }) => {
  await typeMarkdown(
    page,
    ['# Ada Lovelace', '', '## Summary', '', 'Wrote the first algorithm.'].join(
      '\n',
    ),
  )

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toMatch(/Wrote the first algorithm/)

  // The label, not the radio: Mantine's segmented control parks the real input
  // off-screen and styles the label, so the input is neither clickable nor in
  // the viewport.
  await page
    .locator('label')
    .filter({ hasText: /^Visual$/ })
    .click()

  await expect(page.getByRole('radio', { name: 'Visual' })).toBeChecked()

  /**
   * The editable run itself, not the paragraph around it.
   *
   * A run is a `span[data-editable]` that swaps itself for a
   * `span[data-editing][contenteditable]` on click, focusing it as it mounts.
   * Clicking the paragraph would land outside the span and start nothing.
   */
  const run = paper(page)
    .locator('[data-paged] [data-editable]')
    .filter({ hasText: 'Wrote the first algorithm' })
    .first()

  await run.click()

  const editing = paper(page).locator('[data-editing]').first()
  await expect(editing).toBeVisible()

  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Wrote the very first algorithm.', { delay: 20 })
  // Enter commits: these are single-line fields, so it blurs rather than
  // inserting a break.
  await page.keyboard.press('Enter')

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toMatch(/very first algorithm/)

  // The model is the source of truth, so the Markdown pane must show the edit
  // too — this is the assertion that the paper wrote to the document and not
  // just to the DOM.
  await expect
    .poll(() => markdownPaneText(page), { timeout: 15_000 })
    .toMatch(/very first algorithm/)
})

test('picks a section icon from the full catalog', async ({ page }) => {
  await openInspectorTab(page, 'Sections')

  // The first section's icon control. Named for the section so the picker that
  // opens is unambiguous.
  await page.getByRole('button', { name: /icon/i }).first().click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  const search = dialog.getByRole('textbox').first()
  await search.fill('star')

  // The grid is a listbox of options, virtualized — so what matters is that a
  // match is rendered at all, not how many.
  const first = dialog.getByRole('option', { name: /star/i }).first()
  await expect(first).toBeVisible({ timeout: 20_000 })
  await first.click()

  await expect(dialog).toBeHidden()

  // An icon is an SVG on the paper, and the renderer stamps its name onto the
  // element — which is also how an edited run keeps it.
  await expectPaperReady(page)
  await expect(
    paper(page).locator('[data-paged] [data-icon-name*="star"]').first(),
  ).toBeVisible({ timeout: 15_000 })
})

test('reports Markdown it cannot typeset, without losing it', async ({
  page,
}) => {
  await typeMarkdown(
    page,
    ['# Ada Lovelace', '', '## Notes', '', '<div>raw</div>'].join('\n'),
  )

  // Kept verbatim on the paper rather than dropped.
  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain('<div>raw</div>')
})
