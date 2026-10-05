import { describe, expect, it } from "vitest";

import { templateDefaults } from "@/features/templates/defaults";

import { LAYER_ORDER, designVars, pageRule, previewStylesheet } from "./css";

import type { DesignConfig } from "@/features/resume/model/document";

/**
 * The stylesheet is text, so it is testable as text, which is the point of
 * building it in a pure function rather than mutating style rules in place.
 *
 * Two things are being protected here: the derived type ramp (change it and every
 * existing resume reflows), and the value guards, which are the last thing
 * standing between a stored document and injected CSS.
 */

const design = (patch: (config: DesignConfig) => void = () => {}) => {
  const config = templateDefaults("classic");

  patch(config);

  return config;
};

/** Reads one declaration back out of a generated rule block. */
const varValue = (css: string, name: string): string | undefined =>
  new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1];

describe("pageRule", () => {
  it("sizes the printed page and leaves the margin to the page padding", () => {
    // A non-zero `@page` margin would shrink the printed content area below the
    // one the paginator measured, which is exactly how print stops matching
    // preview.
    expect(pageRule("Letter")).toBe("@page { size: 8.5in 11in; margin: 0; }");
    expect(pageRule("A4")).toBe("@page { size: 210mm 297mm; margin: 0; }");
  });
});

describe("designVars", () => {
  it("derives the whole type ramp from the body size and the scale", () => {
    const css = designVars(design());

    // 10.5pt body at a 1.2 scale, four steps up, is the design system's 22pt
    // name. If this drifts, every resume's first line changes size.
    expect(varValue(css, "--paper-fs-body")).toBe("10.5pt");
    expect(varValue(css, "--paper-fs-name")).toBe("21.77pt");
    expect(varValue(css, "--paper-fs-section")).toBe("12.6pt");
  });

  it("puts the editorial template at its specified 26pt name", () => {
    const css = designVars(templateDefaults("editorial"));

    expect(varValue(css, "--paper-fs-name")).toBe("26.05pt");
  });

  it("emits the page box for the chosen paper size", () => {
    const css = designVars(design((config) => (config.paper.size = "A4")));

    expect(varValue(css, "--paper-w")).toBe("210mm");
    expect(varValue(css, "--paper-h")).toBe("297mm");
  });

  it("maps a bundled family to its variable so it keeps its fallbacks", () => {
    const css = designVars(design());

    expect(varValue(css, "--paper-font-body")).toBe("var(--font-serif)");
  });

  it("falls back to the body font when no heading font is set", () => {
    const css = designVars(
      design((config) => delete config.typography.headingFont),
    );

    expect(varValue(css, "--paper-font-head")).toBe("var(--font-serif)");
  });

  it("quotes an uploaded family and strips what could close the declaration", () => {
    const css = designVars(
      design((config) => {
        config.typography.bodyFont = {
          family: "My; } body { display: none } Font",
          source: "custom",
          fontId: "f1",
        };
      }),
    );

    const value = varValue(css, "--paper-font-body") ?? "";

    // The name survives as a quoted string; everything that could terminate the
    // declaration or open a new rule is gone.
    expect(value).toMatch(/^'[^'"\\;{}<>]*', var\(--font-serif\)$/);
    expect(value).toContain("Font");
    // One rule block in, one rule block out, the injected `}` did not survive.
    expect(css.match(/}/g)).toHaveLength(1);
  });

  it("rejects a colour that is not a colour rather than emitting it", () => {
    const css = designVars(
      design((config) => {
        config.colors.accent = "red; } body { background: url(http://x) } .a {";
      }),
    );

    // Falls back to the template default. A wrong colour is a visible bug the
    // user can report; an injected rule is not.
    expect(varValue(css, "--paper-accent")).toBe("#0e7c76");
    expect(css).not.toContain("url(");
  });

  it("accepts the colour syntaxes a real style panel produces", () => {
    const css = designVars(
      design((config) => {
        config.colors.text = "rgb(26 26 24 / 90%)";
        config.colors.heading = "oklch(0.3 0.02 120)";
        config.colors.muted = "#55554E";
        config.colors.rule = "transparent";
      }),
    );

    expect(varValue(css, "--paper-ink")).toBe("rgb(26 26 24 / 90%)");
    expect(varValue(css, "--paper-heading")).toBe("oklch(0.3 0.02 120)");
    expect(varValue(css, "--paper-ink-muted")).toBe("#55554E");
    expect(varValue(css, "--paper-rule")).toBe("transparent");
  });

  it("clamps a nonsensical number instead of emitting it", () => {
    const css = designVars(
      design((config) => {
        config.typography.baseSize = 4000;
        config.paper.margin.left = -12;
      }),
    );

    expect(varValue(css, "--paper-fs-body")).toBe("24pt");
    expect(varValue(css, "--paper-margin-left")).toBe("0in");
  });

  it("substitutes the default for a value that is not a number at all", () => {
    const css = designVars(
      design((config) => (config.typography.lineHeight = Number.NaN)),
    );

    expect(varValue(css, "--paper-lh")).toBe("1.42");
  });

  it("zeroes the rule width when dividers are off", () => {
    // Omitting the element is the renderer's job; this stops a template that
    // draws its own rule from leaving a hairline behind.
    const css = designVars(
      design((config) => (config.rules.showDividers = false)),
    );

    expect(varValue(css, "--paper-rule-w")).toBe("0px");
  });

  it("translates the avatar shape into a radius", () => {
    expect(
      varValue(
        designVars(design((config) => (config.image.avatarShape = "square"))),
        "--paper-avatar-radius",
      ),
    ).toBe("0");
  });
});

describe("designVars, text", () => {
  it("writes neither variable until the document sets them", () => {
    // An unset alignment has to stay unset, or it would override a template that
    // sets its own.
    const css = designVars(design());

    expect(css).not.toContain("--paper-text-align");
    expect(css).not.toContain("--paper-tag-sep");
  });

  it("writes the alignment, and refuses a value it does not know", () => {
    expect(
      varValue(
        designVars(design((config) => (config.text = { align: "justify" }))),
        "--paper-text-align",
      ),
    ).toBe("justify");

    const stored = design((config) => {
      config.text = { align: "x; color: red" as never };
    });

    expect(designVars(stored)).not.toContain("--paper-text-align");
  });

  it("writes the separator as a string literal that cannot end itself", () => {
    const value = (separator: string) =>
      varValue(
        designVars(
          design((config) => (config.text = { tagSeparator: separator })),
        ),
        "--paper-tag-sep",
      );

    expect(value("/")).toBe('"/"');
    // Empty is a choice (a gap and no mark), not the same as unset.
    expect(value("")).toBe('""');
    expect(value('";}body{')).toBe('"body"');
    expect(value("abcdefghijkl")).toBe('"abcdefgh"');
  });
});

describe("previewStylesheet", () => {
  const css = previewStylesheet({
    templateId: "classic",
    design: design(),
  });

  it("declares the layer order before any layer is used", () => {
    // A layer used before it is declared sorts itself by first appearance, which
    // would silently reverse the precedence this whole design depends on.
    expect(css.startsWith(LAYER_ORDER)).toBe(true);
    expect(css.indexOf("@layer reset {")).toBeGreaterThan(0);
  });

  it("includes the paper tokens, the shared element styles and the template", () => {
    // Proves the raw CSS imports actually resolve, a broken one would leave the
    // paper unstyled but the app perfectly fine, which is a nasty thing to
    // discover late.
    expect(css).toContain("--paper-accent: #0e7c76");
    expect(css).toContain(".rp-section-title");
    expect(css).toContain("[data-template='classic'] .rp-header");
  });

  it("puts the document tokens in a layer above the template", () => {
    expect(css.lastIndexOf("@layer template {")).toBeLessThan(
      css.indexOf("@layer tokens {"),
    );
  });

  it("leaves the page geometry unlayered, so custom CSS cannot resize the page", () => {
    const geometry = css.indexOf(".rp-page {");

    expect(geometry).toBeGreaterThan(-1);
    expect(geometry).toBeLessThan(css.indexOf("@layer template {"));
  });

  it("declares the custom layer but emits nothing into it", () => {
    // The user's CSS lands here in phase 8, together with the sanitizer that has
    // to run first. Declaring the layer now fixes its precedence; filling it
    // before the sanitizer exists would be shipping the hole first.
    expect(LAYER_ORDER).toContain("custom");
    expect(css).not.toContain("@layer custom {");
  });
});
