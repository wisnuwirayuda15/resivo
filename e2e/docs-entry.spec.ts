import { expect, test } from "@playwright/test";

import { openEmptyApp } from "./app";

import type { Page } from "@playwright/test";

/**
 * The ways into the documentation from the rest of the site: the landing page's
 * bar and footer, the app's menu and the command palette.
 *
 * Each goes to the docs in the language the interface is in, which is the point
 * of linking by language and not through `/docs`: no redirect, and no chance of
 * landing in the other language than the one just chosen.
 */

const hydrated = async (page: Page) => {
  await expect(page.locator('[data-reveal="shown"]').first()).toBeVisible();
};

const useIndonesian = (page: Page) =>
  page.addInitScript(() => {
    window.localStorage.setItem("resivo.language", "id");
  });

test.describe("entry points to the docs", () => {
  test("the landing bar and footer lead to the docs in English", async ({
    page,
  }) => {
    await page.goto("/");
    await hydrated(page);

    const links = page.getByRole("link", { name: "Docs", exact: true });

    await expect(links).toHaveCount(2);
    await expect(links.first()).toHaveAttribute("href", "/en/docs");
    await expect(links.last()).toHaveAttribute("href", "/en/docs");

    await links.first().click();
    await expect(page).toHaveURL("/en/docs");
    await expect(
      page.getByRole("heading", { level: 1, name: "Resivo documentation" }),
    ).toBeVisible();
  });

  test("the landing page leads to the Indonesian docs when that is the language", async ({
    page,
  }) => {
    await useIndonesian(page);
    await page.goto("/");
    await hydrated(page);

    const link = page
      .getByRole("link", { name: "Dokumentasi", exact: true })
      .first();

    await expect(link).toHaveAttribute("href", "/id/docs");
    await link.click();
    await expect(page).toHaveURL("/id/docs");
  });

  test("the application menu has a Documentation item", async ({ page }) => {
    await openEmptyApp(page);
    await page.getByRole("button", { name: "Application menu" }).click();

    const item = page.getByRole("menuitem", { name: "Documentation" });

    await expect(item).toHaveAttribute("href", "/en/docs");
    await item.click();
    await expect(page).toHaveURL("/en/docs");
  });

  test("the command palette goes to the docs", async ({ page }) => {
    await openEmptyApp(page);
    await page.keyboard.press("ControlOrMeta+K");

    const palette = page
      .locator('[role="dialog"]')
      .filter({ has: page.getByPlaceholder("Search commands…") });

    await page.getByPlaceholder("Search commands…").fill("manual");
    await palette.getByRole("button", { name: /Documentation/ }).click();

    await expect(page).toHaveURL("/en/docs");
  });

  test("the palette uses the Indonesian docs for an Indonesian interface", async ({
    page,
  }) => {
    await openEmptyApp(page);
    // After the helper, which waits for the English interface.
    await page.evaluate(() => localStorage.setItem("resivo.language", "id"));
    await page.reload();
    // The language is applied after hydration, so a link in it proves the page
    // is interactive before the shortcut is pressed.
    await expect(page.getByRole("link", { name: "Template" })).toBeVisible();
    await page.keyboard.press("ControlOrMeta+K");

    const search = page.getByPlaceholder(/Cari perintah/);

    await search.fill("panduan");
    await page
      .locator('[role="dialog"]')
      .getByRole("button", { name: /Dokumentasi/ })
      .click();

    await expect(page).toHaveURL("/id/docs");
  });
});
