import { expect, test } from '@playwright/test'

import { cardMenu, createResume, openEmptyApp, visibleMenu } from './app'

import type { Page } from '@playwright/test'

/**
 * The library's own actions.
 *
 * Every one of these is a Mantine overlay — a menu, a submenu, a modal — which
 * is exactly the part of the app no unit test can reach. They are grouped here
 * because they share one setup: a resume, and a group to move it into.
 */

const openLibrary = async (page: Page) => {
  await page.getByRole('link', { name: 'All resumes' }).click()
}

const createGroup = async (page: Page, name: string) => {
  await page.getByRole('button', { name: 'New group' }).click()

  const dialog = page.getByRole('dialog', { name: /group/i })
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByRole('button', { name: 'Create group' }).click()
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible()
}

/** Opens a card's menu, hovers "Move to", and picks a destination from the
 * submenu — which is a dropdown of its own, not part of the parent's. */
const moveTo = async (page: Page, title: string, destination: string) => {
  const menu = await cardMenu(page, title)
  await menu.getByRole('menuitem', { name: 'Move to' }).hover()
  await visibleMenu(page).getByRole('menuitem', { name: destination }).click()
}

test.beforeEach(async ({ page }) => {
  await openEmptyApp(page)
  await createResume(page, 'Ada Lovelace')
  await openLibrary(page)
})

test('moves a resume into a group, and out again', async ({ page }) => {
  await createGroup(page, 'Applications')

  await moveTo(page, 'Ada Lovelace', 'Applications')

  // The group's own view is the assertion: a count could be stale, a resume
  // listed under the group cannot be.
  await page.getByRole('link', { name: /Applications/ }).click()
  await expect(page.getByText('Ada Lovelace')).toBeVisible()

  await moveTo(page, 'Ada Lovelace', 'Ungrouped')

  await expect(page.getByText('Ada Lovelace')).toBeHidden()
})

test('renames a group', async ({ page }) => {
  await createGroup(page, 'Applications')

  await page.getByRole('button', { name: 'Actions for Applications' }).click()

  await page
    .getByRole('menu', { name: 'Actions for Applications' })
    .getByRole('menuitem', { name: 'Rename' })
    .click()

  const dialog = page.getByRole('dialog', { name: 'Rename group' })
  await dialog.getByLabel('Name').fill('Sent')
  await dialog.getByRole('button', { name: 'Rename' }).click()

  await expect(page.getByRole('link', { name: /Sent/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Applications/ })).toBeHidden()
})

test('deleting a group keeps the resumes in it', async ({ page }) => {
  await createGroup(page, 'Applications')
  await moveTo(page, 'Ada Lovelace', 'Applications')

  await page.getByRole('button', { name: 'Actions for Applications' }).click()

  await page
    .getByRole('menu', { name: 'Actions for Applications' })
    .getByRole('menuitem', { name: 'Delete group' })
    .click()

  const confirm = page.getByRole('dialog', { name: /Delete Applications/ })
  // The dialog has to say what happens to the contents, because "delete" on a
  // folder reads as "delete what is in it".
  await expect(confirm).toContainText(/ungrouped/i)
  await confirm.getByRole('button', { name: 'Delete group' }).click()

  await expect(page.getByRole('link', { name: /Applications/ })).toBeHidden()

  await openLibrary(page)
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
})

test('archives and restores a resume', async ({ page }) => {
  const menu = await cardMenu(page, 'Ada Lovelace')
  await menu.getByRole('menuitem', { name: 'Archive' }).click()

  await expect(page.getByText('Ada Lovelace')).toBeHidden()

  await page.getByRole('link', { name: 'Archived' }).click()
  await expect(page.getByText('Ada Lovelace')).toBeVisible()

  const archived = await cardMenu(page, 'Ada Lovelace')
  await archived.getByRole('menuitem', { name: 'Restore' }).click()

  await expect(page.getByText('Ada Lovelace')).toBeHidden()

  await openLibrary(page)
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
})

test('duplicates and renames a resume', async ({ page }) => {
  const menu = await cardMenu(page, 'Ada Lovelace')
  await menu.getByRole('menuitem', { name: 'Duplicate' }).click()

  await expect(page.getByText('Ada Lovelace copy')).toBeVisible()

  const copy = await cardMenu(page, 'Ada Lovelace copy')
  await copy.getByRole('menuitem', { name: 'Rename' }).click()

  const dialog = page.getByRole('dialog', { name: 'Rename resume' })
  await dialog.getByLabel('Name').fill('Second draft')
  await dialog.getByRole('button', { name: 'Rename' }).click()

  await expect(page.getByText('Second draft')).toBeVisible()
  await expect(page.getByText('Ada Lovelace copy')).toBeHidden()
})
