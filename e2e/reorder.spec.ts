import { expect, test } from "@playwright/test";

import {
  createResume,
  openEmptyApp,
  paper,
  paperText,
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

/**
 * Picks `from` up by its grip and puts it down on the middle of `onto`.
 *
 * The pointer walks there in steps. dnd-kit only starts a drag after the pointer
 * has moved four pixels, and it picks the drop target from where the pointer has
 * been, so a single jump would be a click and a teleport, not a drag.
 *
 * The events go through CDP rather than `page.mouse`. Measured here: with a
 * button down, `page.mouse.move` over the preview iframe never resolves once
 * the drag has started (the page itself stays responsive, and no native drag is
 * reported), while the same moves sent as `Input.dispatchMouseEvent` return at
 * once and the drag completes. The app is not what hangs, Playwright's drag
 * bookkeeping is, and the raw events are what a browser receives from a person.
 */
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
      button: buttons === 0 && type === "mouseMoved" ? "none" : "left",
      clickCount: type === "mouseMoved" ? 0 : 1,
    });

  const fromX = start.x + start.width / 2;
  const fromY = start.y + start.height / 2;
  const toX = end.x + end.width / 2;
  const toY = end.y + end.height / 2;
  const steps = 20;

  await send("mouseMoved", fromX, fromY, 0);
  await send("mousePressed", fromX, fromY, 1);

  for (let step = 1; step <= steps; step += 1) {
    await send(
      "mouseMoved",
      fromX + ((toX - fromX) * step) / steps,
      fromY + ((toY - fromY) * step) / steps,
      1,
    );
  }

  await send("mouseReleased", toX, toY, 0);
  await cdp.detach();
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
