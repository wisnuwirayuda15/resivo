import { describe, expect, it } from "vitest";

import { DOCS_LANGUAGE_SCRIPT } from "./languageScript";

interface Stubs {
  redirectCount: number;
  pathname: string;
  stored: string | null;
  search?: string;
  hash?: string;
}

/** Runs the inlined script against a fake browser and returns where it sent
 * the page, or null if it left it alone. */
const run = ({
  redirectCount,
  pathname,
  stored,
  search = "",
  hash = "",
}: Stubs): string | null => {
  let replaced: string | null = null;
  const performance = {
    getEntriesByType: () => [{ redirectCount }],
  };
  const location = {
    pathname,
    search,
    hash,
    replace: (to: string) => {
      replaced = to;
    },
  };
  const localStorage = { getItem: () => stored };

  new Function("performance", "location", "localStorage", DOCS_LANGUAGE_SCRIPT)(
    performance,
    location,
    localStorage,
  );

  return replaced;
};

describe("DOCS_LANGUAGE_SCRIPT", () => {
  it("moves a redirected visit to the stored language, keeping the rest of the address", () => {
    expect(
      run({
        redirectCount: 1,
        pathname: "/en/docs/format/overview",
        stored: "id",
        search: "?a=1",
        hash: "#shape",
      }),
    ).toBe("/id/docs/format/overview?a=1#shape");
  });

  it("works on the docs home", () => {
    expect(run({ redirectCount: 1, pathname: "/en/docs", stored: "id" })).toBe(
      "/id/docs",
    );
  });

  it("never rewrites an address that was asked for by name", () => {
    expect(
      run({ redirectCount: 0, pathname: "/en/docs/x", stored: "id" }),
    ).toBeNull();
  });

  it("does nothing when the languages already agree, or nothing is stored", () => {
    expect(
      run({ redirectCount: 1, pathname: "/id/docs", stored: "id" }),
    ).toBeNull();
    expect(
      run({ redirectCount: 1, pathname: "/en/docs", stored: null }),
    ).toBeNull();
  });

  it("ignores a stored value that is not a supported language", () => {
    expect(
      run({ redirectCount: 1, pathname: "/en/docs", stored: "xx" }),
    ).toBeNull();
  });

  it("does nothing off the docs", () => {
    expect(
      run({ redirectCount: 1, pathname: "/resumes", stored: "id" }),
    ).toBeNull();
  });

  it("swallows a browser that will not read storage", () => {
    const run2 = () =>
      new Function(
        "performance",
        "location",
        "localStorage",
        DOCS_LANGUAGE_SCRIPT,
      )(
        { getEntriesByType: () => [{ redirectCount: 1 }] },
        { pathname: "/en/docs", search: "", hash: "", replace: () => {} },
        {
          getItem: () => {
            throw new Error("blocked");
          },
        },
      );

    expect(run2).not.toThrow();
  });
});
