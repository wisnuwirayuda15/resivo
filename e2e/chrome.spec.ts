import { expect, test } from "@playwright/test";

import { createResume, expectPaperReady, openEmptyApp, paper } from "./app";

/**
 * The application menu, and what it opens.
 *
 * Both of its items were hardcoded `disabled`, which made the whole menu dead
 * UI: it opened and offered nothing. So the assertion that matters is not that
 * the items render (they always did), but that clicking one does something.
 */

test("the application menu opens the shortcuts sheet", async ({ page }) => {
  await openEmptyApp(page);

  await page.getByRole("button", { name: "Application menu" }).click();
  await page.getByRole("menuitem", { name: "Keyboard shortcuts" }).click();

  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(sheet).toBeVisible();

  // It documents what is bound and nothing else, and the reason a keystroke
  // means something different in the code pane is part of that.
  await expect(sheet).toContainText("Undo the last change to the resume");
  await expect(sheet).toContainText(/keeps its own history/);

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});

test("the command palette navigates and creates", async ({ page }) => {
  await openEmptyApp(page);

  await page.keyboard.press("ControlOrMeta+K");

  const search = page.getByPlaceholder("Search commands…");
  await expect(search).toBeVisible();

  /**
   * Scoped to the palette itself.
   *
   * Its actions carry the same names as the controls they stand for (that is
   * the point of a palette), so a page-wide search for "New resume" finds the
   * sidebar's button, the header's, the empty state's and this one.
   */
  const palette = page
    .locator('[role="dialog"]')
    .filter({ has: page.getByPlaceholder("Search commands…") });

  // Filtered by label, description and keywords, "unused" is a keyword on the
  // Images action rather than part of its name.
  await search.fill("unused");
  await palette.getByRole("button", { name: /Images/ }).click();

  await expect(page).toHaveURL(/\/images$/);

  await page.keyboard.press("ControlOrMeta+K");
  await search.fill("new resume");
  await palette.getByRole("button", { name: /New resume/ }).click();

  // A command, not just a destination: this one opens a dialog.
  await expect(page.getByRole("dialog", { name: "New resume" })).toBeVisible();
});

test("the palette leaves the code panes alone", async ({ page }) => {
  test.slow();

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");

  const editor = page.locator(".monaco-editor").first();
  await expect(editor).toBeVisible();
  await editor.click();

  await page.keyboard.press("ControlOrMeta+K");

  // Monaco binds mod+K itself, and its editable surface is a textarea, which
  // is what the palette's default `tagsToIgnore` excludes. A palette that stole
  // the chord would break the editor's own bindings.
  await expect(page.getByPlaceholder("Search commands…")).toBeHidden();
});

test("the application menu reaches the about page", async ({ page }) => {
  await openEmptyApp(page);

  await page.getByRole("button", { name: "Application menu" }).click();
  await page.getByRole("menuitem", { name: "About Resivo" }).click();

  await expect(page).toHaveURL(/\/about$/);

  // The page's job is the trade-off, not a description: a local-first app has a
  // consequence its user needs to know before they lose something.
  await expect(page.getByText(/only thing that survives/)).toBeVisible();

  // And it links to the one thing that does something about it.
  await page
    .getByRole("link", { name: "Settings", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/settings$/);
});

/**
 * The sidebar's two widths.
 *
 * Worth a test rather than an eyeball because the interesting half is not the
 * collapse, it is that the width is restored by a script in the document head
 * rather than by React, so a reload is the assertion that matters.
 */
test("the sidebar collapses to a rail, and stays collapsed", async ({
  page,
}) => {
  await openEmptyApp(page);

  const navbar = page.getByRole("navigation");
  const width = () =>
    navbar.evaluate((node) => Math.round(node.getBoundingClientRect().width));

  expect(await width()).toBe(232);
  await expect(page.getByText("Groups")).toBeVisible();

  await page.getByRole("button", { name: "Toggle sidebar" }).click();

  expect(await width()).toBe(60);
  // The rail drops what a 60px column cannot hold: the group list, whose rows
  // are all the same folder glyph, and the micro-labels above each section.
  await expect(page.getByText("Groups")).toBeHidden();
  await expect(page.getByText("No account. No cloud.")).toBeHidden();

  await page.reload();

  // Restored before the first paint, so this is not React catching up.
  await expect(page.getByRole("link", { name: "Templates" })).toBeVisible();
  expect(await width()).toBe(60);

  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  expect(await width()).toBe(232);
  await expect(page.getByText("Groups")).toBeVisible();
});

test("the rail still reaches every destination", async ({ page }) => {
  await openEmptyApp(page);

  // The keyboard, since that is the other way in, and Mantine cancels the
  // browser's own binding, which on Firefox is the bookmarks sidebar.
  await page.keyboard.press("ControlOrMeta+B");
  expect(
    await page
      .getByRole("navigation")
      .evaluate((node) => Math.round(node.getBoundingClientRect().width)),
  ).toBe(60);

  /**
   * Found by name with no text on screen.
   *
   * A rail row is a glyph and a tooltip, and a tooltip is not an accessible
   * name, so each one carries an `aria-label` while collapsed. This clicks the
   * way a screen reader would find it, which is the only reason the assertion
   * is worth making.
   */
  await page.getByRole("link", { name: "Images" }).click();
  await expect(page).toHaveURL(/\/images$/);

  // And the one action a new user needs is still there, having moved out of the
  // header (where there is no room beside the mark) into the list.
  await page.getByRole("button", { name: "New resume" }).first().click();
  await expect(page.getByRole("dialog", { name: "New resume" })).toBeVisible();
});

/**
 * Collapsing the sidebar while a resume is open.
 *
 * This is a regression test with a specific shape in mind. The preview used to
 * re-paginate whenever its container's width changed, and that width was fed by
 * the frame's own scrollbar, which the zoom moved: a loop that mostly settled
 * after a few passes and, at the wrong geometry, did not, at which point React
 * gives up on a chain of nested updates with "Maximum update depth exceeded".
 * Collapsing the sidebar repeatedly is what walks the zoom across geometries.
 */
test("the sidebar can be collapsed repeatedly with a resume open", async ({
  page,
}) => {
  test.slow();

  const errors: Array<string> = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");

  const toggle = page.getByRole("button", { name: "Toggle sidebar" });

  for (let round = 0; round < 12; round += 1) {
    await toggle.click();
  }

  // Named exactly, rather than asserting no console error at all: an unrelated
  // warning from somewhere else should not fail this test, and this is the one
  // thing it is here to catch.
  expect(
    errors.filter((text) => text.includes("Maximum update depth")),
  ).toEqual([]);

  // And the paper survived the trip, rather than being left mid-measurement.
  await expectPaperReady(page);
  await expect(paper(page).locator(".rp-page").first()).toBeVisible();
});

/**
 * A magnified page can be scrolled to both of its edges.
 *
 * The pages sat in a centred column, and a column wider than its window spills
 * equally to both sides. The spill to the left of the origin is not scrollable,
 * so at 200% the left edge of the paper could never be brought into view while
 * the right one could. The assertion is the page's own left edge at the far left
 * of the scroll, and its right edge at the far right, each with the padding the
 * well gives it.
 */
test("a zoomed page can be scrolled to both of its edges", async ({ page }) => {
  test.slow();

  // Wide enough for the strip to show the zoom controls rather than fold them.
  await page.setViewportSize({ width: 1600, height: 1000 });

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");

  const zoomIn = page.getByRole("button", { name: "Zoom in" });

  await expect(async () => {
    await zoomIn.click();
    await expect(page.getByText("200%")).toBeVisible({ timeout: 500 });
  }).toPass();

  const frame = page
    .frames()
    .find((candidate) => candidate !== page.mainFrame());
  expect(frame).toBeDefined();

  const edges = (left: number) =>
    frame?.evaluate((scrollLeft) => {
      const scroller = document.scrollingElement;

      if (scroller === null) {
        return null;
      }

      // Scrolled first: the box is measured where the page ended up.
      scroller.scrollLeft = scrollLeft;

      const box = document.querySelector(".rp-page")?.getBoundingClientRect();

      if (box === undefined) {
        return null;
      }

      return {
        left: box.left,
        right: scroller.clientWidth - box.right,
        wide: scroller.scrollWidth > scroller.clientWidth,
      };
    }, left);

  const atStart = await edges(0);
  const atEnd = await edges(1_000_000);

  expect(atStart?.wide).toBe(true);
  // 20px of padding at 200% is 40 on screen, both ways.
  expect(atStart?.left).toBeGreaterThanOrEqual(39);
  expect(atEnd?.right).toBeGreaterThanOrEqual(39);
});
