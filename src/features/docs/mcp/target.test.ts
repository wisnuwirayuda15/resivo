import { describe, expect, it } from "vitest";

import { docsTarget } from "./target";

const overview = { lang: "en", slugs: ["format", "overview"] };

describe("docsTarget", () => {
  it("reads the .md address, the HTML address, with or without an origin", () => {
    expect(docsTarget("/en/docs/format/overview.md")).toEqual(overview);
    expect(docsTarget("/en/docs/format/overview")).toEqual(overview);
    expect(
      docsTarget("https://resivo.test/en/docs/format/overview.md"),
    ).toEqual(overview);
    expect(docsTarget("  /en/docs/format/overview  ")).toEqual(overview);
  });

  it("ignores a hash and a query", () => {
    expect(docsTarget("/en/docs/format/overview.md#sections")).toEqual(
      overview,
    );
    expect(docsTarget("/en/docs/format/overview?x=1")).toEqual(overview);
  });

  it("reads the home, however it is spelled", () => {
    expect(docsTarget("/id/docs")).toEqual({ lang: "id", slugs: [] });
    expect(docsTarget("/id/docs/index.md")).toEqual({ lang: "id", slugs: [] });
  });

  it("returns null for what is not a docs address", () => {
    expect(docsTarget("/templates")).toBeNull();
    expect(docsTarget("")).toBeNull();
    expect(docsTarget("https://")).toBeNull();
  });
});
