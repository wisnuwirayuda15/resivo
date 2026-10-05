import { Box } from "@mantine/core";

import { BUILTIN_FONTS } from "@/features/templates/defaults";
import { DOCUMENT_LOCALES } from "@/features/templates/renderer/locales";
import { useFonts } from "@/features/assets/queries";
import { patchDesign, setLocale } from "@/features/editor/mutations";
import { useTranslation } from "@/lib/i18n/useTranslation";

import {
  ColorField,
  ControlGroup,
  IconChoiceField,
  NumberField,
  SelectField,
  SliderField,
  SwitchField,
  TextField,
} from "./controls";

import type { Recipe } from "@/features/editor/mutations";
import type { FontSummary } from "@/database/index";
import {
  TAG_SEPARATOR_MAX,
  TEXT_ALIGNMENTS,
} from "@/features/resume/model/document";

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

/** The typefaces, by their own names. A typeface is called what it is called in
 * every language, so these are not messages. */
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

/** The paper sizes are called Letter and A4 everywhere. */
const PAPER_SIZES: Array<{ value: PaperSize; label: string }> = [
  { value: "Letter", label: "Letter" },
  { value: "A4", label: "A4" },
];

/**
 * The options that have words, by message key.
 *
 * Keys and not labels, because a list built once at module load would be fixed
 * in whichever language was current then. The component says them, at render.
 */
const AVATAR_SHAPES = ["circle", "rounded", "square"] as const satisfies Array<
  DesignConfig["image"]["avatarShape"]
>;

/** What the tag separator is until someone sets one, the middle dot
 * `base.css` draws. */
const DEFAULT_TAG_SEPARATOR = "·";

const WEIGHTS = [
  ["300", "light"],
  ["400", "regular"],
  ["500", "medium"],
  ["600", "semibold"],
  ["700", "bold"],
] as const;

const MARGIN_EDGES = [
  ["top", "marginTop"],
  ["right", "marginRight"],
  ["bottom", "marginBottom"],
  ["left", "marginLeft"],
] as const;

export const StylePanel: React.FC<StylePanelProps> = ({
  design,
  locale,
  apply,
}) => {
  const { t } = useTranslation("style");

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
          : t(font.style === "italic" ? "fontVariantItalic" : "fontVariant", {
              family: font.family,
              weight: font.weight,
            }),
    })),
  ];

  const weightOptions = WEIGHTS.map(([value, key]) => ({
    value,
    label: t(`weights.${key}`),
  }));

  const alignOptions = TEXT_ALIGNMENTS.map((value) => ({
    value,
    icon: `text-align-${value}`,
    label: t(`alignments.${value}`),
  }));

  const shapeOptions = AVATAR_SHAPES.map((value) => ({
    value,
    label: t(`avatarShapes.${value}`),
  }));

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
      <ControlGroup title={t("groups.paper")}>
        <SelectField
          data={PAPER_SIZES}
          label={t("fields.size")}
          onChange={(size) => patch({ paper: { size } })}
          value={paper.size}
        />

        {MARGIN_EDGES.map(([edge, key]) => (
          <NumberField
            hint={t("hints.margin")}
            key={edge}
            label={t(`fields.${key}`)}
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

      <ControlGroup title={t("groups.typography")}>
        <SelectField
          data={fontOptions}
          label={t("fields.bodyFont")}
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
          label={t("fields.headingFont")}
          onChange={(key) => {
            const headingFont = fontRefFor(key, fonts);

            if (headingFont !== undefined) {
              patch({ typography: { headingFont } });
            }
          }}
          value={fontKey(typography.headingFont ?? typography.bodyFont, fonts)}
        />

        <NumberField
          hint={t("hints.bodySize")}
          label={t("fields.bodySize")}
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
          hint={t("hints.scale")}
          label={t("fields.scale")}
          max={1.6}
          min={1}
          onChange={(scale) => patch({ typography: { scale } }, "design:scale")}
          step={0.005}
          value={typography.scale}
        />

        <SliderField
          label={t("fields.lineHeight")}
          max={2}
          min={1}
          onChange={(lineHeight) =>
            patch({ typography: { lineHeight } }, "design:lineHeight")
          }
          step={0.01}
          value={typography.lineHeight}
        />

        <SelectField
          data={weightOptions}
          label={t("fields.bodyWeight")}
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
          data={weightOptions}
          label={t("fields.headingWeight")}
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

      <ControlGroup title={t("groups.text")}>
        <IconChoiceField
          data={alignOptions}
          hint={t("hints.align")}
          label={t("fields.align")}
          onChange={(align) => patch({ text: { align } })}
          value={design.text?.align ?? "left"}
        />
        <TextField
          hint={t("hints.tagSeparator")}
          label={t("fields.tagSeparator")}
          maxLength={TAG_SEPARATOR_MAX}
          onChange={(tagSeparator) =>
            patch({ text: { tagSeparator } }, "design:tagSeparator")
          }
          placeholder={DEFAULT_TAG_SEPARATOR}
          value={design.text?.tagSeparator ?? DEFAULT_TAG_SEPARATOR}
        />
      </ControlGroup>

      <ControlGroup title={t("groups.colour")}>
        <ColorField
          label={t("fields.bodyText")}
          onChange={(text) => patch({ colors: { text } }, "design:color.text")}
          value={colors.text}
        />
        <ColorField
          label={t("fields.headings")}
          onChange={(heading) =>
            patch({ colors: { heading } }, "design:color.heading")
          }
          value={colors.heading}
        />
        <ColorField
          hint={t("hints.accent")}
          label={t("fields.accent")}
          onChange={(accent) =>
            patch({ colors: { accent } }, "design:color.accent")
          }
          value={colors.accent}
        />
        <ColorField
          hint={t("hints.muted")}
          label={t("fields.muted")}
          onChange={(muted) =>
            patch({ colors: { muted } }, "design:color.muted")
          }
          value={colors.muted}
        />
      </ControlGroup>

      <ControlGroup title={t("groups.spacing")}>
        <NumberField
          hint={t("hints.spaceSection")}
          label={t("fields.section")}
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
          hint={t("hints.spaceBlock")}
          label={t("fields.block")}
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
          hint={t("hints.spaceHeading")}
          label={t("fields.underHeading")}
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

      <ControlGroup title={t("groups.rules")}>
        <SwitchField
          checked={rules.showDividers}
          label={t("fields.dividers")}
          onChange={(showDividers) => patch({ rules: { showDividers } })}
        />
        <NumberField
          decimalScale={1}
          label={t("fields.thickness")}
          max={8}
          min={0}
          onChange={(width) => patch({ rules: { width } }, "design:rule.width")}
          step={0.5}
          suffix="px"
          value={rules.width}
        />
        <ColorField
          label={t("fields.colour")}
          onChange={(color) => patch({ rules: { color } }, "design:rule.color")}
          value={rules.color}
        />
      </ControlGroup>

      <ControlGroup title={t("groups.icons")}>
        <NumberField
          decimalScale={0}
          label={t("fields.size")}
          max={48}
          min={6}
          onChange={(size) => patch({ icons: { size } }, "design:icon.size")}
          step={1}
          suffix="px"
          value={icons.size}
        />
        <ColorField
          label={t("fields.colour")}
          onChange={(color) => patch({ icons: { color } }, "design:icon.color")}
          value={icons.color}
        />
      </ControlGroup>

      <ControlGroup title={t("groups.photo")}>
        <SelectField
          data={shapeOptions}
          label={t("fields.shape")}
          onChange={(avatarShape) => patch({ image: { avatarShape } })}
          value={image.avatarShape}
        />
        <NumberField
          decimalScale={0}
          hint={t("hints.photoSize")}
          label={t("fields.size")}
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

      <ControlGroup title={t("groups.pageBreaks")}>
        <SwitchField
          checked={keepHeadings}
          hint={t("hints.keepHeadings")}
          label={t("fields.keepHeadings")}
          onChange={(keepHeadingWithContent) =>
            patch({ pagination: { keepHeadingWithContent } })
          }
        />
      </ControlGroup>

      <ControlGroup title={t("groups.language")}>
        <SelectField
          data={localeOptions(locale)}
          hint={t("hints.language")}
          label={t("fields.document")}
          onChange={(next) => apply(setLocale(next))}
          value={locale}
        />
      </ControlGroup>
    </Box>
  );
};
