import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

/**
 * The app opens with no network, and the data is still there.
 *
 * This is the only claim Resivo makes that a user would notice being broken,
 * and the only one no other test can reach: it needs a production build (the
 * worker is not registered in development), a real service worker, and a
 * network that goes away after the first visit. See `playwright.pwa.config.ts`
 * for why it is a suite of its own.
 *
 * Every test starts from a fresh browser context, so each one registers the
 * worker again from nothing. That is slower and it is also the case that
 * matters: the first visit has to be enough.
 */

/** The worker registers on `load` and installs after that, so both are waited
 * for rather than assumed. */
const workerReady = async (page: Page): Promise<void> => {
  await page.waitForLoadState("load");

  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.ready;

          return registration.active?.state ?? null;
        }),
      { timeout: 30_000 },
    )
    .toBe("activated");
};

/** What the worker has actually stored, by path. */
const cachedPaths = (page: Page): Promise<Array<string>> =>
  page.evaluate(async () => {
    const [name] = await caches.keys();
    const cache = await caches.open(name as string);
    const keys = await cache.keys();

    return keys.map((request) => new URL(request.url).pathname);
  });

const paper = (page: Page) =>
  page.frameLocator("iframe").locator("body [data-paged]").first();

test("precaches the shell on the first visit", async ({ page }) => {
  await page.goto("/resumes");
  await workerReady(page);

  const cached = await cachedPaths(page);

  /**
   * The install step is what makes one visit enough. Without it the shell is
   * only cached on the visit after the first, so somebody who installed the app
   * and then lost the network would get nothing.
   */
  expect(cached).toContain("/resumes");
  expect(cached).toContain("/manifest.webmanifest");
  expect(cached).toContain("/icon-512.png");

  // The hashed assets the shell HTML referenced, read out of the document at
  // install because their names cannot be known in advance. The count is the
  // shell's, not the whole build's: precaching all of it would be 21 MB.
  const assets = cached.filter((path) => path.startsWith("/assets/"));

  expect(assets.length).toBeGreaterThan(10);
  expect(assets.length).toBeLessThan(60);
});

test("the manifest and every icon it names are served", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");

  expect(response.status()).toBe(200);

  const manifest = (await response.json()) as {
    start_url: string;
    icons: Array<{ src: string }>;
  };

  // The URL an installed copy opens at. A 404 here is an install that lands on
  // an error page.
  expect(manifest.start_url).toBe("/resumes");
  expect((await request.get(manifest.start_url)).status()).toBeLessThan(400);

  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).status()).toBe(200);
  }
});

test("opens the library with the network gone", async ({ page, context }) => {
  await page.goto("/resumes");
  await workerReady(page);

  await context.setOffline(true);
  await page.reload();

  // Rendered, not merely served: the shell came out of the cache and the app on
  // top of it hydrated and ran.
  await expect(page.getByRole("link", { name: "Templates" })).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("button", { name: "New resume" }),
  ).toBeVisible();
});

test("a resume written online still opens offline", async ({
  page,
  context,
}) => {
  await page.goto("/resumes");
  await workerReady(page);

  await page
    .getByRole("banner")
    .getByRole("button", { name: "New resume" })
    .click();

  const dialog = page.getByRole("dialog", { name: "New resume" });
  await dialog.getByLabel("Name").fill("Offline");
  await dialog.getByRole("button", { name: "Create resume" }).click();

  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);

  const editor = page.url();

  // Waited for so the preview iframe, the paginator and Monaco are all in the
  // cache before the network is taken away.
  await expect(paper(page)).toBeVisible({ timeout: 30_000 });

  await context.setOffline(true);
  await page.goto(editor);

  /**
   * The document itself never needed a network: it is in IndexedDB. What is
   * being tested is that the code which reads and typesets it does not either,
   * which is the part that used to come off a server on every reload.
   */
  await expect(paper(page)).toBeVisible({ timeout: 30_000 });
  expect(await paper(page).innerText()).toMatch(/summary/i);
});
