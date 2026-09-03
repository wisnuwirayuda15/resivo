import { expect, test } from '@playwright/test'

import { PNG_2X2, createResume, openEmptyApp, openInspectorTab } from './app'

/**
 * The settings the app kept but never showed.
 *
 * The settings table had five repository functions and not one production
 * caller, and `totalImageBytes` carried the comment "for the settings view"
 * with no view to call it. These prove both now have one.
 */

test('reports what the device is holding', async ({ page }) => {
  test.slow()

  await openEmptyApp(page)
  await createResume(page, 'Ada Lovelace')

  await openInspectorTab(page, 'Assets')

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add image' }).click()
  await (
    await chooser
  ).setFiles({
    name: 'portrait.png',
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_2X2, 'base64'),
  })

  await expect(page.getByText('1 stored')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('link', { name: 'Settings' }).click()

  await expect(page.getByText('Storage')).toBeVisible()

  // A count and a size read out of the tables, not a quota bar: a browser's
  // storage budget is padded and shared, so a percentage would be invented.
  await expect(page.getByText(/1 file · \d+ B/)).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText(/0 files · 0 B/)).toBeVisible()

  // The row is the way to the page where something can be done about it.
  await page.getByRole('link', { name: 'Images', exact: true }).last().click()
  await expect(page.getByLabel('Name of portrait')).toBeVisible()
})

test('remembers the template the last resume was made with', async ({
  page,
}) => {
  test.slow()

  await openEmptyApp(page)
  await createResume(page, 'Ada Lovelace', { template: 'Editorial' })

  await page.getByRole('link', { name: 'All resumes' }).click()
  await page.getByRole('button', { name: 'New resume' }).first().click()

  const dialog = page.getByRole('dialog', { name: 'New resume' })
  await expect(dialog).toBeVisible()

  // `editor.lastTemplateId` was declared in the settings registry from the
  // start and never written, so the dialog always opened on Classic.
  await expect(
    dialog.getByRole('button', { name: /Editorial/ }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByRole('button', { name: /Classic/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})
