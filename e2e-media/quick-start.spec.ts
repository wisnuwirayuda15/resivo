import { expect, test } from "@playwright/test";

import { paper } from "../e2e/app";

import { centerOf } from "./clip";
import { press, recordClip } from "./record";

/**
 * The clip on `docs/getting-started/quick-start`: the empty library, the New
 * resume dialog left on its defaults, the editor opening, one word changed in
 * the Markdown and the paper following, the Saved indicator, and the Export
 * menu.
 *
 * The one clip that starts from nothing, so it is also the one that records the
 * dialog, which every other story skips by being handed a resume.
 */
test("records the quick start clip", async ({ browser }, testInfo) => {
  await recordClip({
    browser,
    testInfo,
    name: "quick-start",
    opens: "empty-library",
    script: async ({ page, camera, wide }) => {
      // The empty library.
      const none = page.getByText("No resumes yet").first();

      await camera.at(page, none, 1.6, { dy: 40 });
      await page.waitForTimeout(700);

      // New resume.
      const open = page
        .getByRole("banner")
        .getByRole("button", { name: "New resume" });

      await camera.at(page, open, 2, { dx: -250, dy: 120 });
      await press(page, open);

      const dialog = page.getByRole("dialog", { name: "New resume" });

      await expect(dialog).toBeVisible();

      // The dialog is taller than any one shot, so it is taken in three: the
      // starting point it is left on, the name typed, and the button.
      const start = dialog.getByText("Example resume", { exact: true });

      await camera.at(page, start, 1.8, { dy: -60 });
      await page.waitForTimeout(900);

      const name = dialog.getByLabel("Name");

      await camera.at(page, name, 2.2, { dy: -30 });
      await press(page, name);
      await page.keyboard.type("Ada Lovelace", { delay: 45 });
      await page.waitForTimeout(250);

      const create = dialog.getByRole("button", { name: "Create resume" });

      await camera.at(page, create, 2.2, { dx: -80, dy: -60 });
      await press(page, create);

      // The editor opens.
      await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);
      await expect(paper(page).locator("[data-paged]").first()).toBeVisible({
        timeout: 30_000,
      });
      await camera.look(page, wide.x, wide.y, 1, 0.6);
      await page.waitForTimeout(900);

      // Change a word in the Markdown, and the paper follows.
      const line = page
        .locator(".view-line")
        .filter({ hasText: "Mathematician, and the first" })
        .first();
      const tagline = paper(page).getByText("and the first programmer").first();

      const code = await centerOf(line);
      const sheet = await centerOf(tagline);

      await camera.look(
        page,
        (code.x + sheet.x) / 2,
        (code.y + sheet.y) / 2,
        1.45,
      );

      const box = await line.boundingBox();

      if (box === null) {
        throw new Error("the line has no box");
      }

      // The first word of the line, double-clicked to select it.
      await page.mouse.dblclick(box.x + 40, box.y + box.height / 2);
      await page.keyboard.type("Mathematical pioneer", { delay: 45 });
      await page.waitForTimeout(900);
      const posterAt = camera.now() - 0.2;

      // Saved.
      const saved = page.getByText("Saved", { exact: true }).first();

      await expect(saved).toBeVisible({ timeout: 15_000 });
      await camera.at(page, saved, 2.8, { dx: -90, dy: 40 });
      await page.waitForTimeout(800);

      // Export.
      const exportButton = page.getByRole("button", { name: "Export" });

      await camera.at(page, exportButton, 2, { dx: 40, dy: 150 });
      await press(page, exportButton);
      await expect(page.getByRole("menuitem", { name: /PDF/ })).toBeVisible();
      await page.waitForTimeout(900);

      return posterAt;
    },
  });
});
