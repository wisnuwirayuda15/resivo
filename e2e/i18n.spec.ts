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

/**
 * Hands a file to the page's hidden file input and waits for the page to react.
 *
 * Retried, for the reason `chooseInSettings` is: before React has taken over a
 * server-rendered page the input exists and its handler does not, so the first
 * file is simply dropped.
 */
const offerFile = async (
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
  expected: ReturnType<Page["getByText"]>,
) => {
  await expect(async () => {
    await page.locator('input[type="file"]').first().setInputFiles(file);
    await expect(expected).toBeVisible({ timeout: 1000 });
  }).toPass();
};

test("a refused upload is explained in the interface language", async ({
  page,
}) => {
  await openEmptyApp(page);
  await page.evaluate(() => localStorage.setItem("resivo.language", "id"));
  await page.goto("/images");

  await offerFile(
    page,
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
    page.getByText(/bukan gambar yang didukung/),
  );
});

test("a refused backup is explained in the interface language", async ({
  page,
}) => {
  await openEmptyApp(page);
  await page.evaluate(() => localStorage.setItem("resivo.language", "id"));
  await page.goto("/settings");

  await expect(page.getByText("Cadangkan dan pulihkan")).toBeVisible();

  await offerFile(
    page,
    {
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from("not json at all"),
    },
    page.getByText(/bukan JSON yang valid/),
  );
});

test("the public pages follow the language, links inside sentences included", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("resivo.language", "id"));

  // The landing page is rendered on the server in English and moves to the
  // reader's language once it has hydrated, so the assertion waits for it.
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Resume Anda tidak pernah meninggalkan browser ini.",
    }),
  ).toBeVisible();

  // A link in the middle of a sentence, which `Trans` places by the
  // translation's own word order.
  await page.goto("/about");

  const settings = page.getByRole("link", { name: "Pengaturan", exact: true });

  await expect(settings.first()).toBeVisible();
  await expect(
    page.getByText("Berkas cadangan di", { exact: false }),
  ).toContainText("Pengaturan");

  await page.goto("/templates");
  await expect(
    page.getByText("Setiap template satu kolom dan aman bagi parser."),
  ).toBeVisible();
});
