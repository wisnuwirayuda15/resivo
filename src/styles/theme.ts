import {
  ActionIcon,
  Button,
  Input,
  Modal,
  NativeSelect,
  Paper,
  Select,
  Tooltip,
  createTheme,
} from '@mantine/core'

import type { MantineColorsTuple } from '@mantine/core'

/**
 * Single source of truth for the design system.
 *
 * `tailwind-preset-mantine` reads this file at build time and (re)generates
 * `src/styles/theme.css`. Every token declared here therefore becomes BOTH a
 * `--mantine-*` CSS variable AND a Tailwind theme key:
 *
 *   radius.card  -> Mantine `radius="card"`   AND  Tailwind `rounded-card`
 *   shadows.card -> Mantine `shadow="card"`   AND  Tailwind `shadow-card`
 *
 * Values come from the Resivo Design System. Two things live outside this file:
 * the raw primitive scales (`styles/tokens.css`) and the semantic light/dark
 * aliases (`styles/scheme.css`). This file carries only the subset Mantine
 * itself needs to theme its components.
 */

/**
 * Warm graphite. Overrides Mantine's built-in `gray` so every default component
 * inherits the design system's neutrals instead of a blue-leaning grey.
 *
 * The ORDER matters, not just the values: Mantine reaches for specific indices
 * for specific jobs — `gray[3]` for borders, `gray[5]` for placeholders,
 * `gray[6]` for dimmed text. So each index carries the design system token that
 * plays that role, rather than the scale being a straight copy of `--n-*`.
 * `--n-0`, `--n-150` and `--n-950` are therefore absent here; they remain
 * available as raw custom properties.
 */
const graphite: MantineColorsTuple = [
  '#fbfbfa', // n-25
  '#f6f6f4', // n-50
  '#eeeeeb', // n-100 — border-subtle
  '#d8d8d3', // n-200 — border-default  (Mantine's border shade)
  '#c0c0b9', // n-300 — border-strong
  '#9b9b93', // n-400 — text-disabled   (Mantine's placeholder shade)
  '#79796f', // n-500 — text-subtle     (Mantine's dimmed shade)
  '#5c5c55', // n-600 — text-muted
  '#454540', // n-700
  '#2e2e2a', // n-800 — text-body
]

/** Deep archival teal — the only saturated colour in the chrome. */
const brand: MantineColorsTuple = [
  '#e8f3f2', // p-50
  '#c9e5e2', // p-100
  '#9dcfcb', // p-200
  '#66b2ad', // p-300
  '#32948e', // p-400
  '#0e7c76', // p-500 — the primary shade in light mode
  '#066560', // p-600
  '#04514d', // p-700
  '#06403d', // p-800
  '#062e2c', // p-900
]

/**
 * Dark surfaces. A real theme rather than an inversion, so the ramp is authored
 * rather than derived: text at the light end, borders in the middle, the
 * background levels at the dark end. Text stops at #f2f2f0 — never pure white.
 *
 * Aligned to the indices Mantine actually uses, same as `graphite` above:
 * `dark[4]` is the border shade, `dark[6]` backs raised surfaces like menus and
 * `Paper`, and `dark[7]` is the body background. Putting a text colour at index
 * 4 — which is the intuitive reading of "light to dark" — makes every default
 * border in the app come out several steps too light.
 */
const dark: MantineColorsTuple = [
  '#f2f2f0', // text-title
  '#dcdcd8', // text-body
  '#a2a29b', // text-muted
  '#8a8a83', // text-subtle
  '#2d3135', // border-default  (Mantine's border shade)
  '#232629', // border-subtle
  '#1e2125', // bg-raised       (menus, popovers, Paper)
  '#17191c', // bg-surface      (Mantine's body background)
  '#101113', // bg-app
  '#0b0c0d', // bg-sunken
]

export const theme = createTheme({
  colors: { gray: graphite, brand, dark },
  primaryColor: 'brand',
  // Light picks p-500; dark steps one lighter so teal holds against #101113.
  primaryShade: { light: 5, dark: 4 },

  fontFamily:
    "'Instrument Sans Variable', 'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
  fontFamilyMonospace:
    "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
  headings: {
    fontFamily:
      "'Instrument Sans Variable', 'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '1.5rem', lineHeight: '1.3' }, // 24px
      h2: { fontSize: '1.125rem', lineHeight: '1.3' }, // 18px
      h3: { fontSize: '0.875rem', lineHeight: '1.3' }, // 14px
      h4: { fontSize: '0.8125rem', lineHeight: '1.3' }, // 13px
      h5: { fontSize: '0.75rem', lineHeight: '1.3' }, // 12px
      h6: { fontSize: '0.6875rem', lineHeight: '1.3' }, // 11px
    },
  },

  /**
   * Compact productivity scale. `md` is 13px, NOT 16px — this is the single
   * most load-bearing deviation from Mantine's defaults, and every control size
   * below is calibrated to it.
   */
  fontSizes: {
    xs: '0.6875rem', // 11px
    sm: '0.75rem', // 12px
    md: '0.8125rem', // 13px — body default
    lg: '0.875rem', // 14px
    xl: '1rem', // 16px
  },
  /**
   * Two sets on purpose. The `xs`–`xl` keys SHARE names with `fontSizes`, so the
   * Tailwind generator pairs them into one `text-<key>` utility that carries the
   * right leading — 13px body text comes out at 1.45, per the design system.
   * The named keys are standalone line-height utilities for the cases where
   * size and leading are chosen independently (display type, code panes).
   */
  lineHeights: {
    xs: '1.3',
    sm: '1.3',
    md: '1.45',
    lg: '1.45',
    xl: '1.45',
    tight: '1.15',
    snug: '1.3',
    normal: '1.45',
    relaxed: '1.6',
    code: '1.7',
  },

  spacing: {
    xs: '0.375rem', // 6px
    sm: '0.5rem', // 8px
    md: '0.75rem', // 12px
    lg: '1rem', // 16px
    xl: '1.5rem', // 24px
  },

  radius: {
    xs: '3px',
    sm: '5px',
    md: '7px',
    lg: '10px',
    xl: '14px',
    // Named aliases — the DS assigns a radius per surface kind, so call sites
    // name the surface rather than picking a size.
    control: '5px',
    panel: '7px',
    card: '10px',
    dialog: '14px',
    pill: '999px',
  },
  defaultRadius: 'control',

  shadows: {
    xs: '0 1px 1px rgba(18, 18, 16, 0.04)',
    sm: '0 1px 2px rgba(18, 18, 16, 0.06), 0 1px 1px rgba(18, 18, 16, 0.04)',
    md: '0 2px 4px rgba(18, 18, 16, 0.06), 0 4px 12px rgba(18, 18, 16, 0.05)',
    lg: '0 8px 24px rgba(18, 18, 16, 0.09), 0 2px 6px rgba(18, 18, 16, 0.05)',
    xl: '0 18px 48px rgba(18, 18, 16, 0.18), 0 2px 8px rgba(18, 18, 16, 0.08)',
    // The only shadow with real spread: it floats the resume page above the
    // sunken preview well.
    paper:
      '0 1px 2px rgba(18, 18, 16, 0.08), 0 12px 32px rgba(18, 18, 16, 0.1)',
  },

  /** 80–320ms. `prefers-reduced-motion` zeroes these in `base.css`. */
  other: {
    durationInstant: '80ms',
    durationFast: '120ms',
    durationBase: '200ms',
    durationSlow: '320ms',
    easeStandard: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
    easeEntrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },

  // The ONE place components receive default props. Call sites should not
  // repeat these styling props.
  components: {
    // Control heights are 22 / 26 / 30 / 36 with 30 as the default, so every
    // interactive component defaults to `sm` on Mantine's scale (which this
    // theme's compact font sizes render at ~30px).
    Button: Button.extend({
      defaultProps: { radius: 'control', size: 'sm', fw: 500 },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { radius: 'control', size: 'md', variant: 'subtle' },
    }),
    Input: Input.extend({ defaultProps: { radius: 'control', size: 'sm' } }),
    Select: Select.extend({ defaultProps: { radius: 'control', size: 'sm' } }),
    NativeSelect: NativeSelect.extend({
      defaultProps: { radius: 'control', size: 'sm' },
    }),
    Paper: Paper.extend({
      defaultProps: { radius: 'card', withBorder: true, shadow: 'xs' },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 'dialog',
        shadow: 'xl',
        centered: true,
        // 42% ink + 2px blur — one of only two places the DS uses blur at all.
        overlayProps: { backgroundOpacity: 0.42, blur: 2 },
      },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: {
        radius: 'xs',
        fz: 'sm',
        withArrow: false,
        openDelay: 400,
      },
    }),
  },
})

export default theme
