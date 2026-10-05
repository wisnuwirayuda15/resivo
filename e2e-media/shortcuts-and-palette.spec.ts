import { expect, test } from "@playwright/test";

import { centerOf, showKeys } from "./clip";
import { recordClip } from "./record";

import type { Page } from "@playwright/test";

/**
 * The clip on `docs/editor/shortcuts-and-palette`: the command palette opened
 * from the keyboard and searched three ways (a word, a related word, the name
 * of a command), the shortcut sheet it leads to, and the sidebar toggled with
 * its own shortcut.
 *
 * A recording shows what a key did and not the key, so each press is announced
 * on screen by \`showKeys\`.
 */

const search = (page: Page) => page.getByPlaceholder("Search commands…");

/** Presses a chord, announced on screen, and waits for the badge to be read. */
const chord = async (
  page: Page,
  keys: string,
  labels: ReadonlyArray<string>,
): Promise<void> => {
  await showKeys(page, labels);
  await page.keyboard.press(keys);
};

test("records the shortcuts and palette clip", async ({
  browser,
}, testInfo) => {
  await recordClip({
    browser,
    testInfo,
    name: "shortcuts-and-palette",
    script: async ({ page, camera, wide }) => {
      // The palette.
      await chord(page, "Control+k", ["Ctrl", "K"]);
      await expect(search(page)).toBeVisible();

      const field = await centerOf(search(page));

      await camera.look(page, field.x, field.y + 140, 1.7);
      await page.waitForTimeout(700);

      // A word that is not a name: "folder" finds New group.
      await page.keyboard.type("folder", { delay: 80 });
      await expect(page.getByText("New group").first()).toBeVisible();
      const posterAt = camera.now() + 0.2;

      await page.waitForTimeout(1300);

      // "dark" finds the theme command.
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type("dark", { delay: 80 });
      await page.waitForTimeout(1300);

      // And a name finds the sheet, which Enter opens.
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type("shortcuts", { delay: 80 });
      await page.waitForTimeout(700);
      await page.keyboard.press("Enter");

      const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts" });

      await expect(sheet).toBeVisible();
      await camera.at(page, sheet, 1.5);
      await page.waitForTimeout(2200);

      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
      await camera.look(page, wide.x, wide.y, 1, 0.6);
      await page.waitForTimeout(400);

      // The sidebar, out and back.
      // The sidebar is at the left edge and the key badge is at the bottom centre, so
      // the view is put where it holds both.
      await camera.look(page, 640, 700, 1.5);
      await chord(page, "Control+b", ["Ctrl", "B"]);
      await page.waitForTimeout(1500);
      await chord(page, "Control+b", ["Ctrl", "B"]);
      await page.waitForTimeout(1300);

      return posterAt;
    },
  });
});
