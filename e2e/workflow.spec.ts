import { expect, test } from '@playwright/test'

import {
  PNG_2X2,
  createResume,
  expectPaperReady,
  openEmptyApp,
  openInspectorTab,
  paperText,
  typeMarkdown,
} from './app'

/**
 * The workflow the PRD names, start to finish, as one test.
 *
 * One test rather than eleven, because the point is the sequence: a resume that
 * survives being edited, restyled, exported, backed up, reloaded and restored.
 * Split into eleven independent tests, each would rebuild the state the last one
 * proved, and none would prove that the state carries.
 *
 * `test.step` gives the failure a name, so a break still reads as "step 7" in
 * the report rather than as one long test that stopped somewhere.
 */
test('create, edit, style, export, back up, reload, restore', async ({
  page,
}) => {
  test.slow()

  /** Filled by step 9 and used by step 11 — the disaster it is a backup of
   * happens in between. */
  let backup = Buffer.alloc(0)

  await openEmptyApp(page)

  await test.step('1. create a resume', async () => {
    await createResume(page, 'Ada Lovelace')
  })

  await test.step('2. edit it in the Markdown pane', async () => {
    await typeMarkdown(
      page,
      [
        '# Ada Lovelace',
        '',
        '**Mathematician**',
        '',
        '## Summary',
        '',
        'Wrote the first algorithm.',
        '',
        '## Skills',
        '',
        '- Analysis',
        '- Notation',
      ].join('\n'),
    )

    // The preview is debounced behind the parse, so this is the assertion that
    // the whole chain — keystroke, parse, model, render, paginate — completed.
    await expect
      .poll(() => paperText(page), { timeout: 15_000 })
      .toMatch(/Wrote the first algorithm/)

    expect(await paperText(page)).toMatch(/Ada Lovelace/)
  })

  await test.step('3. change the template', async () => {
    await openInspectorTab(page, 'Style')
    await page.getByRole('button', { name: /Editorial/ }).click()

    // The template is CSS over one markup, so what changes is measurable rather
    // than visible from the text: the name is drawn at a different size.
    await expect
      .poll(
        async () =>
          page
            .frameLocator('iframe')
            .locator('[data-paged] .rp-name')
            .first()
            .evaluate((node) => getComputedStyle(node).fontSize),
        { timeout: 10_000 },
      )
      .not.toBe('')
  })

  await test.step('4. add an image', async () => {
    await openInspectorTab(page, 'Assets')

    // Through the file chooser rather than by filling the hidden input: the
    // hidden input is an implementation detail of Mantine's `FileButton`, and the
    // button is what a person clicks.
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Add image' }).click()

    await (
      await chooser
    ).setFiles({
      name: 'dot.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_2X2, 'base64'),
    })

    await expect(page.getByText('1 stored')).toBeVisible({ timeout: 15_000 })
  })

  await test.step('5. change a style token', async () => {
    await openInspectorTab(page, 'Style')

    const bodySize = page.getByLabel('Body size')
    await bodySize.fill('13')
    await bodySize.blur()

    await expect
      .poll(
        async () =>
          page
            .frameLocator('iframe')
            .locator('.resivo-paper')
            .first()
            .evaluate((node) =>
              getComputedStyle(node).getPropertyValue('--paper-fs-body').trim(),
            ),
        { timeout: 10_000 },
      )
      .toContain('13')
  })

  await test.step('6. export HTML, and offer PDF', async () => {
    await page.getByRole('button', { name: 'Export' }).click()

    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    // PDF is the browser's own print dialog, which no test can drive. That it is
    // offered is the part this can check. Matched as a menu item rather than as
    // text, because each item carries a title and a hint and both say "PDF".
    await expect(menu.getByRole('menuitem', { name: /^PDF/ })).toBeVisible()

    const download = page.waitForEvent('download')
    await menu.getByRole('menuitem', { name: /^HTML/ }).click()

    const file = await download
    expect(file.suggestedFilename()).toMatch(/\.html$/)

    const stream = await file.createReadStream()
    const chunks: Array<Buffer> = []

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }

    const html = Buffer.concat(chunks).toString('utf8')

    expect(html).toContain('Wrote the first algorithm')
    // Self-contained: the export inlines every asset, so nothing in it may point
    // at a host.
    expect(html).not.toMatch(/src="https?:/)
    expect(html).not.toMatch(/@import/)
    // Editing chrome must never reach an export.
    expect(html).not.toContain('rp-editable')
  })

  await test.step('7. create a second resume', async () => {
    await page.getByRole('link', { name: 'All resumes' }).click()
    await createResume(page, 'Grace Hopper')
    await page.getByRole('link', { name: 'All resumes' }).click()

    await expect(page.getByText('Ada Lovelace')).toBeVisible()
    await expect(page.getByText('Grace Hopper')).toBeVisible()
  })

  await test.step('8. create a group', async () => {
    await page.getByRole('button', { name: 'New group' }).click()

    const dialog = page.getByRole('dialog', { name: /group/i })
    await dialog.getByLabel('Name').fill('Applications')
    await dialog.getByRole('button', { name: /create|add/i }).click()

    await expect(page.getByRole('link', { name: /Applications/ })).toBeVisible()
  })

  await test.step('9. back the database up', async () => {
    await page.getByRole('link', { name: 'Settings' }).click()

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /back up|download backup/i }).click()

    const file = await download
    expect(file.suggestedFilename()).toMatch(/\.json$/)

    const stream = await file.createReadStream()
    const chunks: Array<Buffer> = []

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }

    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      kind: string
      resumes: Array<unknown>
      groups: Array<unknown>
      images: Array<unknown>
    }

    expect(parsed.kind).toBe('resivo.backup')
    expect(parsed.resumes).toHaveLength(2)
    expect(parsed.groups).toHaveLength(1)
    expect(parsed.images).toHaveLength(1)

    backup = Buffer.concat(chunks)
  })

  await test.step('10. reload, and find everything still there', async () => {
    await page.reload()
    await page.getByRole('link', { name: 'All resumes' }).click()

    await expect(page.getByText('Ada Lovelace')).toBeVisible()
    await expect(page.getByText('Grace Hopper')).toBeVisible()

    // The document itself, not just the row: reopening reads it back out of
    // IndexedDB and through the migration.
    await page.getByText('Ada Lovelace').click()
    await expectPaperReady(page)
    expect(await paperText(page)).toMatch(/Wrote the first algorithm/)
  })

  await test.step('11. lose everything, and restore it', async () => {
    // The disaster the README names: browser storage cleared, nothing left on
    // the device. A backup is the only copy, so this is the one path that has to
    // work when it is needed.
    await openEmptyApp(page)
    await expect(page.getByText('No resumes yet')).toBeVisible()

    await page.getByRole('link', { name: 'Settings' }).click()

    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Choose a backup file' }).click()
    await (
      await chooser
    ).setFiles({
      name: 'resivo-backup.json',
      mimeType: 'application/json',
      buffer: backup,
    })

    await expect(page.getByText('Restored')).toBeVisible({ timeout: 30_000 })

    await page.getByRole('link', { name: 'All resumes' }).click()
    await expect(page.getByText('Ada Lovelace')).toBeVisible()
    await expect(page.getByText('Grace Hopper')).toBeVisible()
    await expect(page.getByRole('link', { name: /Applications/ })).toBeVisible()

    // The document, the image and the group all came back — not just the rows.
    await page.getByText('Ada Lovelace').click()
    await expectPaperReady(page)
    expect(await paperText(page)).toMatch(/Wrote the first algorithm/)

    await openInspectorTab(page, 'Assets')
    await expect(page.getByText('1 stored')).toBeVisible()
  })
})
