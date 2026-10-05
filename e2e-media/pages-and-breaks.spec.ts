import { expect, test } from "@playwright/test";

import { paper } from "../e2e/app";

import { centerOf, moveCursor, pulseCursor } from "./clip";
import { goVisual, item, press, recordClip, scrollTo } from "./record";

import type { Camera } from "./clip";
import type { Locator, Page } from "@playwright/test";

/**
 * The clip on `docs/editor/pages-and-breaks`: a page break inserted from the
 * paper and the page count that answers it, the break found and deleted, and a
 * section told to start on a new page.
 *
 * Every change is shown twice, as cause and as effect. The effect is the new
 * page, so the paper scrolls to it, and then the total in the strip above the
 * paper, which is 11px of monospace, is shown on its own and pointed at. A shot
 * that tried to hold both at once framed neither: it cut the count in half and
 * showed the top of page 1, which is not what changed.
 */

const pages = (page: Page) => paper(page).locator(".rp-page");

/** "2 pages", in the strip above the paper. */
const count = (page: Page): Locator => page.getByText(/^\d+ pages?/).first();

/** The total, alone in the frame, with the pointer on it. */
const showCount = async (page: Page, camera: Camera): Promise<void> => {
  const { x, y } = await centerOf(count(page));

  await camera.look(page, x, y, 3.2, 0.6);
  await moveCursor(page, x + 70, y + 14, 300);
  await pulseCursor(page);
  await page.waitForTimeout(500);
};

/** The second page, as a reader would scroll to it: what moved onto it. */
const showSecondPage = async (
  page: Page,
  camera: Camera,
  first: Locator,
): Promise<number> => {
  await scrollTo(page, first);

  // Across the paper, not across the item: an item's own box is not where the
  // page is, and a frame centred on it cut the heading off at the left edge.
  const sheet = await centerOf(page.locator("iframe"));
  const { y } = await centerOf(first);

  await camera.look(page, sheet.x, y, 1.3, 0.6);
  await page.waitForTimeout(700);

  // The camera has arrived by now, which makes this the frame to be a poster:
  // taken during the move it is a frame of a pan, cut off at one edge.
  return camera.now() - 0.3;
};

test("records the pages and breaks clip", async ({ browser }, testInfo) => {
  await recordClip({
    browser,
    testInfo,
    name: "pages-and-breaks",
    script: async ({ page, camera }) => {
      await expect(pages(page)).toHaveCount(1);

      const visual = page.locator("label").filter({ hasText: /^Visual$/ });

      await camera.at(page, visual, 2, { dy: 170 });
      await goVisual(page);
      await page.waitForTimeout(250);

      // Insert a page break after the summary.
      const summary = item(page, "block", "Mathematician working");
      const block = await summary.boundingBox();

      if (block === null) {
        throw new Error("the block has no box");
      }

      await camera.look(
        page,
        block.x + block.width * 0.72,
        block.y + block.height * 0.45,
        2.2,
      );
      await summary.hover();
      await page.waitForTimeout(300);
      await press(
        page,
        summary.getByRole("button", { name: "Insert a page break after this" }),
      );
      await expect(pages(page)).toHaveCount(2, { timeout: 15_000 });

      // The effect: Experience has moved to a page of its own.
      const posterAt = await showSecondPage(
        page,
        camera,
        pages(page).nth(1).locator(".rp-item").first(),
      );
      await showCount(page, camera);

      // Find the break on the paper, and delete it.
      await scrollTo(page, summary);

      const marker = paper(page).locator(
        "[data-paged] .rp-item:has(.rp-page-break)",
      );
      const box = await marker.boundingBox();

      if (box === null) {
        throw new Error("the page break has no box");
      }

      // A break is a zero-height item, so there is no box to hover. What a
      // person aims at is its dashed caption, painted just above its line.
      const above = { x: box.x + box.width / 2, y: box.y - 3 };

      await camera.look(page, above.x + 120, above.y, 2.2);
      await page.mouse.move(above.x, above.y);
      await page.waitForTimeout(350);
      await press(page, marker.getByRole("button", { name: "Delete" }));
      await expect(pages(page)).toHaveCount(1, { timeout: 15_000 });

      // And the total says so.
      await showCount(page, camera);

      // Start a whole section on a new page.
      const projects = item(page, "section", "Projects");

      await projects.hover();

      const on = projects.getByRole("button", {
        name: "Start this section on a new page",
      });

      await on.waitFor();

      const at = await centerOf(on);

      await camera.look(page, at.x - 100, at.y + 40, 2.2);
      await press(page, on);
      await expect(pages(page)).toHaveCount(2, { timeout: 15_000 });

      await showSecondPage(
        page,
        camera,
        pages(page).nth(1).locator(".rp-item").first(),
      );
      await showCount(page, camera);

      return posterAt;
    },
  });
});
