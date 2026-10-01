import { describe, expect, it } from "vitest";

import { contrastOnPaper, parseColor } from "./contrast";

describe("parseColor", () => {
  it("reads hex in every length", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("#1a1a18")).toEqual({ r: 26, g: 26, b: 24, a: 1 });
    expect(parseColor("#00000080")?.a).toBeCloseTo(0.5, 1);
    expect(parseColor("#0008")?.a).toBeCloseTo(0.53, 1);
  });

  it("reads rgb in the comma and the space forms", () => {
    expect(parseColor("rgb(26, 26, 24)")).toEqual({
      r: 26,
      g: 26,
      b: 24,
      a: 1,
    });
    expect(parseColor("rgb(26 26 24 / 50%)")).toEqual({
      r: 26,
      g: 26,
      b: 24,
      a: 0.5,
    });
    expect(parseColor("rgb(100% 0% 0%)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("reads hsl", () => {
    expect(parseColor("hsl(0 100% 50%)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor("hsl(120, 100%, 25%)")).toEqual({
      r: 0,
      g: 127.5,
      b: 0,
      a: 1,
    });
  });

  it("answers null for what it does not read, instead of guessing black", () => {
    // The reason this module exists: Mantine's parser answers black for these,
    // which would make a pale named colour pass.
    expect(parseColor("tomato")).toBeNull();
    expect(parseColor("var(--ink)")).toBeNull();
    expect(parseColor("#12")).toBeNull();
    expect(parseColor("rgb(1 2)")).toBeNull();
    expect(parseColor("hsl(10 20 30)")).toBeNull();
    expect(parseColor("")).toBeNull();
  });
});

describe("contrastOnPaper", () => {
  it("is 21 for black on white and 1 for white on white", () => {
    expect(contrastOnPaper("#000000")).toBeCloseTo(21, 5);
    expect(contrastOnPaper("#ffffff")).toBeCloseTo(1, 5);
  });

  it("matches the published ratio for #767676, the lightest grey that passes AA", () => {
    expect(contrastOnPaper("#767676")).toBeCloseTo(4.54, 1);
    expect(contrastOnPaper("#777777")).toBeCloseTo(4.48, 1);
    expect(contrastOnPaper("#767676") ?? 0).toBeGreaterThanOrEqual(4.5);
    expect(contrastOnPaper("#777777") ?? 0).toBeLessThan(4.5);
  });

  it("composites a translucent colour over the paper first", () => {
    // Black at half opacity is the grey it looks like, not black.
    const half = contrastOnPaper("rgb(0 0 0 / 50%)");

    expect(half).not.toBeNull();
    expect(half ?? 0).toBeLessThan(21);
    expect(half ?? 0).toBeCloseTo(contrastOnPaper("#808080") ?? 0, 0);
  });

  it("is null for a colour it cannot read", () => {
    expect(contrastOnPaper("tomato")).toBeNull();
  });
});
