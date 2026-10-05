import { test } from "@playwright/test";

import { centerOf } from "./clip";
import { press, recordClip, scrollTo } from "./record";

/**
 * The clip on `docs/design/templates`: the same resume drawn by several
 * templates, then the question a switch asks when a style setting has been
 * changed by hand.
 *
 * The first half is one fixed shot. The cards are in the inspector at the right
 * edge and the paper is in the middle, and what a viewer should see is the
 * paper change as a card is chosen, so the view holds both and does not move
 * between a cause and an effect the way the other clips do.
 */
test("records the templates clip", async ({ browser }, testInfo) => {
  await recordClip({
    browser,
    testInfo,
    name: "templates",
    script: async ({ page, camera }) => {
      const card = (name: string) =>
        page.getByRole("button", { name: new RegExp(`^Aa ${name}`) });

      await camera.look(page, 1140, 470, 1.2, 0.7);
      await page.waitForTimeout(400);

      // The same document, in three of the seven.
      let posterAt = 0;

      for (const name of ["Editorial", "Compact", "Bold"]) {
        await press(page, card(name));
        await page.waitForTimeout(1100);

        if (name === "Editorial") {
          posterAt = camera.now() - 0.3;
        }
      }

      // A setting changed by hand: the body size.
      const size = page.getByRole("textbox", { name: "Body size" });

      await scrollTo(page, size);

      const field = await centerOf(size);

      await camera.look(page, field.x - 120, field.y, 2.4);
      await press(page, size);
      // Filled and blurred, as the e2e specs do it: typed key by key, the field
      // took the digits and did not commit them.
      await size.fill("12");
      await size.blur();
      await page.waitForTimeout(500);

      // And then a template, which has to ask what to do with it.
      await scrollTo(page, card("Classic"));

      const classic = await centerOf(card("Classic"));

      await camera.look(page, classic.x - 100, classic.y, 2);
      await press(page, card("Classic"));

      const dialog = page.getByRole("dialog", {
        name: "Keep your style changes?",
      });

      await dialog.waitFor();
      await camera.at(page, dialog, 1.7);
      await page.waitForTimeout(1500);

      await press(
        page,
        dialog.getByRole("button", { name: "Keep my changes" }),
      );
      await dialog.waitFor({ state: "hidden" });

      await camera.look(page, 1140, 470, 1.2, 0.7);
      await page.waitForTimeout(1000);

      return posterAt;
    },
  });
});
