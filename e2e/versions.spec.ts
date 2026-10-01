import { expect, test } from "@playwright/test";

import {
  cardMenu,
  createResume,
  openEmptyApp,
  paperText,
  typeMarkdown,
} from "./app";

/**
 * A resume tailored for a job, and what it keeps of the one it came from.
 *
 * One path through the whole feature, because each part is only meaningful after
 * the one before it: a version needs a base, a comparison needs both, and what
 * deleting the base does to the version is the reason the link is cleared in a
 * transaction.
 */
test("a version is made, edited, compared, found and outlives its base", async ({
  page,
}) => {
  test.slow();

  await openEmptyApp(page);
  await createResume(page, "Master");

  await typeMarkdown(
    page,
    ["# Ada Lovelace", "", "## Summary", "", "Wrote the first algorithm."].join(
      "\n",
    ),
  );
  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("Wrote the first algorithm.");

  // Leaving the editor is what flushes the autosave, so the version is copied
  // from what was typed.
  await page.getByRole("link", { name: "All resumes" }).click();

  const menu = await cardMenu(page, "Master");
  await menu
    .getByRole("menuitem", { name: "Create version for a job" })
    .click();

  const dialog = page.getByRole("dialog", { name: "New version" });
  await dialog.getByLabel("Company").fill("Acme");
  await dialog.getByLabel("Role").fill("Analyst");
  await dialog.getByRole("button", { name: "Create version" }).click();

  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Version for Acme")).toBeVisible();
  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("Wrote the first algorithm.");

  await typeMarkdown(
    page,
    [
      "# Ada Lovelace",
      "",
      "## Summary",
      "",
      "Wrote the first algorithm for Acme.",
    ].join("\n"),
  );
  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("for Acme.");

  await page.getByRole("button", { name: "Compare" }).click();

  const drawer = page.getByRole("dialog", { name: "Changes from Master" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Summary", { exact: true })).toBeVisible();
  // The added words are shown, and marked as added by more than colour.
  await expect(drawer.getByText(/for Acme\./)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await page.getByRole("link", { name: "All resumes" }).click();

  // Each card says what it is part of.
  await expect(page.getByText("For Acme, Analyst")).toBeVisible();
  await expect(page.getByText("1 version", { exact: true })).toBeVisible();

  // Search finds the one written for the company, whatever it is titled.
  await page.getByPlaceholder("Search resumes").fill("acme");
  await expect(page.getByRole("button", { name: /^Actions for/ })).toHaveCount(
    1,
  );
  await page.getByPlaceholder("Search resumes").fill("");

  // Deleting what the family began from leaves the version standing.
  // Exact: the version is called "Master for Acme", and a name is matched as a
  // substring.
  await page
    .getByRole("button", { name: "Actions for Master", exact: true })
    .click();
  const baseMenu = page.getByRole("menu", {
    name: "Actions for Master",
    exact: true,
  });
  await baseMenu.getByRole("menuitem", { name: "Delete" }).click();
  await page
    .getByRole("dialog", { name: /Delete "Master"/ })
    .getByRole("button", { name: "Delete" })
    .click();

  await expect(page.getByText("For Acme, Analyst")).toBeVisible();
  await expect(page.getByText("1 version", { exact: true })).toBeHidden();
});
