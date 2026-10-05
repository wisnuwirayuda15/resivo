import { expect, test } from "@playwright/test";

import { centerOf } from "./clip";
import { press, recordClip } from "./record";

import type { Camera } from "./clip";
import type { Page } from "@playwright/test";

/**
 * The clip on `docs/help/tours`: the library tour from its first card to its
 * last, the editor opening on its own tour, a skip, and the application menu
 * where a tour is taken again.
 *
 * The only clip with the tours left on. A card is a title and a body beside the
 * thing it describes, so the camera is put on the card and not on the target:
 * the card names the target, and the highlight round it is large enough to see
 * from there.
 */

/** Looks at a card by its title, reads it, and moves on with its button. */
const step = async (
  page: Page,
  camera: Camera,
  title: string,
  button: RegExp,
): Promise<void> => {
  const card = page.getByText(title, { exact: true });

  await expect(card).toBeVisible({ timeout: 20_000 });
  await camera.at(page, card, 1.6, { dy: 40, dx: -60 });
  await page.waitForTimeout(950);
  await press(page, page.getByRole("button", { name: button }));
  await page.waitForTimeout(250);
};

test("records the tours clip", async ({ browser }, testInfo) => {
  await recordClip({
    browser,
    testInfo,
    name: "tours",
    opens: "empty-library",
    tours: true,
    script: async ({ page, camera }) => {
      // The library tour.
      await step(page, camera, "Start here", /^Next/);
      const posterAt = camera.now() - 0.9;

      await step(page, camera, "Images and fonts are shared", /^Next/);
      await step(page, camera, "This is the important one", /^Next/);
      await step(page, camera, "Everything, from the keyboard", /^(End|Next)/);

      // A resume, to reach the editor's tour.
      const open = page
        .getByRole("banner")
        .getByRole("button", { name: "New resume" });

      await camera.at(page, open, 2, { dx: -250, dy: 120 });
      await press(page, open);

      const dialog = page.getByRole("dialog", { name: "New resume" });

      await expect(dialog).toBeVisible();

      const create = dialog.getByRole("button", { name: "Create resume" });

      await camera.at(page, create, 2, { dx: -80, dy: -60 });
      await press(page, create);

      // The editor's tour, for three cards and then a skip.
      await step(page, camera, "Markdown, and your own CSS", /^Next/);
      await step(page, camera, "Every directive, with an example", /^Next/);

      await expect(page.getByText("The paper is editable too")).toBeVisible({
        timeout: 20_000,
      });
      await camera.at(page, page.getByText("The paper is editable too"), 1.6, {
        dy: 40,
        dx: -60,
      });
      await page.waitForTimeout(950);
      await press(page, page.getByRole("button", { name: /^Skip/ }));
      await page.waitForTimeout(500);

      // Where a tour is taken again.
      const menu = page.getByRole("button", { name: "Application menu" });
      const at = await centerOf(menu);

      await camera.look(page, at.x - 150, at.y + 120, 2.2);
      await press(page, menu);

      const again = page.getByRole("menuitem", { name: "Take the tour" });

      await expect(again).toBeVisible();
      await again.hover();
      await page.waitForTimeout(1200);

      return posterAt;
    },
  });
});
