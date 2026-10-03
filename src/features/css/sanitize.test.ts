import { describe, expect, it } from "vitest";

import { sanitizeCss } from "./sanitize";

/**
 * The sanitizer is a boundary, so these tests are mostly adversarial: each one
 * is an attempt to get something past it. The two properties that matter are
 * that nothing forbidden survives, and that the output's braces balance, the
 * second because the caller wraps this text in `@layer custom { … }`, and an
 * early `}` would drop the rest into the unlayered origin, above the page
 * geometry.
 */

/**
 * Net brace depth, counting only braces a CSS parser would act on.
 *
 * String-aware because the browser is: a `}` inside `content: "}"` does not
 * close a block, so counting it would fail a sheet that is in fact safe.
 */
const braces = (css: string): number => {
  let depth = 0;
  let quote = "";

  for (let at = 0; at < css.length; at += 1) {
    const character = css[at];

    if (quote !== "") {
      // '\u005C' rather than a literal backslash: the escape reads the same to
      // TypeScript and leaves no ambiguity for anything else reading this file.
      if (character === "\u005C") {
        at += 1;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
    }
  }

  return depth;
};

describe("what is allowed through", () => {
  it("keeps an ordinary rule", () => {
    const { css, warnings } = sanitizeCss(".rp-name { color: red; }");

    expect(css).toBe(".rp-name { color: red }");
    expect(warnings).toEqual([]);
  });

  it("keeps several declarations and several rules", () => {
    const { css } = sanitizeCss(`
      .rp-name { color: red; font-size: 30pt }
      .rp-section-title { letter-spacing: 0 }
    `);

    expect(css).toBe(
      ".rp-name { color: red; font-size: 30pt }\n.rp-section-title { letter-spacing: 0 }",
    );
  });

  it("keeps a media query and its contents", () => {
    const { css } = sanitizeCss("@media print { .rp-name { color: #000 } }");

    expect(css).toBe("@media print { .rp-name { color: #000 } }");
  });

  it("keeps keyframes and a font-face with a data URL", () => {
    const { css, warnings } = sanitizeCss(`
      @keyframes pulse { from { opacity: 0 } to { opacity: 1 } }
      @font-face { font-family: Local; src: url(data:font/woff2;base64,AAA) }
    `);

    expect(css).toContain("@keyframes pulse");
    expect(css).toContain("data:font/woff2");
    expect(warnings).toEqual([]);
  });

  it("keeps a semicolon inside a url()", () => {
    const { css, warnings } = sanitizeCss(
      '.a { background: url("data:image/svg+xml;utf8,<svg/>") }',
    );

    expect(css).toContain("data:image/svg+xml;utf8");
    expect(warnings).toEqual([]);
  });

  it("drops comments", () => {
    const { css } = sanitizeCss("/* note */ .a { color: red /* why */ }");

    expect(css).toBe(".a { color: red }");
  });

  it("keeps a custom property", () => {
    const { css } = sanitizeCss(":root { --paper-accent: #123456 }");

    expect(css).toBe(":root { --paper-accent: #123456 }");
  });
});

describe("network access", () => {
  it.each([
    ["@import url(https://fonts.example/x.css);", "import"],
    ["@import 'https://fonts.example/x.css';", "import"],
  ])("refuses %s", (source) => {
    const { css, warnings } = sanitizeCss(source);

    expect(css).toBe("");
    expect(warnings[0]?.message).toContain("@import");
  });

  it("refuses a remote url() in a declaration", () => {
    const { css, warnings } = sanitizeCss(
      ".a { background: url(https://tracker.example/p.gif) }",
    );

    expect(css).toBe("");
    expect(warnings[0]?.message).toContain("data:");
  });

  it("refuses a protocol-relative url()", () => {
    const { css } = sanitizeCss(
      ".a { background: url(//tracker.example/p.gif) }",
    );

    expect(css).toBe("");
  });

  it("refuses a bare relative url(), which would reach the app assets", () => {
    const { css } = sanitizeCss(".a { background: url(../assets/logo.png) }");

    expect(css).toBe("");
  });

  it("refuses a remote url() inside an at-rule prelude", () => {
    const { css, warnings } = sanitizeCss(
      "@font-face { src: url(https://f.example/a.woff2) }",
    );

    expect(css).toBe("");
    expect(warnings).toHaveLength(1);
  });

  it("keeps the rest of the sheet when one declaration is refused", () => {
    const { css } = sanitizeCss(
      ".a { color: red; background: url(https://x.example/p.gif); font-size: 9pt }",
    );

    expect(css).toBe(".a { color: red; font-size: 9pt }");
  });
});

describe("page and layout integrity", () => {
  it("refuses @page, which the Style panel owns", () => {
    const { css, warnings } = sanitizeCss("@page { size: A3; margin: 0 }");

    expect(css).toBe("");
    expect(warnings[0]?.message).toContain("@page");
  });

  it("refuses @layer, so custom CSS cannot re-order the layers", () => {
    const { css, warnings } = sanitizeCss("@layer reset { .a { color: red } }");

    expect(css).toBe("");
    expect(warnings[0]?.message).toContain("@layer");
  });

  it.each(["fixed", "sticky", "FIXED"])("refuses position: %s", (value) => {
    const { css, warnings } = sanitizeCss(`.a { position: ${value} }`);

    expect(css).toBe("");
    expect(warnings[0]?.message).toContain("page");
  });

  it("keeps the positions that stay inside the page", () => {
    const { css } = sanitizeCss(
      ".a { position: relative } .b { position: absolute }",
    );

    expect(css).toContain("position: relative");
    expect(css).toContain("position: absolute");
  });
});

describe("script routes", () => {
  it.each([
    [".a { width: expression(alert(1)) }", "script"],
    [".a { behavior: url(x.htc) }", "script"],
    [".a { -moz-binding: url(x.xml) }", "script"],
    ['.a { background: url("javascript:alert(1)") }', ""],
  ])("refuses %s", (source) => {
    const { css } = sanitizeCss(source);

    expect(css).toBe("");
  });
});

describe("breaking out of the layer", () => {
  it("balances the output when the input has an extra brace", () => {
    const { css, warnings } = sanitizeCss(
      ".a { color: red } } .escaped { position: fixed }",
    );

    expect(braces(css)).toBe(0);
    // The diagnostic comes from the strict parser, which names the character it
    // did not expect and where it was.
    expect(warnings.some((w) => w.message.includes("}"))).toBe(true);
    expect(css).not.toContain("fixed");
  });

  /**
   * A stray brace is a typo, not an attack, and discarding the rest of someone's
   * stylesheet over one would be hostile, a browser keeps going too. What the
   * balancing guarantees is that the recovered rules stay *inside* `@layer
   * custom`, not that they are thrown away.
   */
  it("keeps the rules after a stray brace, inside the layer", () => {
    const { css } = sanitizeCss(".a { color: red } } .after { color: blue }");

    expect(css).toContain(".after { color: blue }");
    expect(braces(css)).toBe(0);
  });

  it("balances the output when a block is left open", () => {
    const { css } = sanitizeCss(".a { color: red");

    expect(braces(css)).toBe(0);
    expect(css).toBe(".a { color: red }");
  });

  it("is not fooled by a brace inside a string", () => {
    const { css } = sanitizeCss(
      '.a::after { content: "}" ; color: red } .b { color: blue }',
    );

    expect(braces(css)).toBe(0);
    expect(css).toContain(".b { color: blue }");
  });

  it("is not fooled by a brace inside a comment", () => {
    const { css } = sanitizeCss("/* } */ .a { color: red } .b { color: blue }");

    expect(braces(css)).toBe(0);
    expect(css).toContain(".a { color: red }");
    expect(css).toContain(".b { color: blue }");
  });

  it("always emits balanced braces, whatever it is given", () => {
    const nasty = [
      "}}}}",
      "{{{{",
      ".a { .b { .c { color: red",
      "@media print { .a { color: red",
      '.a { content: "\\"} " } .b { color: red }',
      "@import",
      "",
      "   ",
    ];

    for (const source of nasty) {
      expect(braces(sanitizeCss(source).css)).toBe(0);
    }
  });
});

describe("reporting", () => {
  it("points at the line the problem is on", () => {
    const { warnings } = sanitizeCss(
      ".a { color: red }\n\n@import url(data:text/css,x);\n",
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.line).toBe(3);
    expect(warnings[0]?.column).toBe(1);
  });

  it("reports a declaration with no colon, and where it is", () => {
    const { css, warnings } = sanitizeCss(".a { color red }");

    expect(css).toBe("");
    // The parser's own diagnostic: it names the word it could not read and
    // points at the column, which is more use than "this is not a declaration".
    expect(warnings[0]?.message).toContain("color");
    expect(warnings[0]?.line).toBe(1);
    expect(warnings[0]?.column).toBe(6);
  });

  it("reports a declaration with no value", () => {
    const { css, warnings } = sanitizeCss(".a { color: ; font-size: 9pt }");

    // The rest of the block survives, one broken declaration is a typo, not a
    // reason to drop the rule around it.
    expect(css).toBe(".a { font-size: 9pt }");
    expect(warnings[0]?.message).toContain("property: value");
  });

  it("reports an unsupported at-rule by name", () => {
    const { warnings } = sanitizeCss("@nonsense { .a { color: red } }");

    expect(warnings[0]?.message).toContain("@nonsense");
  });

  it("removes !important and says so, keeping the declaration", () => {
    const { css, warnings } = sanitizeCss(
      ".rp-figure { width: 10% !important; }",
    );

    expect(css).toBe(".rp-figure { width: 10% }");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain("!important");
    expect(warnings[0]?.line).toBe(1);
    expect(warnings[0]?.column).toBe(14);
  });

  it("removes !important inside @media and points at its line", () => {
    const { css, warnings } = sanitizeCss(
      "@media print {\n  .a { color: red !important; font-size: 9pt }\n}",
    );

    expect(css).toBe("@media print { .a { color: red; font-size: 9pt } }");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain("!important");
    expect(warnings[0]?.line).toBe(2);
  });

  it("says nothing about valid CSS", () => {
    const { warnings } = sanitizeCss(
      "@media (min-width: 10px) { .a { color: red; --x: 1 } }",
    );

    expect(warnings).toEqual([]);
  });
});
