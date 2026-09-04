import { describe, expect, it } from "vitest";

import { fontFaceCss } from "./fontFaces";

import type { FontSummary } from "@/database/repositories/fonts";

const font = (overrides: Partial<FontSummary> = {}): FontSummary => ({
  id: "f1",
  family: "Test Face",
  weight: 400,
  style: "normal",
  format: "woff2",
  size: 1000,
  createdAt: 0,
  ...overrides,
});

describe("fontFaceCss", () => {
  it("declares a face with the family, url, weight and style", () => {
    const css = fontFaceCss([{ font: font(), url: "blob:x" }]);

    expect(css).toContain("font-family: 'Test Face'");
    expect(css).toContain("url(blob:x)");
    expect(css).toContain("font-weight: 400");
    expect(css).toContain("font-style: normal");
  });

  /** A wrong `format()` is not ignored (the browser refuses the face), so each
   * stored format has to map to the hint CSS actually expects. */
  it.each([
    ["woff2", "woff2"],
    ["woff", "woff"],
    ["ttf", "truetype"],
    ["otf", "opentype"],
  ] as const)("maps %s to the %s hint", (format, hint) => {
    expect(fontFaceCss([{ font: font({ format }), url: "u" }])).toContain(
      `format('${hint}')`,
    );
  });

  /**
   * `block`, not `swap`. The paper is measured before it is paginated, and a face
   * swapping in afterwards changes every line height and therefore every page
   * break.
   */
  it("blocks rather than swaps", () => {
    expect(fontFaceCss([{ font: font(), url: "u" }])).toContain(
      "font-display: block",
    );
  });

  it("emits one rule per source", () => {
    const css = fontFaceCss([
      { font: font({ id: "a" }), url: "a" },
      { font: font({ id: "b", weight: 700 }), url: "b" },
    ]);

    expect(css.match(/@font-face/g)).toHaveLength(2);
  });

  it("is empty for no sources", () => {
    expect(fontFaceCss([])).toBe("");
  });

  /**
   * The family is the one part of this rule that came from a file name the user
   * chose, and it is emitted inside quotes. A stray quote or brace would end the
   * declaration early and let whatever followed be read as CSS.
   */
  it("strips the characters that could end the rule", () => {
    const css = fontFaceCss([
      {
        font: font({
          family: "Evil'; } body { display: none } @font-face { x:",
        }),
        url: "u",
      },
    ]);

    // One rule, and one declaration block. The words from the attack survive as
    // inert text inside the quoted family, which is correct, and the point:
    // nothing can leave the quotes, so nothing is ever parsed as CSS.
    expect(css.match(/\{/g)).toHaveLength(1);
    expect(css.match(/\}/g)).toHaveLength(1);

    const family = /font-family: '([^']*)'/.exec(css)?.[1] ?? "";

    expect(family).not.toMatch(/["'{};]/);
  });

  it("drops a face whose family is nothing but stripped characters", () => {
    expect(fontFaceCss([{ font: font({ family: "{{}}" }), url: "u" }])).toBe(
      "",
    );
  });

  it("clamps an impossible weight rather than emitting it", () => {
    expect(fontFaceCss([{ font: font({ weight: 0 }), url: "u" }])).toContain(
      "font-weight: 1",
    );
    expect(fontFaceCss([{ font: font({ weight: 5000 }), url: "u" }])).toContain(
      "font-weight: 1000",
    );
  });
});
