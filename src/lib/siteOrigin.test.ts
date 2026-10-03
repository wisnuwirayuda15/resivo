import { describe, expect, it } from "vitest";

import { resolveSiteOrigin } from "./siteOrigin";

describe("resolveSiteOrigin", () => {
  it("prefers SITE_URL, reduced to its origin", () => {
    expect(
      resolveSiteOrigin("https://resivo.app/some/path/", "http://10.0.0.5/x"),
    ).toBe("https://resivo.app");
  });

  it("falls back to the request's origin", () => {
    expect(resolveSiteOrigin(undefined, "http://localhost:3000/en/docs")).toBe(
      "http://localhost:3000",
    );
    expect(resolveSiteOrigin("  ", "http://localhost:3000/a")).toBe(
      "http://localhost:3000",
    );
  });

  it("ignores a SITE_URL that is not an http(s) URL", () => {
    expect(resolveSiteOrigin("resivo.app", "http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
    expect(resolveSiteOrigin("javascript:alert(1)", undefined)).toBeNull();
  });

  it("returns null when there is nothing to go on", () => {
    expect(resolveSiteOrigin(undefined, undefined)).toBeNull();
  });
});
