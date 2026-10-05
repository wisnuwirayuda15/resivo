import { expect, test } from "@playwright/test";

import { openInspectorTab } from "../e2e/app";

import { centerOf } from "./clip";
import { lookAtPaper, press, recordClip } from "./record";

import type { Page } from "@playwright/test";

/**
 * The clip on `docs/checks/ats-check`: the tab's list, one problem fixed on its
 * own and its effect on the paper, then the two that remain fixed together, and
 * the one undo that takes both back.
 *
 * The example resume is clean, so it is made not to be before anything is
 * recorded: its body text is set to 8pt, which is a warning with a fix that
 * visibly reflows the page, and two sections are added with nothing in them,
 * which are fixes of the other kind (hide the section).
 */

const prepare = async (page: Page): Promise<void> => {
  await openInspectorTab(page, "Style");
  await page.getByRole("textbox", { name: "Body size" }).fill("8");
  await page.getByRole("textbox", { name: "Body size" }).blur();

  // Two empty sections at the end of the Markdown.
  await page.locator(".monaco-editor").first().click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("\n\n## Awards\n\n## Interests\n", { delay: 20 });
  await expect(page.getByText(/Interests/).first()).toBeVisible();
};

test("records the ATS check clip", async ({ browser }, testInfo) => {
  await recordClip({
    browser,
    testInfo,
    name: "ats-check",
    prepare,
    script: async ({ page, camera }) => {
      // The tab, and what it found.
      const tab = page
        .getByRole("tablist", { name: "Inspector" })
        .getByRole("tab", { name: "ATS", exact: true });
      const at = await centerOf(tab);

      await camera.look(page, at.x - 120, at.y + 60, 2.4);
      await press(page, tab);
      await page.waitForTimeout(400);

      const list = page.getByRole("list", { name: "ATS issues" });

      await expect(list).toBeVisible();

      const listAt = await centerOf(list);

      await camera.look(page, listAt.x - 100, listAt.y - 40, 1.7);
      const posterAt = camera.now() + 0.5;

      await page.waitForTimeout(1800);

      // One fix on its own: the body text goes to 10pt, and the page reflows.
      const size = page.getByRole("button", { name: /^Set to 10pt/ });
      const button = await centerOf(size);

      await camera.look(page, button.x - 100, button.y, 2.2);
      await press(page, size);
      await page.waitForTimeout(400);

      await lookAtPaper(page, camera, { zoom: 1.2, down: 420 });
      await page.waitForTimeout(1300);

      // The rest together.
      const all = page.getByRole("button", { name: /^Fix all/ });
      const allAt = await centerOf(all);

      await camera.look(page, allAt.x - 100, allAt.y + 60, 2.2);
      await press(page, all);
      await expect(page.getByText("No issues we recognise")).toBeVisible();
      await page.waitForTimeout(1300);

      // Which is one step to undo.
      const undo = page.getByRole("button", { name: /^Undo/ });
      const undoAt = await centerOf(undo);

      await camera.look(page, undoAt.x - 100, undoAt.y + 90, 2.4);
      await press(page, undo);
      await expect(list).toBeVisible();
      await camera.look(page, listAt.x - 100, listAt.y - 40, 1.7);
      await page.waitForTimeout(1300);

      return posterAt;
    },
  });
});
