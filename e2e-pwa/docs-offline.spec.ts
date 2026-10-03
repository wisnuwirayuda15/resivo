import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

/**
 * The documentation, offline.
 *
 * Only what has been read is held (see the header of `public/sw.js` for why the
 * docs are not precached), so each test reads first, takes the network away,
 * and then asks for something the worker has to answer from what it kept. The
 * worker has to be controlling the page before anything is cached through it,
 * which a first visit is not: the page that registers it was fetched before it
 * existed. So every test visits once to install it and again to be controlled.
 */

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

/** Visits `path`, waits for the worker, and reloads so the page is controlled
 * and its own HTML goes through the cache. */
const visitControlled = async (page: Page, path: string): Promise<void> => {
  await page.goto(path);
  await workerReady(page);
  await page.reload();
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
};

test("a docs page that was read opens again with no network", async ({
  page,
  context,
}) => {
  await visitControlled(page, "/en/docs/format/overview");

  await context.setOffline(true);
  await page.reload();

  await expect(
    page.getByRole("heading", { level: 1, name: "The shape of the file" }),
  ).toBeVisible();
});

test("moving between docs pages works offline once both were read", async ({
  page,
  context,
}) => {
  const sidebar = page.getByRole("navigation", { name: "Documentation" });
  const overview = sidebar.getByRole("link", { name: "The shape of the file" });
  const home = sidebar.getByRole("link", { name: "Resivo documentation" });

  await visitControlled(page, "/en/docs");

  // Read online, so each page's data is fetched and kept. The first page of a
  // visit comes with the document and is not fetched, which is why the trip
  // goes there, back, and there again.
  await sidebar.getByRole("button", { name: "Format" }).click();
  await overview.click();
  await expect(page).toHaveURL("/en/docs/format/overview");
  await home.click();
  await expect(page).toHaveURL("/en/docs");

  await context.setOffline(true);

  await overview.click();
  await expect(page).toHaveURL("/en/docs/format/overview");
  await expect(
    page.getByRole("heading", { level: 1, name: "The shape of the file" }),
  ).toBeVisible();

  await home.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Resivo documentation" }),
  ).toBeVisible();
});

test("search works offline after it has been used once", async ({
  page,
  context,
}) => {
  await visitControlled(page, "/en/docs");

  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Search the documentation").fill("section holds");
  await expect(
    page.getByRole("dialog").getByRole("button").first(),
  ).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible();

  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Search the documentation").fill("directive");

  await expect(
    page.getByRole("dialog").getByRole("button").first(),
  ).toBeVisible();
  await expect(page.getByText(/could not be loaded/)).toBeHidden();
});

test("a docs page never opened falls back to the docs home, not the app", async ({
  page,
  context,
}) => {
  await visitControlled(page, "/en/docs");

  await context.setOffline(true);
  await page.goto("/en/docs/format/overview");

  await expect(page).toHaveURL("/en/docs");
  await expect(
    page.getByRole("heading", { level: 1, name: "Resivo documentation" }),
  ).toBeVisible();
});

test("the Markdown and llms.txt are not intercepted while online", async ({
  page,
}) => {
  await visitControlled(page, "/en/docs");

  const markdown = await page.evaluate(async () => {
    const response = await fetch("/en/docs/format/overview.md");

    return {
      type: response.headers.get("content-type"),
      text: await response.text(),
    };
  });
  const llms = await page.evaluate(async () => {
    const response = await fetch("/llms.txt");

    return response.headers.get("content-type");
  });

  expect(markdown.type).toContain("text/markdown");
  expect(markdown.text).toContain("# The shape of the file");
  expect(llms).toContain("text/plain");
});

test("a stored language still wins when the worker is in the way", async ({
  page,
}) => {
  await visitControlled(page, "/en/docs");
  await page.evaluate(() => localStorage.setItem("resivo.language", "id"));

  await page.goto("/docs/format/overview");

  await expect(page).toHaveURL("/id/docs/format/overview");
});
