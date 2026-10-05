import { test } from "@playwright/test";

import { paper } from "../e2e/app";

import { centerOf } from "./clip";
import { dragWithCursor, goVisual, item, press, recordClip } from "./record";

/**
 * The clip on `docs/editor/visual-editing`: Visual mode, editing a line on the
 * paper, duplicating a block, dragging a section, and adding a bullet.
 */
test("records the visual editing clip", async ({ browser }, testInfo) => {
  await recordClip({
    browser,
    testInfo,
    name: "visual-editing",
    script: async ({ page, camera }) => {
      // Visual mode.
      const visual = page.locator("label").filter({ hasText: /^Visual$/ });

      await camera.at(page, visual, 2, { dy: 170 });
      await goVisual(page);
      await page.waitForTimeout(350);

      // Edit a line on the paper.
      const tagline = paper(page)
        .locator("[data-paged] [data-editable]")
        .filter({ hasText: "and the first programmer" })
        .first();

      await camera.at(page, tagline, 2, { dy: 60 });
      await press(page, tagline);
      await page.keyboard.press("End");
      await page.keyboard.type(", and writer of Note G", { delay: 30 });
      await page.waitForTimeout(250);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(600);

      // Duplicate a block.
      const summary = item(page, "block", "Mathematician working");
      const posterAt = camera.now() + 1.0;

      // Looking at the block's top right corner, where its controls float, and
      // not at its middle: the controls are the subject and are small.
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
      await page.waitForTimeout(350);
      await press(page, summary.getByRole("button", { name: "Duplicate" }));
      await page.waitForTimeout(800);

      // Drag a section above another.
      const projects = item(page, "section", "Projects");

      await projects.hover();

      const grip = projects.getByRole("button", { name: "Drag to move" });
      const target = item(page, "section", "Experience");

      await grip.waitFor();

      const gripAt = await centerOf(grip);
      const targetAt = await centerOf(target);

      await camera.look(
        page,
        (gripAt.x + targetAt.x) / 2,
        (gripAt.y + targetAt.y) / 2,
        1.5,
      );
      await dragWithCursor(page, gripAt, targetAt);
      await page.waitForTimeout(700);

      // Add a bullet from the keyboard.
      const bullet = paper(page)
        .locator("[data-paged] [data-editable]")
        .filter({ hasText: "Argued in print" })
        .first();

      await camera.at(page, bullet, 2, { dy: 40 });
      await press(page, bullet);
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Published Note G in 1843", { delay: 30 });
      await page.waitForTimeout(300);
      await page.keyboard.press("Enter");
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(500);

      return posterAt;
    },
  });
});
