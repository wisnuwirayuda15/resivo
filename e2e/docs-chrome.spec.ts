import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

/**
 * The docs' frame: header, sidebar, breadcrumbs, pager and the phone drawer.
 *
 * Interactive specs wait for `data-hydrated`, which the layout sets in an
 * effect: a click on a server-rendered control before React has taken over does
 * nothing, and the test would read a page that never reacted.
 */
const hydrated = async (page: Page) => {
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
};

const sidebar = (page: Page) =>
  page.getByRole("navigation", { name: "Documentation" });

test.describe("docs chrome", () => {
  test("marks the page being read, and only that one", async ({ page }) => {
    await page.goto("/en/docs/format/overview");
    await hydrated(page);

    await expect(sidebar(page).locator('[aria-current="page"]')).toHaveCount(1);
    await expect(
      sidebar(page).getByRole("link", { name: "The shape of the file" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("moves between pages from the sidebar without reloading it", async ({
    page,
  }) => {
    await page.goto("/en/docs/format/overview");
    await hydrated(page);

    await sidebar(page)
      .getByRole("link", { name: "Resivo documentation" })
      .click();

    await expect(page).toHaveURL("/en/docs");
    await expect(
      page.getByRole("heading", { level: 1, name: "Resivo documentation" }),
    ).toBeVisible();
    await expect(sidebar(page).locator('[aria-current="page"]')).toHaveCount(1);
  });

  test("opens and closes a folder", async ({ page }) => {
    await page.goto("/en/docs");
    await hydrated(page);

    const folder = sidebar(page).getByRole("button", { name: "Format" });

    await expect(folder).toHaveAttribute("aria-expanded", "false");
    await folder.click();
    await expect(folder).toHaveAttribute("aria-expanded", "true");
    await expect(
      sidebar(page).getByRole("link", { name: "The shape of the file" }),
    ).toBeVisible();
  });

  test("shows the trail above a page inside a folder, and none on the home", async ({
    page,
  }) => {
    await page.goto("/en/docs/format/overview");

    const trail = page.getByRole("navigation", { name: "Breadcrumbs" });

    await expect(
      trail.getByRole("link", { name: "Documentation" }),
    ).toBeVisible();
    await expect(trail).toContainText("Format");

    await page.goto("/en/docs");
    await expect(
      page.getByRole("navigation", { name: "Breadcrumbs" }),
    ).toHaveCount(0);
  });

  test("offers the neighbouring pages in the order the sidebar reads", async ({
    page,
  }) => {
    await page.goto("/en/docs");

    const pager = page.getByRole("navigation", { name: "More pages" });

    await expect(pager.getByRole("link")).toHaveCount(1);
    await pager.getByRole("link", { name: /The shape of the file/ }).click();

    await expect(page).toHaveURL("/en/docs/format/overview");
    await expect(
      page
        .getByRole("navigation", { name: "More pages" })
        .getByRole("link", { name: /Resivo documentation/ }),
    ).toBeVisible();
  });

  test("lists the headings of a page beside it", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.goto("/en/docs");

    await expect(
      page
        .getByRole("complementary", { name: "On this page" })
        .getByRole("link", {
          name: "Where to go next",
        }),
    ).toBeVisible();
  });

  test("switches language on the same page and remembers the choice", async ({
    page,
  }) => {
    await page.goto("/en/docs/format/overview");
    await hydrated(page);

    await page.getByRole("button", { name: "Language" }).click();
    await page.getByRole("menuitem", { name: "Bahasa Indonesia" }).click();

    await expect(page).toHaveURL("/id/docs/format/overview");
    await expect(
      page.getByRole("heading", { level: 1, name: "Bentuk berkas" }),
    ).toBeVisible();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("resivo.language"),
    );

    expect(stored).toBe("id");
  });

  test("has a skip link that lands on the content", async ({ page }) => {
    await page.goto("/en/docs");
    await hydrated(page);

    await page.keyboard.press("Tab");

    const skip = page.getByRole("link", { name: "Skip to the content" });

    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page).toHaveURL(/#docs-main$/);
  });

  test("keeps its sidebar in a drawer on a phone, and nothing off the side", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/en/docs/format/overview");
    await hydrated(page);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );

    expect(overflow).toBe(0);
    await expect(
      page.getByRole("navigation", { name: "Documentation" }),
    ).toHaveCount(0);

    await page
      .getByRole("button", { name: "Open the documentation menu" })
      .click();

    const drawer = page.getByRole("dialog");

    await expect(
      drawer.getByRole("link", { name: "The shape of the file" }),
    ).toHaveAttribute("aria-current", "page");

    await drawer.getByRole("link", { name: "Resivo documentation" }).click();

    await expect(page).toHaveURL("/en/docs");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
