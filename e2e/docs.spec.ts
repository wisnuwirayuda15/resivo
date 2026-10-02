import { expect, test } from "@playwright/test";

/**
 * The docs pipeline, from the outside.
 *
 * Scripts are off in the first test on purpose: a documentation page is read by
 * crawlers and by people on a bad connection before (or without) hydration, so
 * the article has to be in the document the server sends, not assembled by the
 * browser afterwards.
 */
test.describe("docs", () => {
  test("serves a page with its article in the document, before any script runs", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const response = await page.goto("/en/docs/format/overview");

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "The shape of the file" }),
    ).toBeVisible();
    await expect(page.getByText("Ada Lovelace").first()).toBeVisible();

    await context.close();
  });

  test("serves the same page in Indonesian from its own URL", async ({
    page,
  }) => {
    await page.goto("/id/docs/format/overview");

    await expect(
      page.getByRole("heading", { level: 1, name: "Bentuk berkas" }),
    ).toBeVisible();
  });

  test("serves the docs home for each language", async ({ request }) => {
    for (const lang of ["en", "id"]) {
      const response = await request.get(`/${lang}/docs`);

      expect(response.status()).toBe(200);
    }
  });

  test("answers an unknown page or language with a 404", async ({
    request,
  }) => {
    expect((await request.get("/en/docs/nope")).status()).toBe(404);
    expect((await request.get("/xx/docs")).status()).toBe(404);
  });
});
