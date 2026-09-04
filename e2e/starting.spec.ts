import { expect, test } from "@playwright/test";

import { expectPaperReady, openEmptyApp, paperText, pickSegment } from "./app";

import type { Page } from "@playwright/test";

/**
 * What a new resume starts as.
 *
 * The two starting points are only distinguishable on the paper, which is
 * inside an iframe and rendered by the real paginator, so this is not a
 * question a unit test can answer. `src/features/resume/sample.test.ts` checks
 * that the example parses and round-trips; this checks that choosing it puts a
 * resume on the page, that choosing a blank page does not, and that the answer
 * is remembered.
 *
 * Deliberately not using the `createResume` helper: it picks a blank page for
 * every other spec in this folder, and the dialog's own default is the thing
 * being tested.
 */

const submit = async (
  page: Page,
  title: string,
  start?: "Example resume" | "Blank page",
): Promise<void> => {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "New resume" })
    .click();

  const dialog = page.getByRole("dialog", { name: "New resume" });
  await expect(dialog).toBeVisible();

  if (start !== undefined) {
    await pickSegment(dialog, start);
  }

  await dialog.getByLabel("Name").fill(title);
  await dialog.getByRole("button", { name: "Create resume" }).click();

  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);
  await expectPaperReady(page);
};

test("a first resume arrives written on, with an entry and its dates", async ({
  page,
}) => {
  await openEmptyApp(page);

  // Nothing touched in the dialog: the default is what a first-time user gets,
  // and an empty page was the thing that sent them looking for the guide.
  await submit(page, "Ada Lovelace");

  const text = await paperText(page);

  expect(text).toContain("Ada Lovelace");
  // The header, an entry's own fields, and the formatted range around them.
  expect(text).toContain("Difference Engine Co.");
  expect(text).toContain("Present");
  expect(text).toMatch(/Bernoulli/);
  // A tag list, which is the one block nothing else on an empty page hints at.
  expect(text).toContain("Symbolic logic");
});

test("a blank page is the empty sections and nothing else", async ({
  page,
}) => {
  await openEmptyApp(page);

  await submit(page, "Mine", "Blank page");

  const text = await paperText(page);

  // Uppercased by the templates' CSS, and `innerText` reports what is rendered.
  expect(text).toMatch(/summary/i);
  expect(text).toMatch(/experience/i);
  expect(text).not.toContain("Bernoulli");
  expect(text).not.toContain("Difference Engine Co.");
});

test("the choice is remembered for the next resume", async ({ page }) => {
  await openEmptyApp(page);

  await submit(page, "First", "Blank page");

  await page.getByRole("link", { name: "All resumes" }).click();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "New resume" })
    .click();

  const dialog = page.getByRole("dialog", { name: "New resume" });

  await expect(dialog.getByRole("radio", { name: "Blank page" })).toBeChecked();
});
