import { test } from "@playwright/test";

import { centerOf } from "./clip";
import { lookAtPaper, press, recordClip, scrollTo } from "./record";

import type { Page } from "@playwright/test";

/**
 * The clip on `docs/design/style-inspector`: the four tabs, then three changes
 * made there (a template, a colour, a hidden section), and the undo that takes
 * the last of them back, which is the point of "a change is an edit".
 *
 * Each change is shown as a cause at the inspector, which is a narrow strip at
 * the right edge of the window, and then as an effect on the paper, a different
 * part of the window: one shot cannot hold both without making each too small.
 */

const tab = (page: Page, name: string) =>
  page
    .getByRole("tablist", { name: "Inspector" })
    .getByRole("tab", { name, exact: true });

test("records the style inspector clip", async ({ browser }, testInfo) => {
  await recordClip({
    browser,
    testInfo,
    name: "style-inspector",
    script: async ({ page, camera }) => {
      // The four tabs, once through.
      const strip = page.getByRole("tablist", { name: "Inspector" });
      const at = await centerOf(strip);

      await camera.look(page, at.x - 120, at.y + 120, 2.4);

      for (const name of ["Sections", "Assets", "ATS", "Style"]) {
        await press(page, tab(page, name));
        await page.waitForTimeout(120);
      }

      // A template.
      const modern = page.getByRole("button", { name: /^Aa Modern/ });
      const card = await centerOf(modern);

      await camera.look(page, card.x - 100, card.y, 2);
      await press(page, modern);
      await page.waitForTimeout(500);

      await lookAtPaper(page, camera, { zoom: 1.25 });
      const posterAt = camera.now() + 0.7;

      await page.waitForTimeout(800);

      // A colour, typed.
      const accent = page.getByRole("textbox", { name: "Accent" });

      await scrollTo(page, accent);

      const field = await centerOf(accent);

      await camera.look(page, field.x - 120, field.y, 2.4);
      await press(page, accent);
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type("#c2410c", { delay: 70 });
      await page.keyboard.press("Tab");
      await page.waitForTimeout(300);

      await lookAtPaper(page, camera, { zoom: 1.25 });
      await page.waitForTimeout(800);

      // A section hidden.
      await press(page, tab(page, "Sections"));
      await page.waitForTimeout(250);

      const hide = page.getByRole("button", { name: "Hide Projects" });
      const row = await centerOf(hide);

      await camera.look(page, row.x - 120, row.y, 2.4);
      await press(page, hide);
      await page.waitForTimeout(300);

      await lookAtPaper(page, camera, { zoom: 1.35, down: 520 });
      await page.waitForTimeout(800);

      // And the last change is taken back, like any edit.
      const undo = page.getByRole("button", { name: /^Undo/ });
      const button = await centerOf(undo);

      await camera.look(page, button.x - 100, button.y + 80, 2.6);
      await press(page, undo);
      await page.waitForTimeout(300);

      await lookAtPaper(page, camera, { zoom: 1.35, down: 520 });
      await page.waitForTimeout(800);

      return posterAt;
    },
  });
});
