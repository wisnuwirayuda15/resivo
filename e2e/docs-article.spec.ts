import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

/**
 * What an article is made of: highlighted code, the blocks an author can write,
 * links, and the contents column that follows the reader.
 *
 * These read the format overview page, which holds one of each on purpose. When
 * that page is rewritten for real, each assertion moves to whichever page holds
 * the same element; none of them is about that page's words.
 */
const hydrated = async (page: Page) => {
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
};

const article = (page: Page) => page.getByRole("article");

test.describe("docs article", () => {
  test("has one h1, and it is the page title", async ({ page }) => {
    await page.goto("/en/docs/format/overview");

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("The shape of the file");
  });

  test("colours a directive in the server's own markup", async ({
    request,
  }) => {
    const html = await (await request.get("/en/docs/format/overview")).text();

    expect(html).toContain('<span class="hljs-keyword">::contact</span>');
  });

  test("draws a code block with its file name and a copy button", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/en/docs/format/overview");
    await hydrated(page);

    const block = article(page).locator("pre").first();

    await expect(page.getByText("resume.md", { exact: true })).toBeVisible();
    await expect(block.locator(".hljs-keyword").first()).toHaveText(
      "::contact",
    );

    await page.getByRole("button", { name: "Copy the code" }).first().click();

    const copied = await page.evaluate(() => navigator.clipboard.readText());

    expect(copied.startsWith("# Ada Lovelace")).toBe(true);
    // The text, not the highlighted markup around it.
    expect(copied).not.toContain("<span");
    await expect(
      page.getByRole("button", { name: "Copied" }).first(),
    ).toBeVisible();
  });

  test("makes each heading its own permalink", async ({ page }) => {
    await page.goto("/en/docs/format/overview");
    await hydrated(page);

    const link = article(page).getByRole("link", {
      name: /What a section holds/,
    });

    await expect(link).toHaveAttribute("href", "#sections");
    await link.click();
    await expect(page).toHaveURL(/#sections$/);
  });

  test("renders a Markdown table as a table", async ({ page }) => {
    await page.goto("/en/docs/format/overview");

    const table = article(page).getByRole("table");

    await expect(
      table.getByRole("columnheader", { name: "Directive" }),
    ).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(4);
  });

  test("renders a list with its markers", async ({ page }) => {
    await page.goto("/en/docs/format/overview");

    const list = article(page).getByRole("list").first();

    await expect(list.getByRole("listitem")).toHaveCount(3);
    expect(
      await list.evaluate((node) => getComputedStyle(node).listStyleType),
    ).toBe("disc");
  });

  test("boxes a callout, and keeps its kind", async ({ page }) => {
    await page.goto("/en/docs/format/overview");

    const notes = article(page).getByRole("note");

    await expect(notes).toHaveCount(2);
    await expect(notes.first()).toContainText("A note");
    await expect(notes.last()).toContainText("Mind the colons");
  });

  test("numbers the steps of a procedure", async ({ page }) => {
    await page.goto("/en/docs/format/overview");

    const steps = article(page).locator("ol > li");

    await expect(steps).toHaveCount(2);
    await expect(steps.first()).toContainText("1");
    await expect(steps.last()).toContainText("2");
  });

  test("switches between tabs, with every alternative already in the page", async ({
    page,
    request,
  }) => {
    const html = await (await request.get("/en/docs/format/overview")).text();

    // The panel that is not showing still holds its content in the document.
    expect(html).toMatch(/panel-macOS"[^>]*>[\s\S]{0,600}Cmd/);
    expect(html).toMatch(/panel-Windows"[^>]*>[\s\S]{0,600}Ctrl/);

    await page.goto("/en/docs/format/overview");
    await hydrated(page);

    const panels = article(page).getByRole("tabpanel", { includeHidden: true });

    await expect(panels.first()).toBeVisible();
    await expect(panels.last()).toBeHidden();

    await article(page).getByRole("tab", { name: "Windows" }).click();

    await expect(panels.last()).toBeVisible();
    await expect(panels.first()).toBeHidden();
  });

  test("points a docs link at the language being read", async ({ page }) => {
    await page.goto("/en/docs/format/overview");
    await expect(
      article(page).getByRole("link", { name: "the home page" }),
    ).toHaveAttribute("href", "/en/docs");

    await page.goto("/id/docs/format/overview");
    await expect(
      article(page).getByRole("link", { name: "beranda dokumentasi" }),
    ).toHaveAttribute("href", "/id/docs");
  });

  test("follows the reader down the page in the contents column", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 700 });
    await page.goto("/en/docs/format/overview");
    await hydrated(page);

    const toc = page.getByRole("complementary", { name: "On this page" });

    await article(page)
      .getByRole("heading", { name: "Try it" })
      .scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 600);

    await expect(
      toc
        .getByRole("link", { name: /Try it|Open the editor|Edit the Markdown/ })
        .first(),
    ).toHaveAttribute("data-active", "true");
  });

  test("scrolls a long code line inside its block and not the page", async ({
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

    const scrolls = await article(page)
      .locator("pre")
      .first()
      .evaluate((node) => node.scrollWidth > node.clientWidth);

    expect(scrolls).toBe(true);
  });
});
