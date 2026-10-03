import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

/**
 * Searching the docs.
 *
 * The index is a static file per language, fetched once on the first query and
 * searched in the browser. These specs cover the part a reader sees (opening,
 * typing, picking a hit, the empty and not-found states, Indonesian terms) and
 * the part that is easy to break without anyone noticing: that nothing is
 * downloaded before a search, that it is downloaded once, and that each language
 * only ever receives its own text.
 */

/** Bytes, uncompressed, one language's index may weigh.
 *
 * The first figure, 800 KB, came from placeholder pages and was too low by a
 * factor of three: real pages cost about 32 KB each. Measured with the finished
 * docs (47 pages a language), English is 1.49 MB and Indonesian 1.53 MB, and each
 * is about 310 KB on the wire once compressed. It is fetched once, on a reader's
 * first search, and then kept by the service worker. The budget leaves a sixth of
 * room. Most of the weight is the engine's sorting tables and the url and page id
 * frequencies, which a leaner index could drop. Raise it knowingly, not by
 * drift. */
const INDEX_BUDGET = 1792 * 1024;

const hydrated = async (page: Page) => {
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
};

/** The hits. Spotlight draws each as a button inside the dialog. */
const hits = (page: Page, name?: RegExp) =>
  page
    .getByRole("dialog")
    .getByRole("button", name === undefined ? {} : { name });

const box = (page: Page) =>
  page.getByPlaceholder(/Search the documentation|Cari di dokumentasi/);

test.describe("docs search", () => {
  test("opens from the header, from the keyboard, and closes on Escape", async ({
    page,
  }) => {
    await page.goto("/en/docs");
    await hydrated(page);

    await page.getByRole("button", { name: "Search" }).click();
    await expect(box(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(box(page)).toBeHidden();

    await page.keyboard.press("Control+k");
    await expect(box(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(box(page)).toBeHidden();

    await page.keyboard.press("/");
    await expect(box(page)).toBeVisible();
  });

  test("says what to do before anything is typed", async ({ page }) => {
    await page.goto("/en/docs");
    await hydrated(page);
    await page.keyboard.press("Control+k");

    await expect(page.getByText("Type to search every page.")).toBeVisible();
  });

  test("finds a heading and goes to it", async ({ page }) => {
    await page.goto("/en/docs");
    await hydrated(page);
    await page.keyboard.press("Control+k");
    await box(page).fill("directives are");

    const hit = hits(page, /What the directives are/).first();

    await expect(hit).toBeVisible();
    await hit.click();

    await expect(page).toHaveURL(/\/en\/docs\/format\/overview#directives$/);
    await expect(box(page)).toBeHidden();
  });

  test("is driven from the keyboard alone", async ({ page }) => {
    await page.goto("/en/docs");
    await hydrated(page);
    await page.keyboard.press("Control+k");
    // The first hit for this query is the page itself, so Enter lands on it.
    await box(page).fill("shape of the file");
    await expect(hits(page).first()).toBeVisible();

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/en\/docs\/format\/overview/);
  });

  test("says so when nothing matches", async ({ page }) => {
    await page.goto("/en/docs");
    await hydrated(page);
    await page.keyboard.press("Control+k");
    await box(page).fill("zzzxqv");

    await expect(page.getByText(/Nothing found for that/)).toBeVisible();
  });

  test("finds an Indonesian page by an Indonesian term, in Indonesian chrome", async ({
    page,
  }) => {
    await page.goto("/id/docs");
    await hydrated(page);
    await page.getByRole("button", { name: "Cari" }).click();
    await box(page).fill("dirapikan");

    const hit = hits(page).first();

    await expect(hit).toBeVisible();
    await hit.click();
    // Which Indonesian page ranks first moves with every page written. That it
    // is an Indonesian page, found by an Indonesian word, is the claim.
    await expect(page).toHaveURL(/\/id\/docs\/.+/);
  });

  test("searches only the language being read", async ({ page }) => {
    await page.goto("/id/docs");
    await hydrated(page);
    await page.keyboard.press("Control+k");
    // Prose that exists only in the English page.
    await box(page).fill("Ordinary");

    await expect(page.getByText(/Tidak ada hasil/)).toBeVisible();
  });

  test("downloads the index on the first query, once, and never before", async ({
    page,
  }) => {
    const requests: Array<string> = [];

    page.on("request", (request) => {
      if (request.url().includes("/api/search/")) {
        requests.push(request.url());
      }
    });

    await page.goto("/en/docs");
    await hydrated(page);
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(400);

    expect(requests).toEqual([]);

    await box(page).fill("direct");
    await expect(hits(page).first()).toBeVisible();
    await box(page).fill("directive");
    await box(page).fill("section");
    await expect(hits(page).first()).toBeVisible();

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatch(/\/api\/search\/en$/);
  });

  test("serves each language only its own text, inside a size budget", async ({
    request,
  }) => {
    const en = await request.get("/api/search/en");
    const id = await request.get("/api/search/id");

    expect(en.status()).toBe(200);
    expect(id.status()).toBe(200);

    const enText = await en.text();
    const idText = await id.text();

    expect(enText).toContain("never loosely");
    expect(enText).not.toContain("tidak pernah secara longgar");
    expect(idText).toContain("tidak pernah secara longgar");
    expect(idText).not.toContain("never loosely");

    expect(enText.length).toBeLessThan(INDEX_BUDGET);
    expect(idText.length).toBeLessThan(INDEX_BUDGET);

    expect((await request.get("/api/search/xx")).status()).toBe(404);
  });
});
