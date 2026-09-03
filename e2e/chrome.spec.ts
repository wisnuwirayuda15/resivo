import { expect, test } from '@playwright/test'

import { createResume, openEmptyApp } from './app'

/**
 * The application menu, and what it opens.
 *
 * Both of its items were hardcoded `disabled`, which made the whole menu dead
 * UI: it opened and offered nothing. So the assertion that matters is not that
 * the items render — they always did — but that clicking one does something.
 */

test('the application menu opens the shortcuts sheet', async ({ page }) => {
  await openEmptyApp(page)

  await page.getByRole('button', { name: 'Application menu' }).click()
  await page.getByRole('menuitem', { name: 'Keyboard shortcuts' }).click()

  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  await expect(sheet).toBeVisible()

  // It documents what is bound and nothing else, and the reason a keystroke
  // means something different in the code pane is part of that.
  await expect(sheet).toContainText('Undo the last change to the resume')
  await expect(sheet).toContainText(/keeps its own history/)

  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
})

test('the command palette navigates and creates', async ({ page }) => {
  await openEmptyApp(page)

  await page.keyboard.press('ControlOrMeta+K')

  const search = page.getByPlaceholder('Search commands…')
  await expect(search).toBeVisible()

  /**
   * Scoped to the palette itself.
   *
   * Its actions carry the same names as the controls they stand for — that is
   * the point of a palette — so a page-wide search for "New resume" finds the
   * sidebar's button, the header's, the empty state's and this one.
   */
  const palette = page
    .locator('[role="dialog"]')
    .filter({ has: page.getByPlaceholder('Search commands…') })

  // Filtered by label, description and keywords — "unused" is a keyword on the
  // Images action rather than part of its name.
  await search.fill('unused')
  await palette.getByRole('button', { name: /Images/ }).click()

  await expect(page).toHaveURL(/\/images$/)

  await page.keyboard.press('ControlOrMeta+K')
  await search.fill('new resume')
  await palette.getByRole('button', { name: /New resume/ }).click()

  // A command, not just a destination: this one opens a dialog.
  await expect(page.getByRole('dialog', { name: 'New resume' })).toBeVisible()
})

test('the palette leaves the code panes alone', async ({ page }) => {
  test.slow()

  await openEmptyApp(page)
  await createResume(page, 'Ada Lovelace')

  const editor = page.locator('.monaco-editor').first()
  await expect(editor).toBeVisible()
  await editor.click()

  await page.keyboard.press('ControlOrMeta+K')

  // Monaco binds mod+K itself, and its editable surface is a textarea — which
  // is what the palette's default `tagsToIgnore` excludes. A palette that stole
  // the chord would break the editor's own bindings.
  await expect(page.getByPlaceholder('Search commands…')).toBeHidden()
})

test('the application menu reaches the about page', async ({ page }) => {
  await openEmptyApp(page)

  await page.getByRole('button', { name: 'Application menu' }).click()
  await page.getByRole('menuitem', { name: 'About Resivo' }).click()

  await expect(page).toHaveURL(/\/about$/)

  // The page's job is the trade-off, not a description: a local-first app has a
  // consequence its user needs to know before they lose something.
  await expect(page.getByText(/only thing that survives/)).toBeVisible()

  // And it links to the one thing that does something about it.
  await page.getByRole('link', { name: 'Settings', exact: true }).last().click()
  await expect(page).toHaveURL(/\/settings$/)
})

/**
 * The sidebar's two widths.
 *
 * Worth a test rather than an eyeball because the interesting half is not the
 * collapse, it is that the width is restored by a script in the document head
 * rather than by React — so a reload is the assertion that matters.
 */
test('the sidebar collapses to a rail, and stays collapsed', async ({
  page,
}) => {
  await openEmptyApp(page)

  const navbar = page.getByRole('navigation')
  const width = () =>
    navbar.evaluate((node) => Math.round(node.getBoundingClientRect().width))

  expect(await width()).toBe(232)
  await expect(page.getByText('Groups')).toBeVisible()

  await page.getByRole('button', { name: 'Toggle sidebar' }).click()

  expect(await width()).toBe(60)
  // The rail drops what a 60px column cannot hold: the group list, whose rows
  // are all the same folder glyph, and the micro-labels above each section.
  await expect(page.getByText('Groups')).toBeHidden()
  await expect(page.getByText('No account. No cloud.')).toBeHidden()

  await page.reload()

  // Restored before the first paint, so this is not React catching up.
  await expect(page.getByRole('link', { name: 'Templates' })).toBeVisible()
  expect(await width()).toBe(60)

  await page.getByRole('button', { name: 'Toggle sidebar' }).click()
  expect(await width()).toBe(232)
  await expect(page.getByText('Groups')).toBeVisible()
})

test('the rail still reaches every destination', async ({ page }) => {
  await openEmptyApp(page)

  // The keyboard, since that is the other way in — and Mantine cancels the
  // browser's own binding, which on Firefox is the bookmarks sidebar.
  await page.keyboard.press('ControlOrMeta+B')
  expect(
    await page
      .getByRole('navigation')
      .evaluate((node) => Math.round(node.getBoundingClientRect().width)),
  ).toBe(60)

  /**
   * Found by name with no text on screen.
   *
   * A rail row is a glyph and a tooltip, and a tooltip is not an accessible
   * name — so each one carries an `aria-label` while collapsed. This clicks the
   * way a screen reader would find it, which is the only reason the assertion
   * is worth making.
   */
  await page.getByRole('link', { name: 'Images' }).click()
  await expect(page).toHaveURL(/\/images$/)

  // And the one action a new user needs is still there, having moved out of the
  // header — where there is no room beside the mark — into the list.
  await page.getByRole('button', { name: 'New resume' }).first().click()
  await expect(page.getByRole('dialog', { name: 'New resume' })).toBeVisible()
})
