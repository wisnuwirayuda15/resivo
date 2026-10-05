import { expect, test } from "@playwright/test";

import {
  createResume,
  openEmptyApp,
  openItemMenu,
  paper,
  paperText,
  typeMarkdown,
} from "./app";

import type { Locator, Page } from "@playwright/test";

/**
 * What a section heading and a page break can do from the paper.
 *
 * Both could be done before, from the Sections tab and from the Markdown pane.
 * What is under test is that the paper offers them, and that the delete, which
 * takes a whole section with it, asks before it does.
 */

test.beforeEach(async ({ page }) => {
  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");
});

const visual = async (page: Page) => {
  // The label, not the radio: Mantine parks the real input off screen.
  await page
    .locator("label")
    .filter({ hasText: /^Visual$/ })
    .click();

  await expect(page.getByRole("radio", { name: "Visual" })).toBeChecked();
};

const heading = (page: Page, title: string): Locator =>
  paper(page)
    .locator("[data-paged] .rp-item--section")
    .filter({ hasText: title })
    .first();

const pages = (page: Page) => paper(page).locator(".rp-page");

test("deleting a section from the paper asks before it does", async ({
  page,
}) => {
  await typeMarkdown(
    page,
    [
      "# Ada Lovelace",
      "",
      "## Summary",
      "",
      "Alpha paragraph.",
      "",
      "## Skills",
      "",
      "Beta paragraph.",
    ].join("\n"),
  );

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("Beta paragraph.");

  await visual(page);

  const skills = heading(page, "Skills");
  await openItemMenu(skills);

  await skills.getByRole("menuitem", { name: "Delete", exact: true }).click();

  // The first press only arms it, and says what the second will do.
  const armed = skills.getByRole("menuitem", {
    name: "Press again to delete this section and everything in it",
  });
  await expect(armed).toBeVisible();
  expect(await paperText(page)).toContain("Beta paragraph.");

  await armed.click();

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .not.toContain("Beta paragraph.");
  expect(await paperText(page)).toContain("Alpha paragraph.");
});

test("a section can be told to start on a new page, and told not to", async ({
  page,
}) => {
  await typeMarkdown(
    page,
    [
      "# Ada Lovelace",
      "",
      "## Summary",
      "",
      "Alpha paragraph.",
      "",
      "## Skills",
      "",
      "Beta paragraph.",
    ].join("\n"),
  );

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("Beta paragraph.");

  await visual(page);
  await expect(pages(page)).toHaveCount(1);

  const skills = heading(page, "Skills");
  await openItemMenu(skills);

  const on = skills.getByRole("menuitem", {
    name: "Start this section on a new page",
  });
  await on.click();

  await expect(pages(page)).toHaveCount(2, { timeout: 15_000 });

  await openItemMenu(skills);

  const off = skills.getByRole("menuitem", {
    name: "Stop this section starting on a new page",
  });
  await expect(off).toHaveAttribute("aria-pressed", "true");
  await off.click();

  await expect(pages(page)).toHaveCount(1, { timeout: 15_000 });
});

test("a page break can be found and deleted on the paper", async ({ page }) => {
  await typeMarkdown(
    page,
    [
      "# Ada Lovelace",
      "",
      "## Summary",
      "",
      "Alpha paragraph.",
      "",
      "::pagebreak",
      "",
      "Beta paragraph.",
    ].join("\n"),
  );

  await expect(pages(page)).toHaveCount(2, { timeout: 15_000 });

  await visual(page);

  const marker = paper(page).locator(
    "[data-paged] .rp-item:has(.rp-page-break)",
  );

  await expect(marker).toHaveCount(1);

  // A break is a zero-height item, so there is no box to hover. What a person
  // aims at is its dashed caption, which is painted just above that line.
  const box = await marker.boundingBox();

  if (box === null) {
    throw new Error("the page break has no box");
  }

  await page.mouse.move(box.x + box.width / 2, box.y - 3);

  await marker.getByRole("button", { name: "Drag to move" }).click();
  await marker.getByRole("menuitem", { name: "Delete" }).click();

  await expect(pages(page)).toHaveCount(1, { timeout: 15_000 });
});
