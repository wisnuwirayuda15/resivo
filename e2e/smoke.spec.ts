import { expect, test } from "@playwright/test";

import { createResume, openEmptyApp, paperText } from "./app";

/**
 * The smallest thing that proves the harness works: an empty database, a resume
 * made through the dialog, and its name on the paper.
 *
 * Kept separate from the workflow spec so a failure here says "the app does not
 * start" rather than "step four of eleven".
 */
test("creates a resume and renders it", async ({ page }) => {
  await openEmptyApp(page);

  await expect(page.getByText("No resumes yet")).toBeVisible();

  await createResume(page, "Ada Lovelace");

  // Case-insensitive: section titles are uppercased by the template's CSS, and
  // `innerText` reports what is rendered rather than what the model holds.
  expect(await paperText(page)).toMatch(/summary/i);
});
