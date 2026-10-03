import { expect, test } from "@playwright/test";

import type { APIRequestContext } from "@playwright/test";

/**
 * What a crawler reads from the documentation: its own title and description,
 * a canonical and a link to each translation, a breadcrumb trail, a sitemap
 * that lists every page, and a robots file that points at it.
 *
 * Asserted against the server's own response, not the hydrated page, because
 * that is what a crawler gets before it runs a script.
 */

const head = async (request: APIRequestContext, path: string) =>
  (await request.get(path)).text();

const attribute = (html: string, pattern: RegExp): string | undefined =>
  pattern.exec(html)?.[1];

test.describe("docs SEO", () => {
  test("a page has its own title, description and canonical", async ({
    request,
  }) => {
    const html = await head(request, "/en/docs/format/overview");

    expect(html).toContain("<title>The shape of the file | Resivo</title>");
    expect(html).toContain(
      '<meta name="description" content="A resume is one Markdown file',
    );
    expect(html).toContain('<meta name="robots" content="index, follow"/>');
    expect(html).toContain('<meta property="og:type" content="article"/>');
    expect(html).toContain('<meta property="og:locale" content="en_US"/>');
    expect(attribute(html, /<link rel="canonical" href="([^"]+)"/)).toMatch(
      /^https?:\/\/[^/]+\/en\/docs\/format\/overview$/,
    );
  });

  test("each page links every translation, and x-default is English", async ({
    request,
  }) => {
    const html = await head(request, "/id/docs/format/overview");

    for (const [lang, path] of [
      ["en", "/en/docs/format/overview"],
      ["id", "/id/docs/format/overview"],
      ["x-default", "/en/docs/format/overview"],
    ]) {
      expect(html, lang).toMatch(
        new RegExp(
          `<link[^>]*hrefLang="${lang}"[^>]*href="https?://[^/"]+${path}"|<link[^>]*href="https?://[^/"]+${path}"[^>]*hrefLang="${lang}"`,
        ),
      );
    }

    expect(html).toContain('<meta property="og:locale" content="id_ID"/>');
    expect(html).toContain('<html lang="id"');
  });

  test("a page in a folder carries a breadcrumb trail as structured data", async ({
    request,
  }) => {
    const html = await head(request, "/en/docs/format/overview");
    const raw = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(
      html,
    )?.[1];
    const data = JSON.parse(raw ?? "{}");

    expect(data["@type"]).toBe("BreadcrumbList");
    expect(
      data.itemListElement.map((item: { name: string }) => item.name),
    ).toEqual(["Documentation", "The shape of the file"]);
  });

  test("the sitemap lists every page once, in both languages, with alternates", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    const xml = await response.text();

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/xml");

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1] ?? "",
    );

    for (const path of ["/", "/templates", "/about"]) {
      expect(locs.some((loc) => new URL(loc).pathname === path)).toBe(true);
    }

    expect(new Set(locs).size).toBe(locs.length);
    expect(xml).toContain('hreflang="x-default"');

    // Every address it lists is a page that exists.
    for (const loc of locs) {
      const url = new URL(loc);

      expect((await request.get(url.pathname)).status(), loc).toBe(200);
    }

    // Both languages are present for the docs home.
    expect(locs.map((loc) => new URL(loc).pathname)).toEqual(
      expect.arrayContaining(["/en/docs", "/id/docs"]),
    );
  });

  test("the app's own routes stay out of the sitemap", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();

    // By whole path: a docs page may be named like an app route, and
    // `/en/docs/help/settings` is not `/settings`.
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => new URL(match[1] ?? "").pathname,
    );

    for (const path of [
      "/resumes",
      "/archive",
      "/images",
      "/fonts",
      "/settings",
    ]) {
      expect(paths).not.toContain(path);
    }
  });

  test("robots.txt names the sitemap by its absolute address", async ({
    request,
  }) => {
    const body = await (await request.get("/robots.txt")).text();

    expect(body).toMatch(/^Sitemap: https?:\/\/[^/\s]+\/sitemap\.xml$/m);
    expect(body).not.toMatch(/Disallow: \/(?:en|id|docs)/);
  });
});
