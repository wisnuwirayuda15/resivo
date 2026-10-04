import { expect, test } from "@playwright/test";

import {
  createResume,
  markdownPaneText,
  openEmptyApp,
  paper,
  paperText,
  typeMarkdown,
} from "./app";

import type { Page } from "@playwright/test";

/**
 * Making, removing and ordering the parts inside a block from the keyboard.
 *
 * A bullet, a list item and a tag have no id and no chrome of their own: they
 * are fields on the paper, so the keys are the whole interface. Enter writes the
 * next one, Backspace on an empty one takes it away, and Alt with an arrow moves
 * it. Each of them hands the text to the document and closes the field, and the
 * field that should be open afterwards is the next one to render, so what is
 * under test here is that the caret really lands there.
 */

const SOURCE = [
  "# Ada Lovelace",
  "",
  "## Experience",
  "",
  ':::entry{title="Analyst" subtitle="Difference Engine Co."}',
  "- First bullet",
  "- Second bullet",
  ":::",
  "",
  "## Notes",
  "",
  "- Alpha",
  "- Beta",
  "",
  "## Skills",
  "",
  "::tags[Calculus, Logic]",
].join("\n");

test.use({ viewport: { width: 1700, height: 950 } });

test.beforeEach(async ({ page }) => {
  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");
  await typeMarkdown(page, SOURCE);

  await expect
    .poll(() => paperText(page), { timeout: 20_000 })
    .toContain("Calculus");

  await page
    .locator("label")
    .filter({ hasText: /^Visual$/ })
    .click();

  await expect(page.getByRole("radio", { name: "Visual" })).toBeChecked();
});

/** A field on the paper, by the words in it. */
const field = (page: Page, words: string) =>
  paper(page)
    .locator("[data-paged] [data-editable]")
    .filter({ hasText: words })
    .first();

/** Ends an edit by clicking the page's own margin, which is not a field. */
const clickAway = (page: Page) =>
  paper(page)
    .locator(".rp-page")
    .first()
    .click({ position: { x: 4, y: 4 } });

const markdownOrder = async (page: Page, words: ReadonlyArray<string>) => {
  const markdown = await markdownPaneText(page);

  return words
    .map((word) => ({ word, at: markdown.indexOf(word) }))
    .filter(({ at }) => at !== -1)
    .sort((a, b) => a.at - b.at)
    .map(({ word }) => word);
};

test("Enter in an entry bullet writes the next one, already open", async ({
  page,
}) => {
  await field(page, "First bullet").click();
  await page.keyboard.press("Enter");

  // The new bullet is open without a click: the caret has to be in it.
  await expect(paper(page).locator("[data-editing]")).toHaveCount(1);
  await page.keyboard.type("Middle bullet", { delay: 20 });
  await clickAway(page);

  await expect
    .poll(
      () =>
        markdownOrder(page, ["First bullet", "Middle bullet", "Second bullet"]),
      { timeout: 15_000 },
    )
    .toEqual(["First bullet", "Middle bullet", "Second bullet"]);
});

test("Backspace in an empty bullet removes it and steps back to the one before", async ({
  page,
}) => {
  const bullets = paper(page).locator("[data-paged] .rp-bullets li");

  await expect(bullets).toHaveCount(2);

  await field(page, "First bullet").click();
  await page.keyboard.press("Enter");
  await expect(bullets).toHaveCount(3);

  await page.keyboard.press("Backspace");
  await expect(bullets).toHaveCount(2);

  // Back in the bullet it came from, with the caret at the end.
  await page.keyboard.type("!", { delay: 20 });
  await clickAway(page);

  await expect
    .poll(() => markdownPaneText(page), { timeout: 15_000 })
    .toContain("First bullet!");
});

test("Alt and an arrow move a bullet, and the caret goes with it", async ({
  page,
}) => {
  await field(page, "First bullet").click();
  await page.keyboard.press("Alt+ArrowDown");

  await expect(paper(page).locator("[data-editing]")).toHaveCount(1);
  await page.keyboard.type("?", { delay: 20 });
  await clickAway(page);

  await expect
    .poll(() => markdownOrder(page, ["Second bullet", "First bullet?"]), {
      timeout: 15_000,
    })
    .toEqual(["Second bullet", "First bullet?"]);
});

test("the last bullet of an entry cannot be removed from the paper", async ({
  page,
}) => {
  const bullets = paper(page).locator("[data-paged] .rp-bullets li");

  await field(page, "Second bullet").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await clickAway(page);

  await field(page, "First bullet").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await clickAway(page);

  // One is left, because a list with nothing in it draws nothing and would
  // leave no field to click.
  await expect(bullets).toHaveCount(1);
});

test("Enter in a list item writes the next item", async ({ page }) => {
  await field(page, "Alpha").click();
  await page.keyboard.press("Enter");

  await expect(paper(page).locator("[data-editing]")).toHaveCount(1);
  await page.keyboard.type("Between", { delay: 20 });
  await clickAway(page);

  await expect
    .poll(() => markdownOrder(page, ["Alpha", "Between", "Beta"]), {
      timeout: 15_000,
    })
    .toEqual(["Alpha", "Between", "Beta"]);
});

test("Enter in a tag adds a tag, and a blank one is not kept", async ({
  page,
}) => {
  const tags = paper(page).locator("[data-paged] .rp-tag");

  await expect(tags).toHaveCount(2);

  await field(page, "Calculus").click();
  await page.keyboard.press("Enter");
  await expect(paper(page).locator("[data-editing]")).toHaveCount(1);
  await page.keyboard.type("Analysis", { delay: 20 });
  await clickAway(page);

  await expect(tags).toHaveCount(3);

  await expect
    .poll(() => markdownPaneText(page), { timeout: 15_000 })
    .toContain("Calculus, Analysis, Logic");

  // A tag opened and left blank is not left behind as an empty chip.
  await field(page, "Analysis").click();
  await page.keyboard.press("Enter");
  await expect(tags).toHaveCount(4);
  await clickAway(page);

  await expect(tags).toHaveCount(3);
});
