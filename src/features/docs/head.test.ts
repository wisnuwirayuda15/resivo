import { describe, expect, it } from "vitest";

import { docsHead } from "./head";

const input = {
  lang: "id" as const,
  slugs: ["format", "overview"],
  title: "Bentuk berkas",
  description: "Satu berkas Markdown.",
  origin: "https://resivo.test",
  crumbs: [
    { name: "Dokumentasi", url: "/id/docs" },
    { name: "Format" },
    { name: "Bentuk berkas", url: "/id/docs/format/overview" },
  ],
};

const meta = (head: ReturnType<typeof docsHead>, key: string) =>
  head.meta.find((tag) => tag.name === key || tag.property === key)?.content;

describe("docsHead", () => {
  it("describes the page in its own language, as an article", () => {
    const head = docsHead(input);

    expect(head.meta[0]).toEqual({ title: "Bentuk berkas | Resivo" });
    expect(meta(head, "description")).toBe("Satu berkas Markdown.");
    expect(meta(head, "robots")).toBe("index, follow");
    expect(meta(head, "og:type")).toBe("article");
    expect(meta(head, "og:locale")).toBe("id_ID");
    expect(meta(head, "og:locale:alternate")).toBe("en_US");
    expect(meta(head, "og:url")).toBe(
      "https://resivo.test/id/docs/format/overview",
    );
    expect(meta(head, "og:image")).toBe("https://resivo.test/og.png");
  });

  it("names the page as canonical and links every language, with x-default", () => {
    const { links } = docsHead(input);

    expect(links).toContainEqual({
      rel: "canonical",
      href: "https://resivo.test/id/docs/format/overview",
    });
    expect(links).toContainEqual({
      rel: "alternate",
      hrefLang: "en",
      href: "https://resivo.test/en/docs/format/overview",
    });
    expect(links).toContainEqual({
      rel: "alternate",
      hrefLang: "id",
      href: "https://resivo.test/id/docs/format/overview",
    });
    expect(links).toContainEqual({
      rel: "alternate",
      hrefLang: "x-default",
      href: "https://resivo.test/en/docs/format/overview",
    });
  });

  it("does not repeat the name on the home page", () => {
    expect(
      docsHead({ ...input, slugs: [], title: "Dokumentasi Resivo" }).meta[0],
    ).toEqual({ title: "Dokumentasi Resivo" });
  });

  it("writes a breadcrumb trail of the crumbs that have an address", () => {
    const [script] = docsHead(input).scripts;
    const data = JSON.parse(script?.children ?? "{}");

    expect(data["@type"]).toBe("BreadcrumbList");
    expect(
      data.itemListElement.map((item: { name: string }) => item.name),
    ).toEqual(["Dokumentasi", "Bentuk berkas"]);
    expect(data.itemListElement[1].item).toBe(
      "https://resivo.test/id/docs/format/overview",
    );
  });

  it("cannot let a title close the script tag", () => {
    const [script] = docsHead({
      ...input,
      crumbs: [
        { name: "Home", url: "/id/docs" },
        { name: "</script><b>", url: "/id/docs/x" },
      ],
    }).scripts;

    expect(script?.children).not.toContain("</script>");
  });

  it("emits no absolute address when the origin is unknown", () => {
    const head = docsHead({ ...input, origin: null });

    expect(head.links).toEqual([]);
    expect(head.scripts).toEqual([]);
    expect(meta(head, "og:url")).toBeUndefined();
    expect(meta(head, "og:image")).toBe("/og.png");
  });
});
