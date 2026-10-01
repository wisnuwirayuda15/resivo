import { expect, test } from "@playwright/test";

import {
  PNG_2X2,
  cardMenu,
  createResume,
  openEmptyApp,
  openInspectorTab,
  paper,
  paperText,
} from "./app";

import type { Page } from "@playwright/test";

/**
 * A resume as a zip, out of the library and back in through the dialog.
 *
 * The unit tests prove the round trip against a stubbed image decoder, because a
 * decoder needs a browser. This is the browser: a real image uploaded, stored,
 * written into an archive, read back through the real decoder, and drawn.
 */

const importDialog = async (page: Page) => {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "New resume" })
    .click();

  const dialog = page.getByRole("dialog", { name: "New resume" });
  await expect(dialog).toBeVisible();

  return dialog;
};

const chooseFile = async (
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
) => {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import a file" }).click();
  await (await chooser).setFiles(file);
};

test("a zip from the library imports as the same resume, picture and all", async ({
  page,
}) => {
  test.slow();

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace", {
    template: "Bold",
    start: "Example resume",
  });

  // A picture on the paper, so the archive has an image to carry.
  await openInspectorTab(page, "Assets");

  const upload = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add image" }).click();
  await (
    await upload
  ).setFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_2X2, "base64"),
  });
  await expect(page.getByText("1 stored")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("img", { name: "portrait" }).click();
  await page.getByRole("combobox", { name: "Section to insert into" }).click();
  await page.getByRole("option", { name: "Summary" }).click();
  await page.getByRole("button", { name: "Insert" }).click();

  const figure = paper(page).locator("[data-paged] .rp-figure").first();
  await expect(figure).toBeVisible({ timeout: 15_000 });

  const original = await paperText(page);

  await page.getByRole("link", { name: "All resumes" }).click();

  const menu = await cardMenu(page, "Ada Lovelace");
  const download = page.waitForEvent("download");
  await menu.getByRole("menuitem", { name: "Export as zip" }).click();

  const file = await download;
  expect(file.suggestedFilename()).toBe("Ada Lovelace.zip");

  const chunks: Array<Buffer> = [];

  for await (const chunk of await file.createReadStream()) {
    chunks.push(Buffer.from(chunk));
  }

  const bytes = Buffer.concat(chunks);

  // A zip, which any archive tool opens.
  expect(bytes.subarray(0, 2).toString()).toBe("PK");

  const dialog = await importDialog(page);

  await chooseFile(page, {
    name: "Ada Lovelace.zip",
    mimeType: "application/zip",
    buffer: bytes,
  });

  await expect(dialog.getByText("Ada Lovelace.zip")).toBeVisible();
  await expect(dialog.getByText(/keeps its own template/)).toBeVisible();

  await dialog.getByRole("button", { name: "Create resume" }).click();
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);

  // The copy, not the original: it is the one the dialog just made.
  await expect(
    paper(page).locator("[data-paged] .rp-figure").first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => paperText(page), { timeout: 15_000 }).toBe(original);
  await expect(
    paper(page).locator('.resivo-paper[data-template="bold"]').first(),
  ).toBeVisible();
});

test("a zip that is not a bundle is refused with a sentence", async ({
  page,
}) => {
  await openEmptyApp(page);

  const dialog = await importDialog(page);

  // Starts like a zip, which is all the dialog checks before handing it over.
  await chooseFile(page, {
    name: "broken.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("PK\u0003\u0004 this is not an archive"),
  });

  await expect(dialog.getByText(/is not a zip archive/)).toBeVisible();
  await expect(dialog.getByText("broken.zip")).toBeHidden();
});

test("the editor's export menu offers the bundle too", async ({ page }) => {
  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace", { start: "Example resume" });

  await page.getByRole("button", { name: "Export" }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /^Bundle/ }).click();

  const file = await download;
  expect(file.suggestedFilename()).toBe("Ada Lovelace.zip");

  const chunks: Array<Buffer> = [];

  for await (const chunk of await file.createReadStream()) {
    chunks.push(Buffer.from(chunk));
  }

  expect(Buffer.concat(chunks).subarray(0, 2).toString()).toBe("PK");
});
