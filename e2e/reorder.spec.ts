import { expect, test } from "@playwright/test";

import {
  createResume,
  openEmptyApp,
  paper,
  paperText,
  pointerDrag,
  typeMarkdown,
} from "./app";

import type { Locator, Page } from "@playwright/test";

/**
 * Dragging on the paper, with a real pointer.
 *
 * `reorder.test.ts` proves what a drop means to the document. It cannot prove
 * that a person can find the handle and reach the drop, and that was the bug: the
 * handle sat in the page margin, wider than the margin, and the page clipped it,
 * so the feature was complete underneath and unusable on screen. Only a pointer
 * that has to land on the grip can say the grip is there.
 */

const SOURCE = [
  "# Ada Lovelace",
  "",
  "## Summary",
  "",
  "Alpha paragraph.",
  "",
  "## Skills",
  "",
  "Beta paragraph.",
  "",
  "## Projects",
  "",
  "Gamma paragraph.",
].join("\n");

// A wide window, so the paper is fitted near full size. At the default 1280px
// the fit zoom is about 0.4 and the grip draws 7px square, which is a target
// nobody would aim at, and not what this spec is meant to measure.
test.use({ viewport: { width: 1700, height: 950 } });

test.beforeEach(async ({ page }) => {
  await openEmptyApp(page);
  await createResume(page, "Ada Lovelace");
  await typeMarkdown(page, SOURCE);

  await expect
    .poll(() => paperText(page), { timeout: 15_000 })
    .toContain("Gamma paragraph.");

  // The label, not the radio: Mantine parks the real input off screen.
  await page
    .locator("label")
    .filter({ hasText: /^Visual$/ })
    .click();

  await expect(page.getByRole("radio", { name: "Visual" })).toBeChecked();
});

const item = (page: Page, kind: "section" | "block", text: string): Locator =>
  paper(page)
    .locator(`[data-paged] .rp-item--${kind}`)
    .filter({ hasText: text })
    .first();

/** Picks `from` up by its grip and puts it down on the middle of `onto`. */
const drag = async (page: Page, from: Locator, onto: Locator) => {
  // The chrome is inert until its item is hovered, which is also what a person
  // has to do before they can see the grip.
  await from.hover();

  const grip = from.getByRole("button", { name: "Drag to move" });
  await expect(grip).toBeVisible();

  const start = await grip.boundingBox();
  const end = await onto.boundingBox();

  if (start === null || end === null) {
    throw new Error("the grip or the drop target has no box");
  }

  await pointerDrag(
    page,
    { x: start.x + start.width / 2, y: start.y + start.height / 2 },
    { x: end.x + end.width / 2, y: end.y + end.height / 2 },
  );
};

/** Where each word first appears on the paper, so an order can be asserted. */
const orderOf = async (page: Page, words: ReadonlyArray<string>) => {
  const text = (await paperText(page)).toLowerCase();

  return words
    .map((word) => ({ word, at: text.indexOf(word.toLowerCase()) }))
    .sort((a, b) => a.at - b.at)
    .map(({ word }) => word);
};

test("drags a section heading to reorder the sections", async ({ page }) => {
  await drag(
    page,
    item(page, "section", "Skills"),
    item(page, "section", "Projects"),
  );

  await expect
    .poll(() => orderOf(page, ["Summary", "Skills", "Projects"]), {
      timeout: 15_000,
    })
    .toEqual(["Summary", "Projects", "Skills"]);
});

test("drags a block into another section", async ({ page }) => {
  await drag(
    page,
    item(page, "block", "Gamma paragraph."),
    item(page, "block", "Alpha paragraph."),
  );

  // Gamma left Projects and took Alpha's place at the top of Summary, so it now
  // reads before Alpha and before the Skills heading.
  await expect
    .poll(
      () => orderOf(page, ["Alpha paragraph.", "Gamma paragraph.", "Skills"]),
      {
        timeout: 15_000,
      },
    )
    .toEqual(["Gamma paragraph.", "Alpha paragraph.", "Skills"]);
});

test("drags a section onto the next page by holding at the bottom edge", async ({
  page,
}) => {
  test.slow();

  // Enough lines to run to a second page, short ones, because the Markdown pane
  // is typed a key at a time.
  const lines = Array.from({ length: 70 }, (_, index) => `L${index}`).join(
    "\n\n",
  );

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
      "",
      "## Long",
      "",
      lines,
    ].join("\n"),
  );

  await expect
    .poll(() => paper(page).locator(".rp-page").count(), { timeout: 60_000 })
    .toBeGreaterThan(1);

  const scrollTop = () =>
    page.evaluate(
      () =>
        document.querySelector("iframe")?.contentDocument?.scrollingElement
          ?.scrollTop ?? -1,
    );

  expect(await scrollTop()).toBe(0);

  const skills = item(page, "section", "Skills");
  await skills.hover();

  const grip = await skills
    .getByRole("button", { name: "Drag to move" })
    .boundingBox();
  const frame = await page.locator("iframe").boundingBox();

  if (grip === null || frame === null) {
    throw new Error("the grip or the frame has no box");
  }

  // Held in the bottom band of the window. dnd-kit's own scrolling watches the
  // dragged item, which never moves here, so without this the next page cannot
  // be reached by a drag at all.
  await pointerDrag(
    page,
    { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 },
    { x: frame.x + frame.width / 2, y: frame.y + frame.height - 6 },
    12,
    1500,
  );

  await expect.poll(scrollTop, { timeout: 10_000 }).toBeGreaterThan(200);
});

test("shows where a section would land, and nothing for a drop that does nothing", async ({
  page,
}) => {
  const skills = item(page, "section", "Skills");
  const projects = item(page, "section", "Projects");

  await skills.hover();

  const grip = await skills
    .getByRole("button", { name: "Drag to move" })
    .boundingBox();
  const over = await projects.boundingBox();

  if (grip === null || over === null) {
    throw new Error("the grip or the target has no box");
  }

  const cdp = await page.context().newCDPSession(page);
  const send = (
    type: "mouseMoved" | "mousePressed" | "mouseReleased",
    x: number,
    y: number,
    buttons: number,
  ) =>
    cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      buttons,
      button: type === "mouseMoved" && buttons === 0 ? "none" : "left",
      clickCount: type === "mouseMoved" ? 0 : 1,
    });

  const x = grip.x + grip.width / 2;
  const y = grip.y + grip.height / 2;

  await send("mouseMoved", x, y, 0);
  await send("mousePressed", x, y, 1);

  for (let step = 1; step <= 12; step += 1) {
    await send(
      "mouseMoved",
      x + ((over.x + over.width / 2 - x) * step) / 12,
      y + ((over.y + 8 - y) * step) / 12,
      1,
    );
  }

  // A section dragged down lands after the whole of the one it was dropped on,
  // so the rule is under that section's last block, not under its heading.
  const gamma = item(page, "block", "Gamma paragraph.");

  await expect(gamma).toHaveAttribute("data-drop", "after");
  await expect(projects).not.toHaveAttribute("data-drop", /.+/);

  await send("mouseReleased", over.x + over.width / 2, over.y + 8, 0);
  await cdp.detach();

  await expect(gamma).not.toHaveAttribute("data-drop", /.+/);
});
