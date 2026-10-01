import { patchDesign } from "@/features/editor/mutations";
import { templateDefaults } from "@/features/templates/defaults";

import { contrastOnPaper } from "../contrast";

import { makeIssue } from "./helpers";

import type { DesignConfig } from "@/features/resume/model/document";
import type { AtsRule } from "../types";

/**
 * The style tokens: size, margins, colour and font.
 *
 * A fix here restores a value to what the document's own template seeds, never
 * to a number this file invented, apart from the two constants below that name
 * the least a size or a margin may be.
 */

/**
 * Below this a printed resume is hard to read and a scan of it is harder.
 * Conventional resume advice puts body text at 10pt to 12pt, and 9.5pt leaves
 * room for the technical template's own 10pt without flagging it.
 */
const MIN_BODY_PT = 9.5;

/** What the fix sets the body size to, the smallest size that is comfortable. */
const FIX_BODY_PT = 10;

/**
 * A printer cannot reach the edge of the sheet, and many stop around a quarter
 * of an inch in, so a margin under 0.4in leaves little room before text is cut
 * off the printed page.
 */
const MIN_MARGIN_IN = 0.4;

/** What the fix raises a margin to. Half an inch is the usual narrow margin. */
const FIX_MARGIN_IN = 0.5;

/**
 * WCAG AA for body text. Text that fails it is hard to read on a screen and
 * worse when a recruiter's printer renders it lighter than the preview.
 */
const MIN_CONTRAST = 4.5;

const TEXT_TOKENS = ["text", "heading", "accent", "muted"] as const;

const fontSizeSmall: AtsRule = (document) =>
  document.design.typography.baseSize < MIN_BODY_PT
    ? [
        makeIssue("ats.font-size-small", "body", {
          severity: "warning",
          params: {
            size: document.design.typography.baseSize,
            fixSize: FIX_BODY_PT,
          },
          fix: {
            recipe: patchDesign({ typography: { baseSize: FIX_BODY_PT } }),
          },
        }),
      ]
    : [];

const marginsNarrow: AtsRule = (document) => {
  const margin = document.design.paper.margin;
  const edges = Object.values(margin);

  if (edges.every((edge) => edge >= MIN_MARGIN_IN)) {
    return [];
  }

  // `patchDesign` merges one level, so it replaces `margin` outright and every
  // side has to travel with the fix, not only the narrow ones.
  const raised = {
    top: Math.max(margin.top, FIX_MARGIN_IN),
    right: Math.max(margin.right, FIX_MARGIN_IN),
    bottom: Math.max(margin.bottom, FIX_MARGIN_IN),
    left: Math.max(margin.left, FIX_MARGIN_IN),
  };

  return [
    makeIssue("ats.margins-narrow", "paper", {
      severity: "warning",
      fix: {
        recipe: patchDesign({ paper: { margin: raised } }),
      },
    }),
  ];
};

const contrastLow: AtsRule = (document) => {
  const defaults = templateDefaults(document.templateId).colors;

  return TEXT_TOKENS.flatMap((token) => {
    const ratio = contrastOnPaper(document.design.colors[token]);

    // A colour this checker cannot read is skipped, never failed.
    if (ratio === null || ratio >= MIN_CONTRAST) {
      return [];
    }

    const restored = defaults[token];
    const restoredRatio = contrastOnPaper(restored);
    const canRestore =
      restored !== document.design.colors[token] &&
      restoredRatio !== null &&
      restoredRatio >= MIN_CONTRAST;

    return [
      makeIssue("ats.contrast-low", token, {
        severity: "warning",
        params: { ratio: ratio.toFixed(1), context: token },
        ...(canRestore
          ? {
              fix: {
                recipe: patchDesign({ colors: { [token]: restored } }),
              },
            }
          : {}),
      }),
    ];
  });
};

type FontSlot = "bodyFont" | "headingFont";

const fontCustom: AtsRule = (document) => {
  const defaults = templateDefaults(document.templateId).typography;
  const slots: Array<{ slot: FontSlot; name: string }> = [
    { slot: "bodyFont", name: "body" },
    { slot: "headingFont", name: "heading" },
  ];

  return slots.flatMap(({ slot, name }) => {
    const font: DesignConfig["typography"][FontSlot] =
      document.design.typography[slot];

    if (font?.source !== "custom") {
      return [];
    }

    return [
      makeIssue("ats.font-custom", slot, {
        severity: "info",
        params: { context: name },
        fix: {
          recipe: patchDesign({
            typography: { [slot]: defaults[slot] ?? defaults.bodyFont },
          }),
        },
      }),
    ];
  });
};

export const typographyRules: Array<AtsRule> = [
  fontSizeSmall,
  marginsNarrow,
  contrastLow,
  fontCustom,
];
