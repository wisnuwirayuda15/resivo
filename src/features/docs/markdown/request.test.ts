import { describe, expect, it } from "vitest";

import { markdownRequestFor } from "./request";

const ask = (path: string, accept?: string) =>
  markdownRequestFor(
    new Request(`https://resivo.test${path}`, {
      headers: accept === undefined ? {} : { accept },
    }),
  );

describe("markdownRequestFor", () => {
  it("answers the .md address whatever the browser asks for", () => {
    expect(ask("/en/docs/format/overview.md", "text/html")).toEqual({
      lang: "en",
      slugs: ["format", "overview"],
    });
  });

  it("answers the normal address when Markdown is preferred", () => {
    expect(ask("/en/docs/format/overview", "text/markdown")).toEqual({
      lang: "en",
      slugs: ["format", "overview"],
    });
    expect(ask("/id/docs", "text/markdown, text/html;q=0.5")).toEqual({
      lang: "id",
      slugs: [],
    });
  });

  it("leaves a browser alone", () => {
    expect(
      ask(
        "/en/docs/format/overview",
        "text/html,application/xhtml+xml,*/*;q=0.8",
      ),
    ).toBeNull();
    expect(ask("/en/docs/format/overview")).toBeNull();
    expect(ask("/en/docs/format/overview", "*/*")).toBeNull();
  });

  it("ignores a path outside the docs, whatever is asked", () => {
    expect(ask("/en/templates", "text/markdown")).toBeNull();
    expect(ask("/api/search/en", "text/markdown")).toBeNull();
  });
});
