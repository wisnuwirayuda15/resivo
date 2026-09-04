import { expect, test } from "@playwright/test";

import { createResume, openEmptyApp } from "./app";

import type { Page } from "@playwright/test";

/**
 * The onboarding tour.
 *
 * This is the one spec that opts back in to it: `openEmptyApp` marks both tours
 * seen, because every other spec starts from an empty database (a brand-new
 * user), and an overlay with a cutout intercepts the clicks they then make.
 */

/** Forgets that either tour has been shown, and reloads into a fresh visit. */
const forgetTours = async (page: Page) => {
  await page.evaluate(() => {
    localStorage.removeItem("resivo.onboarding.library");
    localStorage.removeItem("resivo.onboarding.editor");
  });

  await page.reload();
};

const nextStep = (page: Page) => page.getByRole("button", { name: "Next" });

test("greets a new user, and can be skipped", async ({ page }) => {
  await openEmptyApp(page);
  await forgetTours(page);

  // Step one, on the button a new user needs.
  await expect(page.getByText("Start here")).toBeVisible({ timeout: 15_000 });

  await nextStep(page).click();
  await expect(page.getByText("Images and fonts are shared")).toBeVisible();

  await nextStep(page).click();
  // The step that matters most in a local-first app.
  await expect(page.getByText("This is the important one")).toBeVisible();

  // Nobody is made to finish it.
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText("This is the important one")).toBeHidden();

  // And skipping counts as an answer: a reload does not ask again.
  await page.reload();
  await expect(page.getByRole("link", { name: "Templates" })).toBeVisible();
  await expect(page.getByText("Start here")).toBeHidden();
});

test("runs a second tour the first time the editor is opened", async ({
  page,
}) => {
  test.slow();

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");

  // Forgotten while already in the editor, so the reload lands back here.
  await forgetTours(page);

  // Each tour runs where its anchors are, the editor's steps point at the
  // three panes, which only exist on this route.
  await expect(page.getByText("Markdown, and your own CSS")).toBeVisible({
    timeout: 20_000,
  });

  // The format is the one thing in this app nobody can guess, so the step for
  // where it is written down comes straight after the pane it is written in.
  await nextStep(page).click();
  await expect(
    page.getByText("Every directive, with an example"),
  ).toBeVisible();

  await nextStep(page).click();
  await expect(page.getByText("The paper is editable too")).toBeVisible();

  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText("The paper is editable too")).toBeHidden();
});

test("can be started again from the application menu", async ({ page }) => {
  await openEmptyApp(page);

  // Seen already, this is the path for someone who skipped it and changed
  // their mind, which is why the flag alone would be a dead end.
  await expect(page.getByText("Start here")).toBeHidden();

  await page.getByRole("button", { name: "Application menu" }).click();
  await page.getByRole("menuitem", { name: "Take the tour" }).click();

  await expect(page.getByText("Start here")).toBeVisible({ timeout: 15_000 });
});
