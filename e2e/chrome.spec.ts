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
