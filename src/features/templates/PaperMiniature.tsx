import { Box } from '@mantine/core'

import { cn } from '@/lib/utils'

import type { TemplateId } from '@/features/resume/model/document'

/**
 * A resume shown as ruled bars rather than as type.
 *
 * Built from a handful of 1-7px boxes instead of a rendered page or a stored
 * screenshot: it stays crisp at any zoom, needs no asset pipeline, and (because
 * it sits inside `.resivo-paper`) it picks up the template's real paper tokens,
 * so the accent colour shown here is the one the resume will print with.
 *
 * The three sizes are the three places it appears: a library card, a template
 * tile, and the landing page. They differ only in metrics, which is why they
 * are a table rather than three components.
 *
 * Geometry is expressed in Tailwind arbitrary values rather than Mantine's
 * `h`/`w`/`mt` style props, because those convert a bare number to `rem` and
 * these bars are sub-pixel-sensitive hairlines: a 1px rule that scales with the
 * root font size stops being a 1px rule.
 */

export type PaperMiniatureSize = 'card' | 'tile' | 'hero'

interface Metrics {
  /** The page box. */
  page: string
  /** The name bar. */
  name: string
  /** The contact line under it. */
  contact: string
  /** Space above each section. */
  section: string
  /** The section heading bar, in the accent. */
  heading: string
  /** Space above and the height of each body line. */
  line: string
  /** How many sections to draw. */
  sections: number
}

const METRICS: Record<PaperMiniatureSize, Metrics> = {
  /**
   * The landing page's, where the miniature is the largest thing on screen
   * rather than a thumbnail beside a name.
   *
   * Three sections instead of four: at 224 by 290 the bars are big enough that
   * a fourth would reach the bottom edge, and a page with no room left at the
   * foot reads as a page that overflowed.
   */
  hero: {
    page: 'h-[290px] w-[224px] px-6 py-7 shadow-paper',
    name: 'h-[13px] w-[58%]',
    contact: 'mt-[7px] h-[5px] w-[40%]',
    section: 'mt-[20px]',
    heading: 'h-[7px] w-[30%]',
    line: 'mt-[6px] h-[4px]',
    sections: 3,
  },
  card: {
    page: 'h-[150px] w-[116px] px-3 py-3.5 shadow-paper',
    name: 'h-[7px] w-[60%]',
    contact: 'mt-[4px] h-[3px] w-[42%]',
    section: 'mt-[11px]',
    heading: 'h-[4px] w-[32%]',
    line: 'mt-[3px] h-[2.5px]',
    sections: 3,
  },
  tile: {
    page: 'h-[94px] w-[72px] px-2 py-2.5 shadow-xs',
    name: 'h-[5px] w-[62%]',
    contact: 'mt-[3px] h-[2px] w-[44%]',
    section: 'mt-[8px]',
    heading: 'h-[3px] w-[34%]',
    line: 'mt-[2.5px] h-[2px]',
    sections: 2,
  },
}

/** Body lines per section. The last is short, so the block reads as prose that
 * ended rather than as a solid rectangle. */
const LINES = [0, 1, 2]

interface PaperMiniatureProps {
  templateId: TemplateId
  size: PaperMiniatureSize
  className?: string
}

export const PaperMiniature: React.FC<PaperMiniatureProps> = ({
  templateId,
  size,
  className,
}) => {
  const metrics = METRICS[size]

  return (
    <Box
      aria-hidden
      className={cn('resivo-paper rounded-[2px]', metrics.page, className)}
      data-template={templateId}
    >
      <Box className={cn(metrics.name, 'bg-[var(--paper-ink)]')} />
      <Box className={cn(metrics.contact, 'bg-[var(--paper-ink-muted)]')} />

      {Array.from({ length: metrics.sections }, (_, section) => (
        <Box className={metrics.section} key={section}>
          <Box className={cn(metrics.heading, 'bg-[var(--paper-accent)]')} />
          <Box className="mt-[2px] h-px bg-[var(--paper-rule)]" />
          {LINES.map((line) => (
            <Box
              className={cn(
                metrics.line,
                'bg-[var(--paper-ink-muted)] opacity-50',
                line === LINES.length - 1 ? 'w-[64%]' : 'w-full',
              )}
              key={line}
            />
          ))}
        </Box>
      ))}
    </Box>
  )
}
