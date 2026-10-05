import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

import {
  createResume,
  expectPaperReady,
  openEmptyApp,
  openInspectorTab,
  paper,
  markdownPaneText,
  paperText,
  pickSegment,
  typeMarkdown,
} from "./app";

/**
 * The editor's three surfaces, and the history behind them.
 *
 * What these cover that a unit test cannot: a Monaco editor that has actually
 * laid itself out, a preview iframe that has actually paginated, and an edit made
 * by clicking on the paper, which only exists as a `contenteditable` inside
 * another document, reached through a React portal.
 */

test.beforeEach(async ({ page }) => {
  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");
});

const bodySize = (page: Page) => page.getByLabel("Body size");

test("undo and redo a style change", async ({ page }) => {
  await openInspectorTab(page, "Style");

  const undo = page.getByRole("button", { name: /^Undo/ });
  const redo = page.getByRole("button", { name: /^Redo/ });

  // A fresh document has no history, so neither is available. This is the state
  // the buttons were stuck in before they were wired up at all.
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  // The field shows its unit, so the value read back is "10.5 pt" rather than a
  // bare number. Compared as written rather than parsed: what matters is that it
  // returns to exactly what it was.
  const before = await bodySize(page).inputValue();

  await bodySize(page).fill("13");
  await bodySize(page).blur();

  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(bodySize(page)).toHaveValue(before);
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect(bodySize(page)).toHaveValue(/^13/);
});

test("undo is bound to the keyboard outside the code panes", async ({
  page,
}) => {
  await openInspectorTab(page, "Style");

  const before = await bodySize(page).inputValue();

  await bodySize(page).fill("13");
  await bodySize(page).blur();

  // Pressed on the body, not in an input: Monaco and the paper each keep the
  // shortcut for their own undo, and this is the case where it means the
  // document.
  await page.locator("body").click({ position: { x: 5, y: 400 } });
  await page.keyboard.press("ControlOrMeta+z");

  await expect(bodySize(page)).toHaveValue(before);
});

test("edits text on the paper, and the Markdown follows", async ({ page }) => {
  await typeMarkdown(
    page,
    ["# Ada Lovelace", "", "## Summary", "", "Wrote the first algorithm."].join(
      "\n",
    ),
  );

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toMatch(/Wrote the first algorithm/);

  // The label, not the radio: Mantine's segmented control parks the real input
  // off-screen and styles the label, so the input is neither clickable nor in
  // the viewport.
  await page
    .locator("label")
    .filter({ hasText: /^Visual$/ })
    .click();

  await expect(page.getByRole("radio", { name: "Visual" })).toBeChecked();

  /**
   * The editable run itself, not the paragraph around it.
   *
   * A run is a `span[data-editable]` that swaps itself for a
   * `span[data-editing][contenteditable]` on click, focusing it as it mounts.
   * Clicking the paragraph would land outside the span and start nothing.
   */
  const run = paper(page)
    .locator("[data-paged] [data-editable]")
    .filter({ hasText: "Wrote the first algorithm" })
    .first();

  await run.click();

  const editing = paper(page).locator("[data-editing]").first();
  await expect(editing).toBeVisible();

  // The outline sits 4px outside the field, and a line that fills the measure is
  // flush with the page body, which used to clip it at the edge. The sides (the left wider, for the item handles) and
  // the top have to be open (the top because a large name sits above its line,
  // as the first thing on the page) and the bottom still closed.
  await expect(
    paper(page).locator(".rp-page-body[data-paged]").first(),
  ).toHaveCSS("clip-path", /inset\(-8px -8px 0px -48px\)/);

  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Wrote the very first algorithm.", { delay: 20 });
  // Enter commits: these are single-line fields, so it blurs rather than
  // inserting a break.
  await page.keyboard.press("Enter");

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toMatch(/very first algorithm/);

  // The model is the source of truth, so the Markdown pane must show the edit
  // too, this is the assertion that the paper wrote to the document and not
  // just to the DOM.
  await expect
    .poll(() => markdownPaneText(page), { timeout: 15_000 })
    .toMatch(/very first algorithm/);
});

test("picks a section icon from the full catalog", async ({ page }) => {
  await openInspectorTab(page, "Sections");

  // The first section's icon control. Named for the section so the picker that
  // opens is unambiguous.
  await page.getByRole("button", { name: /icon/i }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const search = dialog.getByRole("textbox").first();
  await search.fill("star");

  // The grid is a listbox of options, virtualized, so what matters is that a
  // match is rendered at all, not how many.
  const first = dialog.getByRole("option", { name: /star/i }).first();
  await expect(first).toBeVisible({ timeout: 20_000 });
  await first.click();

  await expect(dialog).toBeHidden();

  // An icon is an SVG on the paper, and the renderer stamps its name onto the
  // element, which is also how an edited run keeps it.
  await expectPaperReady(page);
  await expect(
    paper(page).locator('[data-paged] [data-icon-name*="star"]').first(),
  ).toBeVisible({ timeout: 15_000 });
});

test("reports Markdown it cannot typeset, without losing it", async ({
  page,
}) => {
  await typeMarkdown(
    page,
    ["# Ada Lovelace", "", "## Notes", "", "<div>raw</div>"].join("\n"),
  );

  // Kept verbatim on the paper rather than dropped.
  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("<div>raw</div>");
});

/**
 * The way from the editor into the documentation on the format.
 *
 * The guide used to be a drawer in the editor; it is a link into the docs now, so
 * what is worth asserting is where the link goes and that following it leaves the
 * editor where it was. The prompt is no longer behind a button of its own: it is
 * on the docs page that describes the format, copied from its block, and the
 * clipboard is what proves the copy happened.
 */
test("the guide opens the format's docs in a new tab, and the prompt copies from there", async ({
  page,
}) => {
  test.slow();

  /**
   * The browser gates the clipboard, not the app.
   *
   * Chromium refuses `writeText` from an automated context without this, and a
   * refusal is indistinguishable from a broken button.
   */
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");

  const guide = page.getByRole("link", { name: "Guide" });

  await expect(guide).toHaveAttribute("href", "/en/docs/format/overview");
  await expect(guide).toHaveAttribute("target", "_blank");
  await expect(guide).toHaveAttribute("rel", /noopener/);

  const [docs] = await Promise.all([
    page.context().waitForEvent("page"),
    guide.click(),
  ]);

  await expect(docs).toHaveURL(/\/en\/docs\/format\/overview$/);
  await expect(docs.getByRole("heading", { level: 1 })).toHaveText(
    "The shape of the file",
  );

  // Nothing about the editor moved: the link opened a tab and left this one be.
  await expect(page).toHaveURL(/\/resumes\/.+/);

  await docs.goto("/en/docs/format/ai-prompts");
  await expect(docs.locator('[data-hydrated="true"]')).toBeVisible({
    timeout: 15_000,
  });
  await docs.getByRole("button", { name: "Copy the code" }).first().click();

  const copied = await docs.evaluate(() => navigator.clipboard.readText());

  expect(copied).toContain("Output the file and nothing else");
  expect(copied).toContain(":::entry{title=");
});

/**
 * Leaving the editor and walking back in.
 *
 * A regression test with a specific shape in mind. Autosave wrote to IndexedDB
 * and nothing wrote the saved row back into the query cache, on the reasoning
 * that the editor store held the newer document, true only while the editor is
 * open. Once it closed, the detail key still held the document as it was on
 * entry, and it is `staleTime: Infinity`, so walking back in served that. The
 * edits were on disk and invisible, and the next keystroke would have saved the
 * stale document over them.
 *
 * The navigation has to be client-side for this to mean anything: a reload
 * empties the cache, which is exactly what used to hide the bug.
 */
test("an edit survives leaving the editor and coming back", async ({
  page,
}) => {
  test.slow();

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");

  await typeMarkdown(page, "# Ada Lovelace\n\nAnalytical engines\n");
  await expect.poll(() => paperText(page)).toContain("Analytical engines");

  // Saved, and the header says so rather than leaving it to be guessed.
  await expect(page.getByRole("status")).toContainText("Saved");

  await page.getByRole("link", { name: "All resumes" }).click();
  await expect(page.getByRole("link", { name: /Ada Lovelace/ })).toBeVisible();

  await page.getByRole("link", { name: /Ada Lovelace/ }).click();
  await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);
  await expectPaperReady(page);

  await expect.poll(() => paperText(page)).toContain("Analytical engines");
  await expect
    .poll(() => markdownPaneText(page))
    .toContain("Analytical engines");
});

/**
 * Dragging a pane divider across the preview.
 *
 * A drag is tracked by listeners on the app's document, and the preview is
 * another document, so once the cursor crossed into the paper the moves went to
 * the iframe and the handle stopped following. Since the preview is the pane in
 * the middle, that was most of any drag: it felt like the divider was catching
 * on something.
 *
 * The pointer is walked across in steps rather than jumped, because a single
 * jump would land past the iframe and pass even while the bug was there.
 */
test("a pane divider keeps following the pointer over the preview", async ({
  page,
}) => {
  test.slow();

  /**
   * Wider than the suite's default 1280.
   *
   * At 1280 there is no slack to drag into: 420 of code, 288 of inspector and
   * the preview's 340px minimum add up to the whole width, so the code pane
   * starts at its maximum and a drag to the right is correctly a no-op. The
   * bug this covers is about the pointer, so the layout has to have somewhere
   * to go.
   */
  await page.setViewportSize({ width: 1440, height: 900 });

  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");
  await expectPaperReady(page);

  const codePane = page.locator(".mantine-Splitter-pane").first();
  const width = () =>
    codePane.evaluate((node) => Math.round(node.getBoundingClientRect().width));

  const before = await width();
  const handle = page.getByRole("separator").first();

  // Hovered rather than moved to the box origin: the divider is one pixel
  // wide, and grabbing it by a computed edge is a coin toss.
  await handle.hover();
  await page.mouse.down();

  const box = await handle.boundingBox();

  if (box === null) {
    throw new Error("the splitter handle has no box to grab");
  }

  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + 120, y, { steps: 6 });

  // While the drag is live, the frame is not taking the pointer. This is the
  // mechanism, so it is asserted rather than inferred from the width.
  const frame = page.locator("iframe").first();
  await expect(frame).toHaveCSS("pointer-events", "none");

  await page.mouse.up();

  // The whole 120px, not the few pixels before the cursor reached the paper.
  expect(await width()).toBeGreaterThan(before + 110);

  // And the frame is clickable again, the paper is an editing surface.
  await expect(frame).toHaveCSS("pointer-events", "auto");
});

test("the title in the header is renamed in place", async ({ page }) => {
  const title = page.getByRole("textbox", { name: "Edit title" });
  await expect(title).toHaveValue("Ada Lovelace");

  await title.fill("Staff Engineer 2026");
  await title.press("Enter");
  await expect(title).toHaveValue("Staff Engineer 2026");

  // Written to the database and not only to the field: the library reads it
  // back from there.
  await page.getByRole("link", { name: "All resumes" }).first().click();
  await expect(page.getByText("Staff Engineer 2026")).toBeVisible();
});

test("Escape abandons a title edit, and an empty title is not saved", async ({
  page,
}) => {
  const title = page.getByRole("textbox", { name: "Edit title" });

  await title.fill("Never kept");
  await title.press("Escape");
  await expect(title).toHaveValue("Ada Lovelace");

  await title.fill("   ");
  await title.press("Enter");
  await expect(title).toHaveValue("Ada Lovelace");
});

test("a resume made from inside the editor opens with its own text", async ({
  page,
}) => {
  await typeMarkdown(page, "# Grace Hopper\n\n## Summary\n\nCompiler pioneer.");
  await expect.poll(() => paperText(page)).toContain("Compiler pioneer.");

  // The sidebar's button: the only one by this name in the editor, which has no
  // "New resume" in its bar.
  await page.getByRole("button", { name: "New resume" }).click();

  const dialog = page.getByRole("dialog", { name: "New resume" });
  await expect(dialog).toBeVisible();
  await pickSegment(dialog, "Blank page");
  await dialog.getByLabel("Name").fill("Second");
  await dialog.getByRole("button", { name: "Create resume" }).click();

  await expect(page.getByRole("textbox", { name: "Edit title" })).toHaveValue(
    "Second",
  );
  await expectPaperReady(page);

  // The pane is polled: Monaco mounts after the route does, and the bug this
  // guards was the pane keeping the text it was first handed.
  await expect.poll(() => markdownPaneText(page)).not.toContain("Grace Hopper");
  expect(await paperText(page)).not.toContain("Compiler pioneer.");
});
