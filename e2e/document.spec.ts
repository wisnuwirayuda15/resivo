import { expect, test } from "@playwright/test";

import {
  PNG_2X2,
  createResume,
  openEmptyApp,
  openInspectorTab,
  paper,
  paperText,
  typeMarkdown,
} from "./app";

/**
 * The parts of the document model that had no way in.
 *
 * Each of these was complete underneath (model, schema, Markdown codec,
 * renderer), and unreachable from any control, so the only proof that a control
 * now exists is that the paper changes when it is used.
 */

test.beforeEach(async ({ page }) => {
  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");
});

test("adds and removes a header contact", async ({ page }) => {
  await openInspectorTab(page, "Sections");

  // A new document has no contacts, and the renderer draws nothing for an empty
  // list, so before this control existed there was no affordance at all.
  await page.getByRole("button", { name: "Add contact" }).click();

  await page.getByLabel("Label of contact 1").fill("ada@example.com");

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("ada@example.com");

  await page.getByRole("button", { name: "Delete contact 1" }).click();

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .not.toContain("ada@example.com");
});

test("sets how wide an image draws", async ({ page }) => {
  test.slow();

  await openInspectorTab(page, "Assets");

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add image" }).click();
  await (
    await chooser
  ).setFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_2X2, "base64"),
  });

  await expect(page.getByText("1 stored")).toBeVisible({ timeout: 15_000 });

  // Selecting the thumbnail is what reveals the placement controls: a block
  // belongs to a section, and the panel has no notion of where the cursor is.
  await page.getByRole("img", { name: "portrait" }).click();

  await page.getByRole("combobox", { name: "Section to insert into" }).click();
  await page.getByRole("option", { name: "Summary" }).click();
  await page.getByRole("button", { name: "Insert" }).click();

  const figure = paper(page).locator("[data-paged] .rp-figure").first();
  await expect(figure).toBeVisible({ timeout: 15_000 });

  // Inserted with no width, which is full width, the state every image was
  // stuck in before this control existed.
  await expect(figure).not.toHaveAttribute("style", /width/);

  // The width control is chrome, so it only exists in Visual mode, and chrome
  // is rendered in the paged pass alone, which is why it cannot move a break.
  await page
    .locator("label")
    .filter({ hasText: /^Visual$/ })
    .click();

  const width = paper(page).getByLabel("Image width");
  await expect(width).toBeVisible({ timeout: 15_000 });
  await width.selectOption("50");

  await expect
    .poll(() => figure.evaluate((node) => node.style.width), {
      timeout: 15_000,
    })
    .toBe("50%");

  // Back to 100 clears the property rather than writing it, so an exported
  // Markdown file carries no redundant attribute.
  await width.selectOption("100");

  await expect
    .poll(() => figure.evaluate((node) => node.style.width), {
      timeout: 15_000,
    })
    .toBe("");
});

test("breaks a page where it is told to", async ({ page }) => {
  test.slow();

  const pages = paper(page).locator(".rp-page");

  await typeMarkdown(
    page,
    [
      "# Ada Lovelace",
      "",
      "## Summary",
      "",
      "Wrote the first algorithm.",
      "",
      "::pagebreak",
      "",
      "And then wrote the notes.",
    ].join("\n"),
  );

  // Two pages from four lines of text: the break is the only thing that could
  // have produced the second one.
  await expect.poll(() => pages.count(), { timeout: 20_000 }).toBe(2);

  const second = pages.nth(1);
  await expect(second).toContainText("And then wrote the notes");
  await expect(second).not.toContainText("Wrote the first algorithm.");
});

test("starts a section on a new page on request", async ({ page }) => {
  test.slow();

  const pages = paper(page).locator(".rp-page");

  await typeMarkdown(
    page,
    [
      "# Ada Lovelace",
      "",
      "## Summary",
      "",
      "Wrote the first algorithm.",
      "",
      "## Skills",
      "",
      "- Analysis",
    ].join("\n"),
  );

  await expect.poll(() => pages.count(), { timeout: 20_000 }).toBe(1);

  await openInspectorTab(page, "Sections");
  await page
    .getByRole("button", { name: "Start Skills on a new page" })
    .click();

  await expect.poll(() => pages.count(), { timeout: 20_000 }).toBe(2);

  // The heading travels with its content rather than being stranded at the
  // foot of page one.
  await expect(pages.nth(1)).toContainText("Skills");
  await expect(pages.nth(0)).not.toContainText("Skills");

  await page
    .getByRole("button", { name: "Stop Skills starting on a new page" })
    .click();

  await expect.poll(() => pages.count(), { timeout: 20_000 }).toBe(1);
});

test("writes dates in the document language", async ({ page }) => {
  await typeMarkdown(
    page,
    [
      "# Ada Lovelace",
      "",
      "## Experience",
      "",
      ':::entry{title="Analyst" start="2021-03" current="true"}',
      ":::",
    ].join("\n"),
  );

  // The one word on the paper the app supplies rather than the user.
  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toMatch(/Mar 2021/);
  expect(await paperText(page)).toMatch(/Present/);

  await openInspectorTab(page, "Style");

  // The combobox, not the label: a Mantine Select puts the same accessible name
  // on its input and on its listbox.
  await page.getByRole("combobox", { name: "Document" }).click();
  await page.getByRole("option", { name: "Bahasa Indonesia" }).click();

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toMatch(/Sekarang/);
  // The month name follows the same tag, which is what the tag was always for.
  expect(await paperText(page)).not.toMatch(/Present/);
});
