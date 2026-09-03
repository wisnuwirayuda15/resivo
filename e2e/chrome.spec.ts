import { expect, test } from '@playwright/test'

import { openEmptyApp } from './app'

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
