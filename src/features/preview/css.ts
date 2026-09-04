import { templateLayerCss } from "@/features/templates/registry";

import frameCssText from "./frame.css?raw";
import editingCssText from "./editing.css?raw";

import type {
  DesignConfig,
  FontRef,
  PaperSize,
  TemplateId,
} from "@/features/resume/model/document";

/**
 * Assembling the preview iframe's stylesheet.
 *
 * The iframe is the isolation boundary, and this is what goes inside it. Nothing
 * from the app's stylesheet is included: no Tailwind, no Mantine, and above all
 * no colour scheme, so the paper cannot inherit the app's dark mode.
 *
 * Precedence is expressed with cascade layers rather than selector weight or
 * `!important`, which is what lets three independent authors (the template, the
 * style panel, and the user) each override the one below without fighting:
 *
 *   reset     the iframe's own normalisation, weakest of all
 *   template  paper tokens, shared element styles, the template's delta
 *   tokens    the document's DesignConfig, as `--paper-*` overrides
 *   custom    the user's CSS (phase 8, with its sanitizer)
 *
 * Page geometry is deliberately *unlayered* and therefore above all of them,
 * see the note in `frame.css`.
 */

export const LAYER_ORDER = "@layer reset, template, tokens, custom;";

/** Physical page dimensions, as CSS lengths. */
export const PAGE_DIMENSIONS: Record<
  PaperSize,
  { width: string; height: string }
> = {
  A4: { width: "210mm", height: "297mm" },
  Letter: { width: "8.5in", height: "11in" },
};

// ---------------------------------------------------------------------------
// Value guards
// ---------------------------------------------------------------------------

/**
 * A resume's colours reach here from a stored document, which may have arrived
 * through a JSON backup. The Zod schema already rejects the obvious attacks on
 * import, but this is where the value becomes CSS text, so it validates again
 * rather than trusting that it was checked upstream. Anything unrecognised falls
 * back instead of being emitted, a wrong colour is a visible, reportable bug;
 * an injected declaration is not.
 */
const COLOR_PATTERN =
  /^(?:#[0-9a-f]{3,8}|[a-z]+|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(\s*[0-9a-z%.,\s/+-]+\s*\))$/i;

const safeColor = (value: string, fallback: string): string =>
  COLOR_PATTERN.test(value.trim()) ? value.trim() : fallback;

/** Keeps a number inside a range the paper can actually render, and rejects
 * `NaN`/`Infinity` outright rather than emitting an invalid declaration. */
const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** Two decimals is finer than any print device resolves, and keeps the emitted
 * stylesheet readable when someone inspects it. */
const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * The three bundled families are emitted as the `--font-*` variables that the
 * iframe's font stylesheet defines, so each keeps its full fallback chain.
 * Anything else is a user-uploaded family: quoted, with a serif
 * fallback, and stripped of the characters that could close the declaration.
 */
const BUILTIN_STACKS: Record<string, string> = {
  "Source Serif 4 Variable": "var(--font-serif)",
  "Instrument Sans Variable": "var(--font-sans)",
  "JetBrains Mono Variable": "var(--font-mono)",
};

const fontValue = (font: FontRef, fallback: string): string => {
  const builtin = BUILTIN_STACKS[font.family];

  if (builtin !== undefined) {
    return builtin;
  }

  const family = font.family.replace(/["'\\;{}<>]/g, "").trim();

  return family === "" ? fallback : `'${family}', var(--font-serif)`;
};

const AVATAR_RADIUS: Record<DesignConfig["image"]["avatarShape"], string> = {
  circle: "50%",
  rounded: "6px",
  square: "0",
};

// ---------------------------------------------------------------------------
// Emitters
// ---------------------------------------------------------------------------

/**
 * The print page box.
 *
 * Zero margin because the page's own padding is the resume's margin, the same
 * padding the paginator measured against. Letting `@page` add its own would make
 * the printed content area smaller than the one the breaks were computed for,
 * which is exactly the preview/print divergence this engine exists to prevent.
 */
export const pageRule = (size: PaperSize): string => {
  const { width, height } = PAGE_DIMENSIONS[size];

  return `@page { size: ${width} ${height}; margin: 0; }`;
};

/**
 * The document's `DesignConfig` as `--paper-*` custom properties.
 *
 * Heading sizes are derived from the body size and the modular scale rather than
 * stored individually, so the whole ramp stays proportional when the user changes
 * one number. The name is four steps up, which puts the default 10.5pt body at
 * the design system's 22pt name.
 */
export const designVars = (design: DesignConfig): string => {
  const { paper, typography, colors, spacing, rules, image, icons } = design;
  const page = PAGE_DIMENSIONS[paper.size];

  const base = clamp(typography.baseSize, 6, 24, 10.5);
  const scale = clamp(typography.scale, 1, 2, 1.2);

  const declarations: Array<[string, string]> = [
    ["--paper-w", page.width],
    ["--paper-h", page.height],

    ["--paper-margin-top", `${clamp(paper.margin.top, 0, 3, 0.6)}in`],
    ["--paper-margin-right", `${clamp(paper.margin.right, 0, 3, 0.6)}in`],
    ["--paper-margin-bottom", `${clamp(paper.margin.bottom, 0, 3, 0.6)}in`],
    ["--paper-margin-left", `${clamp(paper.margin.left, 0, 3, 0.6)}in`],

    ["--paper-font-body", fontValue(typography.bodyFont, "var(--font-serif)")],
    [
      "--paper-font-head",
      fontValue(
        typography.headingFont ?? typography.bodyFont,
        "var(--font-serif)",
      ),
    ],

    ["--paper-fs-body", `${round(base)}pt`],
    ["--paper-fs-name", `${round(base * scale ** 4)}pt`],
    ["--paper-fs-headline", `${round(base * scale)}pt`],
    ["--paper-fs-section", `${round(base * scale)}pt`],
    ["--paper-fs-small", `${round(base * 0.92)}pt`],
    ["--paper-lh", `${clamp(typography.lineHeight, 1, 3, 1.42)}`],

    ["--paper-fw-body", `${clamp(typography.weights.body, 100, 900, 400)}`],
    ["--paper-fw-head", `${clamp(typography.weights.heading, 100, 900, 600)}`],

    ["--paper-ink", safeColor(colors.text, "#1a1a18")],
    ["--paper-heading", safeColor(colors.heading, "#1a1a18")],
    ["--paper-accent", safeColor(colors.accent, "#0e7c76")],
    ["--paper-ink-muted", safeColor(colors.muted, "#55554e")],
    ["--paper-rule", safeColor(colors.rule, "#d8d8d3")],

    ["--paper-space-section", `${clamp(spacing.section, 0, 5, 0.9)}rem`],
    ["--paper-space-block", `${clamp(spacing.paragraph, 0, 5, 0.35)}rem`],
    ["--paper-space-heading", `${clamp(spacing.heading, 0, 5, 0.4)}rem`],

    /**
     * Turning dividers off zeroes the rule width as well as skipping the
     * element. The element is what the renderer omits; this is what stops a
     * template that draws its own rule from leaving a 1px line behind.
     */
    [
      "--paper-rule-w",
      rules.showDividers ? `${clamp(rules.width, 0, 8, 1)}px` : "0px",
    ],
    ["--paper-rule-color", safeColor(rules.color, "#d8d8d3")],

    ["--paper-avatar-size", `${clamp(image.avatarSize, 24, 300, 84)}px`],
    ["--paper-avatar-radius", AVATAR_RADIUS[image.avatarShape]],

    ["--paper-icon-size", `${clamp(icons.size, 6, 48, 12)}px`],
    ["--paper-icon-color", safeColor(icons.color, "#55554e")],
  ];

  const body = declarations
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  return `.resivo-paper {\n${body}\n}`;
};

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export interface StylesheetInput {
  templateId: TemplateId;
  design: DesignConfig;
  /**
   * The user's CSS, already sanitized. Taking it pre-sanitized rather than
   * sanitizing here is deliberate: the editor has to show the warnings, so the
   * check runs once, where its result can be reported, and this function is
   * left with nothing to decide.
   */
  customCss?: string;
  /**
   * `@font-face` rules for the uploaded families this document uses, built by
   * `features/assets/fontFaces`. Passed in rather than built here because the
   * URLs inside them have lifetimes (object URLs in the preview, `data:` URLs
   * in an export), and this function is pure.
   */
  fontFaces?: string;
  /**
   * Include the editing chrome's rules.
   *
   * Off by default, and off for every export, so a file nobody can edit does not
   * carry styles for a drag handle it will never show, and "the export contains
   * nothing from the editor" is a property of the whole file rather than of its
   * body.
   */
  editing?: boolean;
}

/**
 * The complete stylesheet for one preview.
 *
 * The layer statement comes first, it is what establishes the order, and a
 * layer used before it is declared would sort itself by first appearance
 * instead.
 *
 * `custom` is last and therefore wins over the template and the style panel,
 * which is the point of it. It still cannot reach the page geometry, because
 * that is unlayered and unlayered beats every layer, so a user stylesheet can
 * restyle the resume but not break the pagination it was measured against.
 */
export const previewStylesheet = ({
  templateId,
  design,
  customCss,
  fontFaces,
  editing = false,
}: StylesheetInput): string =>
  [
    LAYER_ORDER,
    pageRule(design.paper.size),
    /**
     * Unlayered and before everything else. `@font-face` is not a style rule, so
     * no layer can override it, but a face has to be declared before the rule
     * that names it is resolved, and the token layer names it.
     */
    ...(fontFaces === undefined || fontFaces.trim() === "" ? [] : [fontFaces]),
    frameCssText,
    ...(editing ? [editingCssText] : []),
    `@layer template {\n${templateLayerCss(templateId)}\n}`,
    `@layer tokens {\n${designVars(design)}\n}`,
    ...(customCss === undefined || customCss.trim() === ""
      ? []
      : [`@layer custom {\n${customCss}\n}`]),
  ].join("\n\n");
