import { describe, expect, it } from "vitest";

import { TEMPLATE_IDS } from "@/features/resume/model/document";

import { designMatchesTemplate, templateDefaults } from "./defaults";
import { resolveTemplate, templateLayerCss } from "./registry";

describe("template registry", () => {
  it("resolves every registered id to a full component set", () => {
    for (const id of TEMPLATE_IDS) {
      const template = resolveTemplate(id);

      expect(template.id).toBe(id);
      expect(template.version).toBeGreaterThan(0);
      expect(typeof template.components.Header).toBe("function");
      expect(typeof template.components.SectionHeading).toBe("function");
      expect(typeof template.components.Block).toBe("function");
    }
  });

  /**
   * The whole registry shares one stylesheet, so a delta written without its
   * `[data-template=...]` scope would restyle every template at once, and
   * because the paginator measures what these rules produce, it would move page
   * breaks in resumes the author never opened.
   */
  it("scopes every template delta to its own template attribute", () => {
    for (const id of TEMPLATE_IDS) {
      const css = templateLayerCss(id);
      const others = TEMPLATE_IDS.filter((other) => other !== id);

      for (const other of others) {
        // `paper.css` declares a token scope for every template, so the other
        // ids legitimately appear. What must not appear is a rule from another
        // template's delta, those all carry `.rp-` element selectors.
        expect(css).not.toMatch(
          new RegExp(`\\[data-template='${other}'\\] \\.rp-`),
        );
      }
    }
  });

  it("includes the shared paper tokens and element styles in every template", () => {
    for (const id of TEMPLATE_IDS) {
      const css = templateLayerCss(id);

      expect(css).toContain("--paper-ink");
      expect(css).toContain(".rp-section-title");
    }
  });
});

describe("designMatchesTemplate", () => {
  it("recognises a freshly seeded design", () => {
    for (const id of TEMPLATE_IDS) {
      expect(designMatchesTemplate(templateDefaults(id), id)).toBe(true);
    }
  });

  it("survives a JSON round trip, so key order does not count as an edit", () => {
    const stored: unknown = JSON.parse(
      JSON.stringify(templateDefaults("modern")),
    );

    expect(
      designMatchesTemplate(
        stored as ReturnType<typeof templateDefaults>,
        "modern",
      ),
    ).toBe(true);
  });

  it("reports a changed token", () => {
    const design = templateDefaults("classic");
    design.colors.accent = "#123456";

    expect(designMatchesTemplate(design, "classic")).toBe(false);
  });

  it("does not count the paper size as a style customisation", () => {
    const design = templateDefaults("classic");
    design.paper.size = "A4";

    expect(designMatchesTemplate(design, "classic")).toBe(true);
  });

  it("does count a margin change", () => {
    const design = templateDefaults("classic");
    design.paper.margin.left = 1;

    expect(designMatchesTemplate(design, "classic")).toBe(false);
  });

  it("reports a design seeded from a different template", () => {
    expect(
      designMatchesTemplate(templateDefaults("editorial"), "classic"),
    ).toBe(false);
  });
});
