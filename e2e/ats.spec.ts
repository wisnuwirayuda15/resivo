import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

import {
  createResume,
  openEditorPane,
  openEmptyApp,
  openInspectorTab,
  typeMarkdown,
} from "./app";

/**
 * The ATS tab.
 *
 * What these cover that `ats/*.test.ts` cannot: that the tab is reachable, that
 * a fix goes through the real store and the preview follows it, and that one
 * undo takes it back. The rules themselves are the unit tests' business.
 */

test.beforeEach(async ({ page }) => {
  await openEmptyApp(page);
});

const issues = (page: Page) => page.getByRole("list", { name: "ATS issues" });

test("lists what is wrong with a blank page", async ({ page }) => {
  await createResume(page, "Blank one");
  await openInspectorTab(page, "ATS");

  await expect(issues(page)).toContainText("The resume has no name.");
  await expect(issues(page)).toContainText("The Summary section is empty.");
});

test("finds nothing to say about the example resume", async ({ page }) => {
  await createResume(page, "Ada", { start: "Example resume" });
  await openInspectorTab(page, "ATS");

  await expect(page.getByText("No issues we recognise")).toBeVisible();
  await expect(issues(page)).toHaveCount(0);
});

test("a fix changes the document, and one undo takes it back", async ({
  page,
}) => {
  await createResume(page, "Blank one");
  await openInspectorTab(page, "ATS");

  const message = page.getByText("The Summary section is empty.");

  await expect(message).toBeVisible();

  await page.getByRole("button", { name: /^Hide section, Summary/ }).click();
  await expect(message).toHaveCount(0);

  await page.getByRole("button", { name: /^Undo/ }).click();
  await expect(message).toBeVisible();
});

test("fix all is one step", async ({ page }) => {
  await createResume(page, "Blank one");
  await openInspectorTab(page, "ATS");

  await expect(page.getByText(/is empty\.$/)).toHaveCount(4);

  await page.getByRole("button", { name: /^Fix all/ }).click();
  await expect(page.getByText(/is empty\.$/)).toHaveCount(0);

  // The four sections were hidden by one recipe, so one undo brings all four
  // back, not one.
  await page.getByRole("button", { name: /^Undo/ }).click();
  await expect(page.getByText(/is empty\.$/)).toHaveCount(4);
});

test("a style problem is reported, fixed, and the style panel agrees", async ({
  page,
}) => {
  await createResume(page, "Ada", { start: "Example resume" });
  await openInspectorTab(page, "Style");

  await page.getByLabel("Body size").fill("8");
  await page.getByLabel("Body size").blur();

  await openInspectorTab(page, "ATS");
  await expect(issues(page)).toContainText("Body text is 8pt.");

  await page.getByRole("button", { name: /^Set to 10pt/ }).click();
  await expect(page.getByText("No issues we recognise")).toBeVisible();

  await openInspectorTab(page, "Style");
  await expect(page.getByLabel("Body size")).toHaveValue(/^10/);
});

test("a dismissed issue stays dismissed across tabs, and can be brought back", async ({
  page,
}) => {
  await createResume(page, "Blank one");
  await openInspectorTab(page, "ATS");

  const email = page.getByText("No email address in the contact details.");

  await expect(email).toBeVisible();
  await page
    .getByRole("button", { name: /^Dismiss: No email address/ })
    .click();
  await expect(email).toHaveCount(0);

  // The panel unmounts when another tab is open. A dismissal that came back on
  // every switch would be no dismissal at all.
  await openInspectorTab(page, "Style");
  await openInspectorTab(page, "ATS");
  await expect(email).toHaveCount(0);

  await expect(page.getByText("1 issue dismissed")).toBeVisible();
  await page.getByRole("button", { name: "Show again" }).click();
  await expect(email).toBeVisible();
});

/**
 * Three sheets: two forced breaks, so the length does not depend on fonts. The
 * empty Summary is there to give the tab something it can fix, which the
 * stale-count spec needs in order to change the document from inside the tab.
 */
const THREE_PAGES =
  "# Ada\n\n## Summary\n\n## Experience\n\n::pagebreak\n\n::pagebreak\n";

test("flags a resume past two pages, from what the paper measured", async ({
  page,
}) => {
  await createResume(page, "Long one");
  await typeMarkdown(page, THREE_PAGES);
  await expect(page.getByText("3 pages", { exact: true })).toBeVisible();

  await openInspectorTab(page, "ATS");

  await expect(issues(page)).toContainText("The resume runs to 3 pages.");
  // The paper is on screen, so there is nothing to apologise for.
  await expect(page.getByRole("note")).toHaveCount(0);
});

test("says it cannot check length when the paper is not on screen, and does not keep a stale count", async ({
  page,
}) => {
  test.slow();

  await page.setViewportSize({ width: 900, height: 800 });
  await createResume(page, "Long one");

  await openEditorPane(page, "Code");
  await typeMarkdown(page, THREE_PAGES);

  // Visit the paper so it measures, then leave it.
  await openEditorPane(page, "Paper");
  await expect(page.getByText(/^3 pages/)).toBeVisible();

  await openEditorPane(page, "Style");
  await openInspectorTab(page, "ATS");

  // The document has not changed since it was measured, so the count holds.
  await expect(issues(page)).toContainText("The resume runs to 3 pages.");
  await expect(page.getByRole("note")).toHaveCount(0);

  // Any edit makes it a different document, with nobody to measure it.
  await page.getByRole("button", { name: /^Fix all/ }).click();

  await expect(issues(page)).not.toContainText("pages.");
  await expect(page.getByRole("note")).toContainText("Open the Paper tab");
});

test("the ATS tab is reachable on a narrow screen", async ({ page }) => {
  test.slow();

  await page.setViewportSize({ width: 900, height: 800 });
  await createResume(page, "Blank one");

  await openEditorPane(page, "Style");
  await openInspectorTab(page, "ATS");

  await expect(issues(page)).toContainText("The resume has no name.");
});
