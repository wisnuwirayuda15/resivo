/**
 * Contrast between a colour token and the paper it is printed on.
 *
 * Written here rather than taken from `@mantine/core`, which exports a
 * `luminance` but has no way to say "I do not understand this colour": its
 * parser answers black for anything it cannot read, so a token like `tomato`
 * would pass as the highest contrast there is. A checker has to be able to say
 * nothing, so every parser here returns `null` for what it does not recognise
 * and the caller skips that token.
 */

/**
 * The paper is white. `paper.css` sets `--paper-bg: #ffffff` and nothing in the
 * design tokens changes it, because the preview must not inherit the app's dark
 * scheme. If paper colour ever becomes a token, this becomes a parameter.
 */
export const PAPER_BACKGROUND = "#ffffff";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

const parseHex = (value: string): (Rgb & { a: number }) | null => {
  const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value);
  const digits = match?.[1];

  if (digits === undefined) {
    return null;
  }

  const full =
    digits.length <= 4
      ? digits
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : digits;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
  };
};

/** `rgb(26 26 24)`, `rgb(26, 26, 24)`, `rgba(26 26 24 / 50%)`, percent channels. */
const parseRgbFunction = (value: string): (Rgb & { a: number }) | null => {
  const match = /^rgba?\(\s*([^)]*)\)$/i.exec(value);
  const body = match?.[1];

  if (body === undefined) {
    return null;
  }

  const parts = body.split(/[\s,/]+/).filter((part) => part !== "");

  if (parts.length < 3 || parts.length > 4) {
    return null;
  }

  const channel = (part: string): number | null => {
    const number = Number.parseFloat(part);

    if (Number.isNaN(number)) {
      return null;
    }

    return part.endsWith("%")
      ? clamp((number / 100) * 255, 0, 255)
      : clamp(number, 0, 255);
  };

  const r = channel(parts[0] ?? "");
  const g = channel(parts[1] ?? "");
  const b = channel(parts[2] ?? "");

  if (r === null || g === null || b === null) {
    return null;
  }

  const alphaPart = parts[3];
  let a = 1;

  if (alphaPart !== undefined) {
    const parsed = Number.parseFloat(alphaPart);

    if (Number.isNaN(parsed)) {
      return null;
    }

    a = clamp(alphaPart.endsWith("%") ? parsed / 100 : parsed, 0, 1);
  }

  return { r, g, b, a };
};

/** `hsl(210 50% 40%)` and the comma form, with an optional alpha. */
const parseHslFunction = (value: string): (Rgb & { a: number }) | null => {
  const match = /^hsla?\(\s*([^)]*)\)$/i.exec(value);
  const body = match?.[1];

  if (body === undefined) {
    return null;
  }

  const parts = body.split(/[\s,/]+/).filter((part) => part !== "");

  if (parts.length < 3 || parts.length > 4) {
    return null;
  }

  const hue = Number.parseFloat(parts[0] ?? "");
  const saturation = Number.parseFloat(parts[1] ?? "");
  const lightness = Number.parseFloat(parts[2] ?? "");

  if (
    Number.isNaN(hue) ||
    Number.isNaN(saturation) ||
    Number.isNaN(lightness) ||
    !(parts[1] ?? "").endsWith("%") ||
    !(parts[2] ?? "").endsWith("%")
  ) {
    return null;
  }

  const s = clamp(saturation / 100, 0, 1);
  const l = clamp(lightness / 100, 0, 1);
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const sector = (((hue % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const m = l - chroma / 2;

  const [r, g, b] = (
    [
      [chroma, x, 0],
      [x, chroma, 0],
      [0, chroma, x],
      [0, x, chroma],
      [x, 0, chroma],
      [chroma, 0, x],
    ] as const
  )[Math.min(5, Math.floor(sector))] ?? [0, 0, 0];

  const alphaPart = parts[3];
  const alpha = alphaPart === undefined ? 1 : Number.parseFloat(alphaPart);

  if (Number.isNaN(alpha)) {
    return null;
  }

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
    a: clamp(alphaPart?.endsWith("%") === true ? alpha / 100 : alpha, 0, 1),
  };
};

/**
 * Reads a hex, `rgb()` or `hsl()` colour, or answers `null`.
 *
 * Named colours and `var()` are not read. The first are a table this module has
 * no reason to carry, and the second has no value outside a browser.
 */
export const parseColor = (value: string): (Rgb & { a: number }) | null => {
  const trimmed = value.trim();

  return (
    parseHex(trimmed) ?? parseRgbFunction(trimmed) ?? parseHslFunction(trimmed)
  );
};

const linear = (channel: number): number => {
  const scaled = channel / 255;

  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

const luminance = ({ r, g, b }: Rgb): number =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/**
 * The WCAG contrast ratio of a text colour on the paper, 1 to 21, or `null`
 * when either colour is not one this module reads.
 *
 * A translucent colour is composited over the paper first, because that is the
 * colour the reader sees, not the one the token spells.
 */
export const contrastOnPaper = (foreground: string): number | null => {
  const text = parseColor(foreground);
  const paper = parseColor(PAPER_BACKGROUND);

  if (text === null || paper === null) {
    return null;
  }

  const blended: Rgb = {
    r: text.r * text.a + paper.r * (1 - text.a),
    g: text.g * text.a + paper.g * (1 - text.a),
    b: text.b * text.a + paper.b * (1 - text.a),
  };

  const lighter = Math.max(luminance(blended), luminance(paper));
  const darker = Math.min(luminance(blended), luminance(paper));

  return (lighter + 0.05) / (darker + 0.05);
};
