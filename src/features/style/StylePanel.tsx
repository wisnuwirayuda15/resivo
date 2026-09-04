import { Box } from "@mantine/core";

import { BUILTIN_FONTS } from "@/features/templates/defaults";
import { DOCUMENT_LOCALES } from "@/features/templates/renderer/locales";
import { useFonts } from "@/features/assets/queries";
import { patchDesign, setLocale } from "@/features/editor/mutations";

import {
  ColorField,
  ControlGroup,
  NumberField,
  SelectField,
  SliderField,
  SwitchField,
} from "./controls";

import type { Recipe } from "@/features/editor/mutations";
import type { FontSummary } from "@/database/index";
import type {
  DesignConfig,
  FontRef,
  PaperSize,
} from "@/features/resume/model/document";

/**
 * The Style tab, the whole `DesignConfig`, one control per token.
 *
 * Every control goes through `patchDesign`, so a style change is an ordinary
 * document edit: it is undoable, it autosaves, and the preview re-renders from
 * the same store update any other edit would produce. Nothing here talks to the
 * preview directly.
 */

/**
 * A built-in family, or `custom:<row id>` for an uploaded one.
 *
 * The id, not the family name: two uploads can legitimately share a family (a
 * regular and an italic of the same face), and selecting one has to mean one
 * row, because that row is what the `@font-face` rule is built from.
 */
type FontKey = "serif" | "sans" | "mono" | `custom:${string}`;

interface StylePanelProps {
  design: DesignConfig;
  /** The document's BCP 47 tag. Not part of `DesignConfig` (it changes what the
   * dates say, not how they look), but this panel is where a document-wide
   * setting belongs. */
  locale: string;
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void;
}

/**
 * Locale options, with the document's own tag included even when the list does
 * not name it.
 *
 * A Markdown import or a restored backup can carry any BCP 47 tag. Offering only
 * the curated list would leave the control blank for such a document and, worse,
 * silently overwrite the tag with whatever the user picked next.
 */
const localeOptions = (
  locale: string,
): Array<{ value: string; label: string }> =>
  DOCUMENT_LOCALES.some((entry) => entry.value === locale)
    ? DOCUMENT_LOCALES.map(({ value, label }) => ({ value, label }))
    : [
        ...DOCUMENT_LOCALES.map(({ value, label }) => ({ value, label })),
        { value: locale, label: locale },
      ];

const BUILTIN_OPTIONS: Array<{ value: FontKey; label: string }> = [
  { value: "serif", label: "Source Serif 4" },
  { value: "sans", label: "Instrument Sans" },
  { value: "mono", label: "JetBrains Mono" },
];

/**
 * Maps a stored `FontRef` back to the option that produced it.
 *
 * A custom font is matched on its row id, and a built-in on its family, because
 * the document has been through JSON by the time it comes back from IndexedDB
 * and object identity is gone.
 *
 * A reference to a font that is no longer stored (deleted, or a backup restored
 * on another device) falls back to serif in the *control only*. The document
 * keeps its real value, so opening this panel cannot quietly rewrite a font the
 * user chose, and the preview still shows the fallback face the browser picks.
 */
const fontKey = (
  font: FontRef | undefined,
  fonts: ReadonlyArray<FontSummary>,
): FontKey => {
  if (font?.source === "custom" && font.fontId !== undefined) {
    return fonts.some((stored) => stored.id === font.fontId)
      ? `custom:${font.fontId}`
      : "serif";
  }

  const entry = Object.entries(BUILTIN_FONTS).find(
    ([, candidate]) => candidate.family === font?.family,
  );

  return (entry?.[0] as FontKey | undefined) ?? "serif";
};

/** The `FontRef` a selected option stands for. */
const fontRefFor = (
  key: FontKey,
  fonts: ReadonlyArray<FontSummary>,
): FontRef | undefined => {
  if (!key.startsWith("custom:")) {
    return BUILTIN_FONTS[key as "serif" | "sans" | "mono"];
  }

  const fontId = key.slice("custom:".length);
  const stored = fonts.find((font) => font.id === fontId);

  return stored === undefined
    ? undefined
    : { family: stored.family, source: "custom", fontId };
};

const PAPER_SIZES: Array<{ value: PaperSize; label: string }> = [
  { value: "Letter", label: "Letter" },
  { value: "A4", label: "A4" },
];

const AVATAR_SHAPES: Array<{
  value: DesignConfig["image"]["avatarShape"];
  label: string;
}> = [
  { value: "circle", label: "Circle" },
  { value: "rounded", label: "Rounded" },
  { value: "square", label: "Square" },
];

const WEIGHTS: Array<{ value: string; label: string }> = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
];

const MARGIN_EDGES = [
  ["top", "Top margin"],
  ["right", "Right margin"],
  ["bottom", "Bottom margin"],
  ["left", "Left margin"],
] as const;

export const StylePanel: React.FC<StylePanelProps> = ({
  design,
  locale,
  apply,
}) => {
  /**
   * Uploaded fonts join the same two selects rather than getting a list of their
   * own: from the user's side there is one decision (what this resume is set in),
   * and where the file came from is not part of it.
   */
  const { data: storedFonts } = useFonts();
  const fonts = storedFonts ?? [];

  const fontOptions = [
    ...BUILTIN_OPTIONS,
    ...fonts.map((font) => ({
      value: `custom:${font.id}` as FontKey,
      // The family alone would be ambiguous where a face was uploaded in more
      // than one weight, and both rows would read identically in the list.
      label:
        font.weight === 400 && font.style === "normal"
          ? font.family
          : `${font.family} ${font.weight}${font.style === "italic" ? " italic" : ""}`,
    })),
  ];

  /**
   * Dragging a slider or holding a stepper produces a stream of edits.
   * Coalescing them under one key per control collapses the stream into a single
   * undo step, so undo takes back "the size change" rather than one increment of
   * it. Discrete controls (a switch, a select) pass no key and stay their own
   * step.
   */
  const patch = (
    values: Parameters<typeof patchDesign>[0],
    coalesce?: string,
  ) => apply(patchDesign(values), coalesce === undefined ? {} : { coalesce });

  const { paper, typography, colors, spacing, rules, image, icons } = design;
  // Absent in a document written before pagination had settings, and its
  // absence means the default rather than "off".
  const keepHeadings = design.pagination?.keepHeadingWithContent ?? true;

  return (
    <Box>
      <ControlGroup title="Paper">
        <SelectField
          data={PAPER_SIZES}
          label="Size"
          onChange={(size) => patch({ paper: { size } })}
          value={paper.size}
        />

        {MARGIN_EDGES.map(([edge, label]) => (
          <NumberField
            hint="The printed margin. The paginator measures against it, so changing it re-flows the pages."
            key={edge}
            label={label}
            max={3}
            min={0}
            onChange={(value) =>
              patch(
                { paper: { margin: { ...paper.margin, [edge]: value } } },
                `design:margin.${edge}`,
              )
            }
            step={0.05}
            suffix="in"
            value={paper.margin[edge]}
          />
        ))}
      </ControlGroup>

      <ControlGroup title="Typography">
        <SelectField
          data={fontOptions}
          label="Body font"
          onChange={(key) => {
            const bodyFont = fontRefFor(key, fonts);

            if (bodyFont !== undefined) {
              patch({ typography: { bodyFont } });
            }
          }}
          value={fontKey(typography.bodyFont, fonts)}
        />
        <SelectField
          data={fontOptions}
          label="Heading font"
          onChange={(key) => {
            const headingFont = fontRefFor(key, fonts);

            if (headingFont !== undefined) {
              patch({ typography: { headingFont } });
            }
          }}
          value={fontKey(typography.headingFont ?? typography.bodyFont, fonts)}
        />

        <NumberField
          hint="Points, not pixels, a resume is a print document."
          label="Body size"
          max={24}
          min={6}
          onChange={(baseSize) =>
            patch({ typography: { baseSize } }, "design:baseSize")
          }
          step={0.25}
          suffix="pt"
          value={typography.baseSize}
        />

        <SliderField
          hint="Every heading size is this ratio applied to the body size, so the whole ramp stays proportional."
          label="Scale"
          max={1.6}
          min={1}
          onChange={(scale) => patch({ typography: { scale } }, "design:scale")}
          step={0.005}
          value={typography.scale}
        />

        <SliderField
          label="Line height"
          max={2}
          min={1}
          onChange={(lineHeight) =>
            patch({ typography: { lineHeight } }, "design:lineHeight")
          }
          step={0.01}
          value={typography.lineHeight}
        />

        <SelectField
          data={WEIGHTS}
          label="Body weight"
          onChange={(value) =>
            patch({
              typography: {
                weights: { ...typography.weights, body: Number(value) },
              },
            })
          }
          value={String(typography.weights.body)}
        />
        <SelectField
          data={WEIGHTS}
          label="Heading weight"
          onChange={(value) =>
            patch({
              typography: {
                weights: { ...typography.weights, heading: Number(value) },
              },
            })
          }
          value={String(typography.weights.heading)}
        />
      </ControlGroup>

      <ControlGroup title="Colour">
        <ColorField
          label="Body text"
          onChange={(text) => patch({ colors: { text } }, "design:color.text")}
          value={colors.text}
        />
        <ColorField
          label="Headings"
          onChange={(heading) =>
            patch({ colors: { heading } }, "design:color.heading")
          }
          value={colors.heading}
        />
        <ColorField
          hint="Section headings and their icons. The one saturated colour on the page."
          label="Accent"
          onChange={(accent) =>
            patch({ colors: { accent } }, "design:color.accent")
          }
          value={colors.accent}
        />
        <ColorField
          hint="Dates, locations and secondary lines."
          label="Muted"
          onChange={(muted) =>
            patch({ colors: { muted } }, "design:color.muted")
          }
          value={colors.muted}
        />
      </ControlGroup>

      <ControlGroup title="Spacing">
        <NumberField
          hint="Air above each section heading."
          label="Section"
          max={5}
          min={0}
          onChange={(section) =>
            patch({ spacing: { section } }, "design:space.section")
          }
          step={0.05}
          suffix="rem"
          value={spacing.section}
        />
        <NumberField
          hint="Air between blocks inside a section."
          label="Block"
          max={5}
          min={0}
          onChange={(paragraph) =>
            patch({ spacing: { paragraph } }, "design:space.block")
          }
          step={0.05}
          suffix="rem"
          value={spacing.paragraph}
        />
        <NumberField
          hint="Gap under a heading, before its first block."
          label="Under heading"
          max={5}
          min={0}
          onChange={(heading) =>
            patch({ spacing: { heading } }, "design:space.heading")
          }
          step={0.05}
          suffix="rem"
          value={spacing.heading}
        />
      </ControlGroup>

      <ControlGroup title="Rules">
        <SwitchField
          checked={rules.showDividers}
          label="Dividers"
          onChange={(showDividers) => patch({ rules: { showDividers } })}
        />
        <NumberField
          decimalScale={1}
          label="Thickness"
          max={8}
          min={0}
          onChange={(width) => patch({ rules: { width } }, "design:rule.width")}
          step={0.5}
          suffix="px"
          value={rules.width}
        />
        <ColorField
          label="Colour"
          onChange={(color) => patch({ rules: { color } }, "design:rule.color")}
          value={rules.color}
        />
      </ControlGroup>

      <ControlGroup title="Icons">
        <NumberField
          decimalScale={0}
          label="Size"
          max={48}
          min={6}
          onChange={(size) => patch({ icons: { size } }, "design:icon.size")}
          step={1}
          suffix="px"
          value={icons.size}
        />
        <ColorField
          label="Colour"
          onChange={(color) => patch({ icons: { color } }, "design:icon.color")}
          value={icons.color}
        />
      </ControlGroup>

      <ControlGroup title="Photo">
        <SelectField
          data={AVATAR_SHAPES}
          label="Shape"
          onChange={(avatarShape) => patch({ image: { avatarShape } })}
          value={image.avatarShape}
        />
        <NumberField
          decimalScale={0}
          hint="Applies once a photo is attached, from the Assets tab or the Images page."
          label="Size"
          max={300}
          min={24}
          onChange={(avatarSize) =>
            patch({ image: { avatarSize } }, "design:avatarSize")
          }
          step={2}
          suffix="px"
          value={image.avatarSize}
        />
      </ControlGroup>

      <ControlGroup title="Page breaks">
        <SwitchField
          checked={keepHeadings}
          hint="Stops a section heading being the last thing on a page. Off packs the pages tighter, at the cost of the one break every reader notices."
          label="Keep headings with content"
          onChange={(keepHeadingWithContent) =>
            patch({ pagination: { keepHeadingWithContent } })
          }
        />
      </ControlGroup>

      <ControlGroup title="Language">
        <SelectField
          data={localeOptions(locale)}
          hint="Formats month names and the end of an ongoing role, and sets the exported document's language. It does not translate what you wrote."
          label="Document"
          onChange={(next) => apply(setLocale(next))}
          value={locale}
        />
      </ControlGroup>
    </Box>
  );
};
