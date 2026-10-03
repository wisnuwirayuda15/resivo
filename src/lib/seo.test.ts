import { describe, expect, it } from "vitest";

import { OG_IMAGE, seo, seoLinks } from "./seo";

const find = (tags: ReturnType<typeof seo>, key: string) =>
  tags.find((tag) => tag.name === key || tag.property === key)?.content;

describe("seo", () => {
  it("is unchanged for a page that says nothing about an origin", () => {
    const tags = seo({ title: "T" });

    expect(find(tags, "og:type")).toBe("website");
    expect(find(tags, "og:image")).toBe(OG_IMAGE);
    expect(find(tags, "twitter:image")).toBe(OG_IMAGE);
    expect(find(tags, "og:url")).toBeUndefined();
    expect(find(tags, "og:locale")).toBeUndefined();
  });

  it("makes the card and the url absolute once an origin is known", () => {
    const tags = seo({
      title: "T",
      origin: "https://a.test",
      path: "/en/docs/x",
    });

    expect(find(tags, "og:url")).toBe("https://a.test/en/docs/x");
    expect(find(tags, "og:image")).toBe("https://a.test/og.png");
    expect(find(tags, "twitter:image")).toBe("https://a.test/og.png");
  });

  it("does not claim a url from an origin alone", () => {
    expect(find(seo({ title: "T", origin: "https://a.test" }), "og:url")).toBe(
      undefined,
    );
  });

  it("keeps the noindex rule for the app's own routes", () => {
    expect(find(seo({ title: "T", indexable: false }), "robots")).toBe(
      "noindex, nofollow, noimageindex",
    );
  });
});

describe("seoLinks", () => {
  const alternates = [
    { lang: "en", path: "/en/docs/x" },
    { lang: "id", path: "/id/docs/x" },
  ];

  it("emits nothing without an origin, rather than a relative guess", () => {
    expect(seoLinks({ origin: null, path: "/en/docs/x", alternates })).toEqual(
      [],
    );
  });

  it("emits a canonical, each language, and x-default", () => {
    const links = seoLinks({
      origin: "https://a.test",
      path: "/id/docs/x",
      alternates,
      defaultLang: "en",
    });

    expect(links).toEqual([
      { rel: "canonical", href: "https://a.test/id/docs/x" },
      { rel: "alternate", hrefLang: "en", href: "https://a.test/en/docs/x" },
      { rel: "alternate", hrefLang: "id", href: "https://a.test/id/docs/x" },
      {
        rel: "alternate",
        hrefLang: "x-default",
        href: "https://a.test/en/docs/x",
      },
    ]);
  });

  it("gives a page with no translations a canonical only", () => {
    expect(seoLinks({ origin: "https://a.test", path: "/about" })).toEqual([
      { rel: "canonical", href: "https://a.test/about" },
    ]);
  });
});
