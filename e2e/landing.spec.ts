import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

/**
 * The landing page.
 *
 * `/` used to redirect to the library, so a first visit went straight into an
 * app that had not said what it was. These tests cover what the page has to get
 * right: that it is served rather than redirected, that it leads into the app,
 * that it fits a phone, and that its reveal animation cannot leave a section
 * invisible.
 *
 * `openEmptyApp` is deliberately not used. It starts in `/resumes` and marks
 * the tours seen, and neither applies here: this page has no shell, so no tour
 * runs on it.
 */

const PHONE = { width: 375, height: 812 };

/**
 * Waits for React to take over the server-rendered markup.
 *
 * Needed before any click here, and found the hard way: a click on a button
 * that has not been hydrated does nothing, and TanStack restores the scroll
 * position on hydration, so the test read a page that had silently gone back to
 * the top. A revealed section proves an effect has run.
 */
const hydrated = async (page: Page) => {
  await expect(page.locator('[data-reveal="shown"]').first()).toBeVisible();
};

/** Marks the tours seen, for the tests that cross into the app. */
const skipTours = async (page: Page) => {
  await page.evaluate(() => {
    try {
      localStorage.setItem("resivo.onboarding.library", "1");
      localStorage.setItem("resivo.onboarding.editor", "1");
    } catch {
      // A browser refusing storage would not show a tour either.
    }
  });
};

test("is served at the root, and says what the app is", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: /never leaves this browser/ }),
  ).toBeVisible();

  // The claim the app is built around, in the reader's path rather than behind
  // a menu.
  await expect(page.getByText("No account. No server.")).toBeVisible();
});

test("leads into the app", async ({ page }) => {
  await page.goto("/");
  await skipTours(page);

  await page
    .getByRole("banner")
    .getByRole("link", { name: "Open the app" })
    .click();

  // The library adds its sort to the query string as it loads.
  await expect(page).toHaveURL(/\/resumes/);
  await expect(page.getByRole("link", { name: "Templates" })).toBeVisible();
});

test("switches the page beside the template names", async ({ page }) => {
  await page.goto("/");

  await hydrated(page);

  const editorial = page.getByRole("button", { name: "Editorial" });
  const classic = page.getByRole("button", { name: "Classic" });

  // Classic is the one the section opens on.
  await expect(classic).toHaveAttribute("aria-pressed", "true");

  await editorial.click();

  await expect(editorial).toHaveAttribute("aria-pressed", "true");
  await expect(classic).toHaveAttribute("aria-pressed", "false");

  /**
   * The paper really changed, and not just the row.
   *
   * All four pages are in the document with opacity deciding which is on top,
   * so the assertion is on the one that should now be visible rather than on
   * a count of rendered pages.
   */
  const shown = page
    .locator('[data-template="editorial"]')
    .locator("..")
    .first();

  await expect
    .poll(() =>
      shown.evaluate((node) => Number(window.getComputedStyle(node).opacity)),
    )
    .toBe(1);
});

test("fits a phone, with nothing pushed off the side", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/");

  const overflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );

  expect(await overflow()).toBe(0);

  // The bar keeps one line: the mark, the theme control and the one action.
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Open the app" }),
  ).toBeInViewport({ ratio: 1 });

  // Scrolling the whole page must not open a horizontal one.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(await overflow()).toBe(0);
});

/**
 * The reveal cannot leave anything unread.
 *
 * The sections start at zero opacity and are shown by an `IntersectionObserver`,
 * which is the one way this page could ship a blank section: a reader who never
 * triggers the observer would never see the content. So both paths are checked.
 */
test("shows every section once it has been scrolled past", async ({ page }) => {
  await page.goto("/");
  await hydrated(page);

  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;

    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  });

  await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0);
  await expect(page.getByText("Start with a blank page.")).toBeVisible();
});

test("shows every section at once under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  /**
   * The state attribute still says pending for anything below the fold, and
   * that is correct: the reduced-motion rule overrides both states, so the
   * assertion is on what the reader can see rather than on the attribute.
   */
  const closing = page.getByText("Start with a blank page.");

  await expect(closing).toHaveCSS("opacity", "1");
});
