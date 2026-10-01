import { expect, test } from "@playwright/test";

import { createResume, openEmptyApp, paper, paperText } from "./app";

/**
 * The three single-column templates that arrived after the first four, each made
 * through the dialog and drawn. A unit test cannot say that a template's CSS
 * parses and paints, and a template that failed to would still pass every check
 * on its markup.
 */
for (const [name, id] of [
  ["Compact", "compact"],
  ["Profile", "profile"],
  ["Bold", "bold"],
] as const) {
  test(`${name} is offered, chosen and drawn`, async ({ page }) => {
    await openEmptyApp(page);
    await createResume(page, "Ada Lovelace", { template: name });

    await expect(
      paper(page).locator(`.resivo-paper[data-template="${id}"]`).first(),
    ).toBeVisible();
    expect(await paperText(page)).toMatch(/summary/i);
  });
}
