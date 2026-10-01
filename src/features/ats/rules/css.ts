import { makeIssue } from "./helpers";

import type { AtsRule } from "../types";

/**
 * What the custom stylesheet does to the text a parser can see.
 *
 * Text the page hides is still in the file, and a system that reads the file
 * but not the layout reads it anyway. That is what keyword stuffing exploits,
 * and some systems treat the pattern as an attempt at it, whatever the author
 * meant.
 */

/**
 * Comments are removed first, so a rule that was switched off with `/* ... *\/`
 * is not reported as if it were live.
 */
const stripComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Ends a declaration: a semicolon, a closing brace, `!important`, or the end. */
const END = String.raw`\s*(?:[;}!]|$)`;

/**
 * The five ways a stylesheet hides text. The key is also the `context` that picks
 * the sentence naming it, so the words are in the messages and not here.
 */
const HIDING: Array<{ key: string; pattern: RegExp }> = [
  {
    key: "display-none",
    pattern: /display\s*:\s*none/i,
  },
  {
    key: "visibility-hidden",
    pattern: /visibility\s*:\s*hidden/i,
  },
  {
    key: "font-size-zero",
    pattern: new RegExp(
      String.raw`font-size\s*:\s*0(?:px|pt|em|rem|%)?${END}`,
      "i",
    ),
  },
  {
    key: "opacity-zero",
    pattern: new RegExp(String.raw`opacity\s*:\s*0(?:\.0+)?${END}`, "i"),
  },
  {
    key: "color-transparent",
    pattern: /(?:^|[;{\s])color\s*:\s*transparent/i,
  },
];

const cssHidesText: AtsRule = (document) => {
  const css = stripComments(document.customCss);

  return HIDING.flatMap(({ key, pattern }) =>
    pattern.test(css)
      ? [
          makeIssue("ats.css-hides-text", key, {
            severity: "warning",
            params: { context: key },
          }),
        ]
      : [],
  );
};

/**
 * The trailing `\S` is load-bearing. Without it `\s*` can give back its spaces
 * so the lookahead sees " none" instead of "none", and `content: none` passes
 * as generated text.
 */
const GENERATED_CONTENT =
  /::?(?:before|after)[^{}]*\{[^}]*\bcontent\s*:\s*(?!none\b|normal\b)\S/i;

const cssGeneratedContent: AtsRule = (document) =>
  GENERATED_CONTENT.test(stripComments(document.customCss))
    ? [
        makeIssue("ats.css-generated-content", "css", {
          severity: "info",
        }),
      ]
    : [];

export const cssRules: Array<AtsRule> = [cssHidesText, cssGeneratedContent];
