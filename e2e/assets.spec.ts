import { expect, test } from '@playwright/test'

import { PNG_2X2, createResume, openEmptyApp, openInspectorTab } from './app'

import type { Page } from '@playwright/test'

/**
 * The standalone Images and Fonts pages.
 *
 * These exist because the routes used to be hardcoded empty states that never
 * read the database: they said "No images yet" to someone who had just uploaded
 * one through the editor. So the assertion that matters here is not that the
 * page renders — it always did — but that what it shows came out of IndexedDB.
 */

const uploadImage = async (page: Page, name: string) => {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add image' }).click()

  await (
    await chooser
  ).setFiles({
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_2X2, 'base64'),
  })
}

test('an image uploaded in the editor shows up on the Images page', async ({
  page,
}) => {
  test.slow()

  await openEmptyApp(page)
  await createResume(page, 'Ada Lovelace')

  await openInspectorTab(page, 'Assets')
  await uploadImage(page, 'portrait.png')
  await expect(page.getByText('1 stored')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('link', { name: 'Images' }).click()

  // The stub's own copy, which must not be what a populated gallery shows.
  await expect(page.getByText('No images yet')).toBeHidden()
  // The upload strips the extension: a stored asset is named, not a file path.
  await expect(page.getByLabel('Name of portrait')).toHaveValue('portrait')
  // 2x2 pixels, and unplaced — so the page reports its dimensions and that
  // nothing refers to it.
  await expect(page.getByText(/2×2/)).toBeVisible()
  await expect(page.getByText(/1 unused/)).toBeVisible()

  // Renaming commits on blur rather than per keystroke, which is what stops the
  // field being reset from the database mid-word.
  const name = page.getByLabel('Name of portrait')
  await name.fill('Headshot')
  await name.blur()

  await page.getByRole('link', { name: 'All resumes' }).click()
  await page.getByRole('link', { name: 'Images' }).click()
  await expect(page.getByLabel('Name of Headshot')).toHaveValue('Headshot')

  // The unused filter is the PRD's "identify unused images", and this image is
  // stored but never placed.
  // The label, not the radio: Mantine's segmented control parks the real input
  // off-screen and styles the label, so the input is neither clickable nor in
  // the viewport.
  await page
    .locator('label')
    .filter({ hasText: /^Unused$/ })
    .click()
  await expect(page.getByRole('radio', { name: 'Unused' })).toBeChecked()
  await expect(page.getByLabel('Name of Headshot')).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()

  const confirm = page.getByRole('dialog', { name: /Delete Headshot/ })
  await expect(confirm).toContainText(/not used by any resume/i)
  await confirm.getByRole('button', { name: 'Delete image' }).click()

  await expect(page.getByText('No images yet')).toBeVisible()
})

test('the Fonts page reports the store rather than assuming it is empty', async ({
  page,
}) => {
  await openEmptyApp(page)

  await page.getByRole('link', { name: 'Fonts' }).click()

  // The empty state is right here — but so is a count read from the database,
  // which the stub had no way to produce.
  await expect(page.getByText('No custom fonts')).toBeVisible()
  await expect(page.getByText(/0 stored/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add font' })).toBeVisible()
})

test('the Templates gallery offers no control it cannot honour', async ({
  page,
}) => {
  await openEmptyApp(page)

  await page.getByRole('link', { name: 'Templates' }).click()

  // Four templates, described. None of them is a button: this view explains
  // what each layout is for, and applying one happens where there is a document
  // to apply it to.
  await expect(page.getByText('Classic')).toBeVisible()
  await expect(page.getByRole('button', { name: /Classic/ })).toHaveCount(0)
})
