import { describe, expect, it } from "vitest";

import { guessFromFilename } from "./readFont";

/**
 * The file-name guess is the only pure part of the font pipeline, reading a file
 * and validating it need a browser. It is worth testing on its own because it is
 * where a wrong answer is *plausible*: a font stored as weight 700 when it is
 * really 600 loads fine and prints subtly wrong.
 */

describe("guessFromFilename", () => {
  it("reads a numeric weight", () => {
    expect(guessFromFilename("Inter-600.woff2")).toEqual({
      family: "Inter",
      weight: 600,
      style: "normal",
    });
  });

  it("reads a named weight", () => {
    expect(guessFromFilename("SourceSerif-Bold.ttf").weight).toBe(700);
  });

  it('does not read "semibold" as "bold"', () => {
    expect(guessFromFilename("Inter-SemiBold.woff2").weight).toBe(600);
    expect(guessFromFilename("Inter-Semi-Bold.woff2").weight).toBe(600);
  });

  it("detects italic, and does not leave it in the family", () => {
    expect(guessFromFilename("Lora-BoldItalic.woff2")).toEqual({
      family: "Lora",
      weight: 700,
      style: "italic",
    });
  });

  it("treats oblique as italic", () => {
    expect(guessFromFilename("Mono-Oblique.woff").style).toBe("italic");
  });

  it("defaults to regular upright when the name says nothing", () => {
    expect(guessFromFilename("MyFont.woff2")).toEqual({
      family: "MyFont",
      weight: 400,
      style: "normal",
    });
  });

  it("turns separators into spaces", () => {
    expect(guessFromFilename("my_custom_face.woff2").family).toBe(
      "my custom face",
    );
  });

  /** A family is never empty: it becomes a CSS `font-family`, and an empty one
   * would silently match nothing. */
  it("falls back to the whole name rather than an empty family", () => {
    expect(guessFromFilename("Bold.woff2").family).not.toBe("");
    expect(guessFromFilename("-Italic.woff2").family).not.toBe("");
  });

  it("ignores the extension, whatever it is", () => {
    expect(guessFromFilename("Inter.otf").family).toBe("Inter");
    expect(guessFromFilename("Inter.woff2").family).toBe("Inter");
  });
});
