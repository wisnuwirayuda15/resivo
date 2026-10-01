import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

import { createResume, openEmptyApp } from "./app";

/**
 * The interface language.
 *
 * What these cover that `i18n.test.ts` cannot: that the choice is applied with
 * no reload, kept across one, and reaches the places a unit test never draws (the
 * sidebar, the document's own `lang`, a panel inside the editor). The messages
 * themselves, and that both languages have all of them, are the unit test's.
 */

/**
 * Switches language the way a person does, from Settings.
 *
 * Retried until the list is open. Settings is rendered on the server, and a
 * click on a server-rendered select that React has not taken over yet does
 * nothing, which `CLAUDE.md` records for the landing page and which is the same
 * thing here: the combobox is on screen, focused, and closed. Waiting for the
 * option is what waits for hydration.
 */
const chooseInSettings = async (page: Page, name: string) => {
  await page.goto("/settings");

  const option = page.getByRole("option", { name });

  await expect(async () => {
    await page.getByRole("combobox").first().click();
    await expect(option).toBeVisible({ timeout: 1000 });
  }).toPass();

  await option.click();
};

test("the language is chosen in Settings, applies at once, and stays", async ({
  page,
}) => {
  await openEmptyApp(page);
  await expect(page.getByRole("link", { name: /^All resumes/ })).toBeVisible();

  await chooseInSettings(page, "Bahasa Indonesia");

  // No reload: the sidebar re-renders because the language changed.
  await expect(page.getByRole("link", { name: /^Semua resume/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");

  await page.reload();

  await expect(page.getByRole("link", { name: /^Semua resume/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");

  await chooseInSettings(page, "English");
  await expect(page.getByRole("link", { name: /^All resumes/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("the browser's language is used when nothing has been chosen", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "id-ID" });
  const page = await context.newPage();

  await page.goto("/resumes");

  await expect(page.getByRole("link", { name: /^Semua resume/ })).toBeVisible();

  await context.close();
});

test("an editor panel and the paper's own labels follow the language", async ({
  page,
}) => {
  await openEmptyApp(page);
  await createResume(page, "Blank one");

  await page.evaluate(() => localStorage.setItem("resivo.language", "id"));
  await page.reload();

  await page.getByRole("tab", { name: "ATS", exact: true }).click();

  await expect(page.getByRole("list", { name: "Masalah ATS" })).toContainText(
    "Resume ini tidak memiliki nama.",
  );

  // The page boxes are inside the preview iframe, which loads neither Mantine
  // nor Tailwind and is rendered by a portal.
  await expect(
    page.frameLocator("iframe").getByRole("group", { name: "Halaman 1" }),
  ).toBeVisible();
});

test("a stored language the app does not know is ignored", async ({ page }) => {
  await openEmptyApp(page);
  await page.evaluate(() => localStorage.setItem("resivo.language", "fr"));
  await page.reload();

  await expect(page.getByRole("link", { name: /^All resumes/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
