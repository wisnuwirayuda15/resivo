import { describe, expect, it } from "vitest";

import { buildSitemap, languageAlternates } from "./sitemap";

describe("buildSitemap", () => {
  it("lists a page once, with every language and an x-default", () => {
    const xml = buildSitemap("https://resivo.test", [
      {
        path: "/en/docs/x",
        alternates: languageAlternates(["x"]),
        defaultLang: "en",
      },
    ]);

    expect(xml).toContain("<loc>https://resivo.test/en/docs/x</loc>");
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="id" href="https://resivo.test/id/docs/x"/>',
    );
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://resivo.test/en/docs/x"/>',
    );
    expect(xml).not.toContain("lastmod");
  });

  it("gives a page with no translations no alternates", () => {
    const xml = buildSitemap("https://resivo.test", [{ path: "/about" }]);

    expect(xml).toContain("<loc>https://resivo.test/about</loc>");
    expect(xml).not.toContain("xhtml:link");
  });

  it("escapes what XML cannot hold", () => {
    expect(buildSitemap("https://a.test", [{ path: "/a?x=1&y=2" }])).toContain(
      "/a?x=1&amp;y=2",
    );
  });
});
