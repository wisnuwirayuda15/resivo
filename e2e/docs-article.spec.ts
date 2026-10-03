import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

/**
 * What an article is made of: highlighted code, the blocks an author can write,
 * links, and the contents column that follows the reader.
 *
 * Each assertion reads a real page that holds the element, and none of them is
 * about that page's words: when a page is rewritten, the assertion moves to
 * whichever page holds the same element. The format overview has the code, the
 * table, the list and a callout; the quick start has the steps; the shortcuts
 * page has the tabs; and the local-first page has the warning.
 */
const hydrated = async (page: Page) => {
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
};

const article = (page: Page) => page.getByRole("article");

const OVERVIEW = "/en/docs/format/overview";

test.describe("docs article", () => {
  test("has one h1, and it is the page title", async ({ page }) => {
    await page.goto(OVERVIEW);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("The shape of the file");
  });

  test("colours a directive in the server's own markup", async ({
    request,
  }) => {
    const html = await (await request.get(OVERVIEW)).text();

    expect(html).toContain('<span class="hljs-keyword">::contact</span>');
  });

  test("draws a code block with its file name and a copy button", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(OVERVIEW);
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
    await page.goto(OVERVIEW);
    await hydrated(page);

    const link = article(page).getByRole("link", {
      name: "What the directives are",
    });

    await expect(link).toHaveAttribute("href", "#directives");
    await link.click();
    await expect(page).toHaveURL(/#directives$/);
  });

  test("renders a Markdown table as a table", async ({ page }) => {
    await page.goto(OVERVIEW);

    const table = article(page).getByRole("table");

    await expect(
      table.getByRole("columnheader", { name: "Directive" }),
    ).toBeVisible();
    // The header, and a row for each of the seven directives.
    await expect(table.getByRole("row")).toHaveCount(8);
  });

  test("renders a list with its markers", async ({ page }) => {
    await page.goto(OVERVIEW);

    const list = article(page).getByRole("list").first();

    expect(await list.getByRole("listitem").count()).toBeGreaterThan(3);
    expect(
      await list.evaluate((node) => getComputedStyle(node).listStyleType),
    ).toBe("disc");
  });

  test("boxes a callout, and keeps its kind", async ({ page }) => {
    await page.goto(OVERVIEW);

    const notes = article(page).getByRole("note");

    await expect(notes).toHaveCount(1);
    await expect(notes.first()).toContainText("Styling is not in the file");

    // A warning is a callout of another kind, in its own colour.
    await page.goto("/en/docs/getting-started/local-first");

    await expect(article(page).getByRole("note")).toContainText(
      "The only copy is on your device",
    );
  });

  test("numbers the steps of a procedure", async ({ page }) => {
    await page.goto("/en/docs/getting-started/quick-start");

    const steps = article(page).locator("ol > li");

    await expect(steps).toHaveCount(5);
    await expect(steps.first()).toContainText("1");
    await expect(steps.last()).toContainText("5");
  });

  test("switches between tabs, with every alternative already in the page", async ({
    page,
    request,
  }) => {
    const shortcuts = "/en/docs/editor/shortcuts-and-palette";
    const html = await (await request.get(shortcuts)).text();

    // The panel that is not showing still holds its content in the document.
    expect(html).toMatch(/panel-macOS"[^>]*>[\s\S]{0,600}Mac/);
    expect(html).toMatch(/panel-Windows"[^>]*>[\s\S]{0,600}Windows and Linux/);

    await page.goto(shortcuts);
    await hydrated(page);

    const panels = article(page).getByRole("tabpanel", { includeHidden: true });

    await expect(panels.first()).toBeVisible();
    await expect(panels.last()).toBeHidden();

    await article(page).getByRole("tab", { name: "macOS" }).click();

    await expect(panels.last()).toBeVisible();
    await expect(panels.first()).toBeHidden();
  });

  test("points a docs link at the language being read", async ({ page }) => {
    await page.goto(OVERVIEW);
    // By address: a docs link is written with no language and has to come out
    // with one, and none may be left that points at the bare `/docs`.
    await expect(
      article(page).locator('a[href="/en/docs/format/contacts"]').first(),
    ).toBeVisible();
    await expect(article(page).locator('a[href^="/docs"]')).toHaveCount(0);

    await page.goto("/id/docs/format/overview");
    await expect(
      article(page).locator('a[href="/id/docs/format/contacts"]').first(),
    ).toBeVisible();
    await expect(article(page).locator('a[href^="/docs"]')).toHaveCount(0);
  });

  test("follows the reader down the page in the contents column", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 700 });
    await page.goto(OVERVIEW);
    await hydrated(page);

    const toc = page.getByRole("complementary", { name: "On this page" });

    await article(page)
      .getByRole("heading", { name: "What the directives are" })
      .scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 600);

    // One heading is the current one, whichever it is at this scroll position.
    await expect(toc.locator('[data-active="true"]')).toHaveCount(1);
  });

  test("scrolls a long code line inside its block and not the page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(OVERVIEW);
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
