import { expect, test } from "@playwright/test";

import {
  createResume,
  markdownPaneText,
  openEmptyApp,
  openItemMenu,
  paper,
  paperText,
  typeMarkdown,
} from "./app";

/**
 * Making a block from the paper, which until now was only possible by typing it
 * into the Markdown pane.
 */

test.beforeEach(async ({ page }) => {
  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");
  await typeMarkdown(
    page,
    ["# Ada Lovelace", "", "## Summary", "", "Alpha paragraph."].join("\n"),
  );

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("Alpha paragraph.");

  // The label, not the radio: Mantine parks the real input off screen.
  await page
    .locator("label")
    .filter({ hasText: /^Visual$/ })
    .click();

  await expect(page.getByRole("radio", { name: "Visual" })).toBeChecked();
});

test("inserts a paragraph under a heading and writes in it", async ({
  page,
}) => {
  const heading = paper(page)
    .locator("[data-paged] .rp-item--section")
    .filter({ hasText: "Summary" })
    .first();

  await heading.hover();
  await heading
    .getByLabel("Insert a block after this")
    .selectOption({ label: "Paragraph" });

  // The new block has nothing in it, and an empty field is a zero-width span.
  // It has to say so and be there to click, or it would exist and be
  // unreachable.
  const fresh = paper(page)
    .locator("[data-paged] .rp-item--block")
    .first()
    .locator("[data-editable]");

  await expect(fresh).toBeVisible();

  await fresh.click();
  await page.keyboard.type("Hello there.", { delay: 20 });
  await page.keyboard.press("Enter");

  // Above Alpha, because it went to the top of the section.
  await expect
    .poll(
      async () => {
        const markdown = await markdownPaneText(page);

        return markdown.indexOf("Hello there.") <
          markdown.indexOf("Alpha paragraph.") &&
          markdown.includes("Hello there.")
          ? "before"
          : "wrong";
      },
      { timeout: 15_000 },
    )
    .toBe("before");
});

test("duplicates a block", async ({ page }) => {
  const alpha = paper(page)
    .locator("[data-paged] .rp-item--block")
    .filter({ hasText: "Alpha paragraph." });

  await expect(alpha).toHaveCount(1);

  await openItemMenu(alpha.first());
  await alpha.first().getByRole("menuitem", { name: "Duplicate" }).click();

  await expect(alpha).toHaveCount(2);

  await expect
    .poll(
      async () =>
        (await markdownPaneText(page)).split("Alpha paragraph.").length - 1,
      { timeout: 15_000 },
    )
    .toBe(2);
});
