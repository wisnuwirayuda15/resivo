import { expect, test } from "@playwright/test";

import { press, recordClip } from "./record";

/**
 * The clip on `docs/jobs/versions`: from a card in the library to a version for
 * a company, one phrase rewritten in it, and the Compare drawer showing exactly
 * which words changed.
 *
 * Starts in the library with the resume already in it, because making a version
 * is something done to a resume that exists.
 */
test("records the versions clip", async ({ browser }, testInfo) => {
  await recordClip({
    browser,
    testInfo,
    name: "versions",
    opens: "library",
    script: async ({ page, camera }) => {
      // The card's menu.
      const actions = page.getByRole("button", {
        name: "Actions for Ada Lovelace",
      });

      await camera.at(page, actions, 2, { dx: -300, dy: 40 });
      await press(page, actions);

      const menu = page.getByRole("menu", { name: "Actions for Ada Lovelace" });

      await expect(menu).toBeVisible();
      await camera.at(page, menu, 1.9);
      await page.waitForTimeout(500);

      await press(
        page,
        menu.getByRole("menuitem", { name: "Create version for a job" }),
      );

      // The company and the role.
      const dialog = page.getByRole("dialog", { name: "New version" });

      await expect(dialog).toBeVisible();

      const company = dialog.getByLabel("Company");

      await camera.at(page, company, 1.9, { dy: 60 });
      await press(page, company);
      await page.keyboard.type("Acme", { delay: 70 });

      const role = dialog.getByLabel("Role");

      await press(page, role);
      await page.keyboard.type("Staff Engineer", { delay: 55 });
      await page.waitForTimeout(300);

      const create = dialog.getByRole("button", { name: "Create version" });

      await camera.at(page, create, 1.9, { dx: -150, dy: -40 });
      await press(page, create);

      // The version opens, and says what it is a version of.
      await expect(page).toHaveURL(/\/resumes\/[0-9a-f-]{36}$/);

      const chip = page.getByText("Version for Acme");

      await expect(chip).toBeVisible({ timeout: 30_000 });
      await camera.at(page, chip, 2.4, { dx: 200, dy: 100 });
      await page.waitForTimeout(1100);

      // A phrase rewritten for this company, in the Markdown.
      const line = page
        .locator(".view-line")
        .filter({ hasText: "Mathematician working on" })
        .first();

      await expect(line).toBeVisible({ timeout: 20_000 });

      const box = await line.boundingBox();

      if (box === null) {
        throw new Error("the line has no box");
      }

      await camera.look(page, box.x + 360, box.y + 40, 2);
      await page.mouse.dblclick(box.x + 40, box.y + box.height / 2);
      await page.keyboard.type("Analytical mathematician", { delay: 45 });
      await page.waitForTimeout(700);

      // Compare.
      const compare = page.getByRole("button", { name: "Compare" });

      await camera.at(page, compare, 2.4, { dx: 160, dy: 100 });
      await press(page, compare);

      const drawer = page.getByRole("dialog", {
        name: "Changes from Ada Lovelace",
      });

      await expect(drawer).toBeVisible();
      await expect(drawer.getByText(/Analytical/).first()).toBeVisible();
      await page.waitForTimeout(600);
      await camera.at(page, drawer, 1.5, { dy: -120 });
      const posterAt = camera.now() - 0.1;

      await page.waitForTimeout(2200);

      return posterAt;
    },
  });
});
