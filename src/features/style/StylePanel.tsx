import { Box } from '@mantine/core'

import { BUILTIN_FONTS } from '@/features/templates/defaults'
import { patchDesign } from '@/features/editor/mutations'

import {
  ColorField,
  ControlGroup,
  NumberField,
  SelectField,
  SliderField,
  SwitchField,
} from './controls'

import type { Recipe } from '@/features/editor/mutations'
import type {
  DesignConfig,
  FontRef,
  PaperSize,
} from '@/features/resume/model/document'

/**
 * The Style tab — the whole `DesignConfig`, one control per token.
 *
 * Every control goes through `patchDesign`, so a style change is an ordinary
 * document edit: it is undoable, it autosaves, and the preview re-renders from
 * the same store update any other edit would produce. Nothing here talks to the
 * preview directly.
 */

type FontKey = 'serif' | 'sans' | 'mono'

interface StylePanelProps {
  design: DesignConfig
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void
}

const FONT_OPTIONS: Array<{ value: FontKey; label: string }> = [
  { value: 'serif', label: 'Source Serif 4' },
  { value: 'sans', label: 'Instrument Sans' },
  { value: 'mono', label: 'JetBrains Mono' },
]

/**
 * Maps a stored `FontRef` back to the option that produced it.
 *
 * Matched on family rather than by object identity, because the document has
 * been through JSON by the time it comes back from IndexedDB. A custom family
 * (phase 10) matches nothing and falls back to serif in the *control* only — the
 * document keeps its real value, so opening this panel cannot quietly rewrite a
 * font the user uploaded.
 */
const fontKey = (font: FontRef | undefined): FontKey => {
  const entry = Object.entries(BUILTIN_FONTS).find(
    ([, candidate]) => candidate.family === font?.family,
  )

  return (entry?.[0] as FontKey | undefined) ?? 'serif'
}

const PAPER_SIZES: Array<{ value: PaperSize; label: string }> = [
  { value: 'Letter', label: 'Letter' },
  { value: 'A4', label: 'A4' },
]

const AVATAR_SHAPES: Array<{
  value: DesignConfig['image']['avatarShape']
  label: string
}> = [
  { value: 'circle', label: 'Circle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
]

const WEIGHTS: Array<{ value: string; label: string }> = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
]

const MARGIN_EDGES = [
  ['top', 'Top margin'],
  ['right', 'Right margin'],
  ['bottom', 'Bottom margin'],
  ['left', 'Left margin'],
] as const

export const StylePanel: React.FC<StylePanelProps> = ({ design, apply }) => {
  /**
   * Dragging a slider or holding a stepper produces a stream of edits.
   * Coalescing them under one key per control collapses the stream into a single
   * undo step, so undo takes back "the size change" rather than one increment of
   * it. Discrete controls — a switch, a select — pass no key and stay their own
   * step.
   */
  const patch = (
    values: Parameters<typeof patchDesign>[0],
    coalesce?: string,
  ) => apply(patchDesign(values), coalesce === undefined ? {} : { coalesce })

  const { paper, typography, colors, spacing, rules, image, icons } = design

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
          data={FONT_OPTIONS}
          label="Body font"
          onChange={(key) =>
            patch({ typography: { bodyFont: BUILTIN_FONTS[key] } })
          }
          value={fontKey(typography.bodyFont)}
        />
        <SelectField
          data={FONT_OPTIONS}
          label="Heading font"
          onChange={(key) =>
            patch({ typography: { headingFont: BUILTIN_FONTS[key] } })
          }
          value={fontKey(typography.headingFont ?? typography.bodyFont)}
        />

        <NumberField
          hint="Points, not pixels — a resume is a print document."
          label="Body size"
          max={24}
          min={6}
          onChange={(baseSize) =>
            patch({ typography: { baseSize } }, 'design:baseSize')
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
          onChange={(scale) => patch({ typography: { scale } }, 'design:scale')}
          step={0.005}
          value={typography.scale}
        />

        <SliderField
          label="Line height"
          max={2}
          min={1}
          onChange={(lineHeight) =>
            patch({ typography: { lineHeight } }, 'design:lineHeight')
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
          onChange={(text) => patch({ colors: { text } }, 'design:color.text')}
          value={colors.text}
        />
        <ColorField
          label="Headings"
          onChange={(heading) =>
            patch({ colors: { heading } }, 'design:color.heading')
          }
          value={colors.heading}
        />
        <ColorField
          hint="Section headings and their icons. The one saturated colour on the page."
          label="Accent"
          onChange={(accent) =>
            patch({ colors: { accent } }, 'design:color.accent')
          }
          value={colors.accent}
        />
        <ColorField
          hint="Dates, locations and secondary lines."
          label="Muted"
          onChange={(muted) =>
            patch({ colors: { muted } }, 'design:color.muted')
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
            patch({ spacing: { section } }, 'design:space.section')
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
            patch({ spacing: { paragraph } }, 'design:space.block')
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
            patch({ spacing: { heading } }, 'design:space.heading')
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
          onChange={(width) => patch({ rules: { width } }, 'design:rule.width')}
          step={0.5}
          suffix="px"
          value={rules.width}
        />
        <ColorField
          label="Colour"
          onChange={(color) => patch({ rules: { color } }, 'design:rule.color')}
          value={rules.color}
        />
      </ControlGroup>

      <ControlGroup title="Icons">
        <NumberField
          decimalScale={0}
          label="Size"
          max={48}
          min={6}
          onChange={(size) => patch({ icons: { size } }, 'design:icon.size')}
          step={1}
          suffix="px"
          value={icons.size}
        />
        <ColorField
          label="Colour"
          onChange={(color) => patch({ icons: { color } }, 'design:icon.color')}
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
          hint="Applies once a photo is attached — the image library arrives in a later phase."
          label="Size"
          max={300}
          min={24}
          onChange={(avatarSize) =>
            patch({ image: { avatarSize } }, 'design:avatarSize')
          }
          step={2}
          suffix="px"
          value={image.avatarSize}
        />
      </ControlGroup>
    </Box>
  )
}
