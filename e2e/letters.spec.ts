import { expect, test } from "@playwright/test";

import {
  cardMenu,
  createResume,
  openEmptyApp,
  openInspectorTab,
  paper,
  paperText,
  pickSegment,
} from "./app";

import type { Page } from "@playwright/test";

/**
 * A cover letter, from the dialog and from a resume.
 *
 * What these cover that the unit tests cannot: that the dialog offers a letter,
 * that the paper draws one without the empty box a heading would leave, that the
 * ATS tab asks it letter questions, that the library files it where a person
 * looks, and that the export menu stops offering what means nothing for one.
 */

const newLetter = async (
  page: Page,
  start: "Example letter" | "Blank letter",
) => {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "New resume" })
    .click();

  const dialog = page.getByRole("dialog", { name: "New resume" });
  await expect(dialog).toBeVisible();

  await pickSegment(dialog, "Cover letter");
  await pickSegment(dialog, start);
  await dialog.getByLabel("Name").fill("Letter to Babbage");
  await dialog.getByRole("button", { name: "Create resume" }).click();

  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);
};

test("an example letter is a letter: no headings, its own checks, its own exports", async ({
  page,
}) => {
  test.slow();

  await openEmptyApp(page);
  await newLetter(page, "Example letter");

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("Dear Mr. Babbage,");

  // No section heading was drawn, so nothing sits above the first paragraph.
  await expect(paper(page).locator(".rp-item--section")).toHaveCount(0);
  await expect(paper(page).locator(".rp-item--block").first()).toBeVisible();

  // Asked letter questions: nothing about sections, nothing to report.
  await openInspectorTab(page, "ATS");
  await expect(page.getByText("No issues we recognise")).toBeVisible();

  // JSON Resume has nowhere to put a letter, and is not offered. Text is.
  await page.getByRole("button", { name: "Export" }).click();

  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem", { name: /^HTML/ })).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: /^JSON Resume/ }),
  ).toHaveCount(0);

  const download = page.waitForEvent("download");
  await menu.getByRole("menuitem", { name: /^Plain text/ }).click();
  expect((await download).suggestedFilename()).toBe(
    "Ada Lovelace cover letter.txt",
  );
});

test("a blank letter is asked for a name, not for sections", async ({
  page,
}) => {
  await openEmptyApp(page);
  await newLetter(page, "Blank letter");
  await openInspectorTab(page, "ATS");

  const issues = page.getByRole("list", { name: "ATS issues" });

  await expect(issues).toContainText("The letter has no sender name.");
  await expect(issues).not.toContainText("section");
});

test("the library files a letter, and one can be made from a resume", async ({
  page,
}) => {
  test.slow();

  await openEmptyApp(page);
  await createResume(page, "Master", { start: "Example resume" });
  await page.getByRole("link", { name: "All resumes" }).click();

  const menu = await cardMenu(page, "Master");
  await menu.getByRole("menuitem", { name: "Create cover letter" }).click();

  // Straight into the editor, with the header already there and the frame of a
  // letter to write between.
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);
  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("Dear Hiring Team,");
  expect(await paperText(page)).toContain("Ada Lovelace");

  await page.getByRole("link", { name: "All resumes" }).click();

  // The card says what it is, and the sidebar has a way to see only letters.
  await expect(page.getByText("Cover letter", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /^Cover letters/ }).click();
  await expect(page).toHaveURL(/kind=coverLetter/);
  await expect(page.getByRole("button", { name: /^Actions for/ })).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("button", { name: "Actions for Master cover letter" }),
  ).toBeVisible();
});

test("the command palette offers a letter", async ({ page }) => {
  await openEmptyApp(page);

  await page.keyboard.press("ControlOrMeta+K");
  await page.getByPlaceholder("Search commands").fill("cover letter");
  await page.getByText("New cover letter", { exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "New resume" });

  await expect(dialog).toBeVisible();
  // Already on the letter side of the choice.
  await expect(dialog.getByText("Example letter")).toBeVisible();
});
