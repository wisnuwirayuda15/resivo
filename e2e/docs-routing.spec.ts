import { expect, test } from "@playwright/test";

/**
 * How a docs address becomes a language.
 *
 * The raw requests use `maxRedirects: 0` because the redirect itself is the
 * thing under test: a crawler follows exactly this response, and its status,
 * target and `Vary` are what decide whether it indexes one page or two.
 */
test.describe("docs routing", () => {
  test("sends a bare /docs address to English with a 307 that varies on the language", async ({
    request,
  }) => {
    const response = await request.get("/docs/format/overview", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe("/en/docs/format/overview");
    expect(response.headers()["vary"]).toContain("Accept-Language");
  });

  test("honours the browser's language list on a document request", async ({
    request,
  }) => {
    const response = await request.get("/docs", {
      headers: { "Accept-Language": "fr, id;q=0.8, en;q=0.4" },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe("/id/docs");
  });

  test("sends a person with Indonesian stored to Indonesian, even when the browser asks for English", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("resivo.language", "id");
    });
    await page.goto("/docs/format/overview");

    await expect(page).toHaveURL("/id/docs/format/overview");
    await expect(
      page.getByRole("heading", { level: 1, name: "Bentuk berkas" }),
    ).toBeVisible();
  });

  test("never rewrites an address that was asked for by name", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("resivo.language", "id");
    });
    await page.goto("/en/docs/format/overview");

    await expect(page).toHaveURL("/en/docs/format/overview");
    await expect(
      page.getByRole("heading", { level: 1, name: "The shape of the file" }),
    ).toBeVisible();
  });

  test("names the language in the server's own markup", async ({ request }) => {
    for (const lang of ["en", "id"]) {
      const html = await (await request.get(`/${lang}/docs`)).text();

      expect(html).toContain(`<html lang="${lang}"`);
    }
  });

  test("opening a shared link does not change the stored language", async ({
    page,
  }) => {
    await page.goto("/id/docs");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("resivo.language"),
    );

    expect(stored).toBeNull();
  });

  test("answers a language the docs lack with a 404 in the docs' own screen", async ({
    page,
  }) => {
    const response = await page.goto("/xx/docs");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByText("That page is not in the documentation"),
    ).toBeVisible();
  });

  test("answers an unknown page with a 404 in the language of the address", async ({
    page,
  }) => {
    const response = await page.goto("/id/docs/tidak-ada");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByText("Halaman itu tidak ada di dokumentasi"),
    ).toBeVisible();
  });
});
