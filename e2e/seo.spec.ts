import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

/**
 * What a crawler and an unfurler see.
 *
 * Asserted in a real browser against the server's own response, because that
 * is the only place the answer lives: the meta comes from each route's `head`,
 * merged by the router, rendered by the SSR shell. A unit test could check the
 * arrays and still miss the merge, which is exactly what went wrong with
 * `theme-color`: two tags with one name, deduped down to one.
 *
 * The rule these tests encode is that three pages are worth indexing and the
 * rest are not. Everything behind the app shell renders one browser's
 * IndexedDB, so a crawler sees an empty shell of it however full the real one
 * is, and an empty shell in a search index is worse than no result.
 */

/** Google truncates a description at roughly 160 characters. */
const DESCRIPTION_MAX = 160

const content = async (page: Page, selector: string) =>
  page.locator(selector).first().getAttribute('content')

test('the landing page is described, indexable and unfurlable', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Resivo, a local-first resume builder')

  const description = await content(page, 'meta[name="description"]')
  expect(description).toContain('Markdown')
  expect((description ?? '').length).toBeLessThanOrEqual(DESCRIPTION_MAX)

  expect(await content(page, 'meta[name="robots"]')).toBe('index, follow')

  // The social card, and the size that makes the wordmark on it legible.
  expect(await content(page, 'meta[property="og:title"]')).toContain('Resivo')
  expect(await content(page, 'meta[property="og:image"]')).toBe('/og.png')
  expect(await content(page, 'meta[name="twitter:card"]')).toBe(
    'summary_large_image',
  )

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    '/',
  )

  // Exactly one h1, and it is the claim rather than the wordmark.
  const headings = page.locator('h1')
  await expect(headings).toHaveCount(1)
  await expect(headings).toContainText('never leaves this browser')
})

test('both theme colours survive the head merge', async ({ page }) => {
  await page.goto('/')

  const colours = page.locator('meta[name="theme-color"]')

  await expect(colours).toHaveCount(2)
  await expect(colours.nth(0)).toHaveAttribute(
    'media',
    '(prefers-color-scheme: light)',
  )
  await expect(colours.nth(1)).toHaveAttribute(
    'media',
    '(prefers-color-scheme: dark)',
  )
})

test('the structured data parses and names the app', async ({ page }) => {
  await page.goto('/')

  const raw = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent()

  const data = JSON.parse(raw ?? '{}')

  expect(data['@type']).toBe('SoftwareApplication')
  expect(data.name).toBe('Resivo')
  expect(data.featureList.length).toBeGreaterThan(3)
})

test('the two other public pages carry their own title and description', async ({
  page,
}) => {
  for (const [path, fragment] of [
    ['/about', 'About Resivo'],
    ['/templates', 'templates'],
  ] as const) {
    await page.goto(path)

    await expect(page).toHaveTitle(new RegExp(fragment, 'i'))
    expect(await content(page, 'meta[name="robots"]')).toBe('index, follow')

    const description = await content(page, 'meta[name="description"]')
    expect((description ?? '').length).toBeGreaterThan(40)
    expect((description ?? '').length).toBeLessThanOrEqual(DESCRIPTION_MAX)

    // The shell renders the route title as the page's h1.
    await expect(page.locator('h1')).toHaveCount(1)
  }
})

test('the app routes ask not to be indexed', async ({ page }) => {
  for (const path of [
    '/resumes',
    '/archive',
    '/images',
    '/fonts',
    '/settings',
  ]) {
    await page.goto(path)

    expect(await content(page, 'meta[name="robots"]')).toBe(
      'noindex, nofollow, noimageindex',
    )
  }
})

test('robots.txt is served, and keeps crawlers out of the app', async ({
  request,
}) => {
  const response = await request.get('/robots.txt')

  expect(response.status()).toBe(200)

  const body = await response.text()

  expect(body).toContain('User-agent: *')

  for (const path of [
    '/resumes',
    '/archive',
    '/images',
    '/fonts',
    '/settings',
  ]) {
    expect(body).toContain(`Disallow: ${path}`)
  }
})

test('the social card is a real image at the size unfurlers crop from', async ({
  request,
}) => {
  const response = await request.get('/og.png')

  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/png')

  /**
   * The dimensions, read out of the PNG header rather than trusted.
   *
   * A PNG puts its width and height in the IHDR chunk, as big-endian 32-bit
   * integers at bytes 16 and 20. An image at the wrong size is cropped by
   * every unfurler, which is the failure this catches.
   */
  const bytes = await response.body()

  expect(bytes.readUInt32BE(16)).toBe(1200)
  expect(bytes.readUInt32BE(20)).toBe(630)
})
