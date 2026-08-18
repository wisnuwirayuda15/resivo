import { Button, createTheme } from '@mantine/core'

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
 * Colors are intentionally left at Mantine's defaults for now (primary `blue`),
 * so no custom `colors` / `primaryColor` is declared. Spacing is also left to
 * Tailwind's default numeric scale.
 */
export const theme = createTheme({
  // Named radius scale — merged on top of Mantine's xs–xl defaults.
  radius: {
    field: '0.5rem',
    card: '0.75rem',
    pill: '9999px',
  },

  // Named shadow scale.
  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
    overlay: '0 10px 40px -12px rgba(0, 0, 0, 0.35)',
  },

  // Extra font size. Kept DISJOINT from any lineHeights key so the generator
  // does not pair it as `text-<key>` + line-height.
  fontSizes: {
    display: '2.5rem',
  },

  // The ONE place components receive default props. Call sites should not
  // repeat these styling props.
  components: {
    Button: Button.extend({
      defaultProps: {
        radius: 'card',
        fw: 600,
      },
    }),
  },
})

export default theme
