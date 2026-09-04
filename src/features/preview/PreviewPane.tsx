import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  SegmentedControl,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'

import { OnboardingTour } from '@gfazioli/mantine-onboarding-tour'

import { Icon } from '@/features/icons/IconRenderer'
import { TOUR_TARGET_IDS } from '@/features/onboarding/steps'
import { ExportMenu } from '@/features/export/ExportMenu'

import { cn } from '@/lib/utils'

import { PreviewFrame } from './PreviewFrame'
import { PAGE_DIMENSIONS } from './css'

import type { Recipe } from '@/features/editor/mutations'
import type {
  PaperSize,
  ResumeDocument,
} from '@/features/resume/model/document'

/**
 * The preview panel: a header strip with page count, paper size and zoom, over
 * the well the paper floats in.
 *
 * The well's colour belongs to the app theme and is painted here, not in the
 * iframe — the iframe's body is transparent so this shows through. That division
 * is the reason the paper can stay light while the surrounding chrome goes dark.
 */

/** Magnifications the − and + controls step through. */
const ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2]

/** One CSS inch, by definition. */
const CSS_PX_PER_INCH = 96

const PAGE_WIDTH_INCHES: Record<PaperSize, number> = {
  Letter: 8.5,
  A4: 210 / 25.4,
}

/** The horizontal padding `.rp-pages` puts around the page, both sides. */
const WELL_PADDING = 40

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

interface PreviewPaneProps {
  document: ResumeDocument
  onPaperSizeChange?: (size: PaperSize) => void
  /**
   * How an edit from the paper reaches the store. Its presence is what makes
   * Visual mode available at all — without it the toggle would offer a mode that
   * cannot write.
   */
  apply?: (recipe: Recipe) => void
  /** The resume's title, for export file names. */
  title?: string
  className?: string
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  document: resume,
  onPaperSizeChange,
  apply,
  title = 'Resume',
  className,
}) => {
  const size = resume.design.paper.size

  const wellRef = useRef<HTMLDivElement | null>(null)
  const [wellWidth, setWellWidth] = useState(0)
  const [pageCount, setPageCount] = useState(1)

  /**
   * `null` means "fit the width", which is the default because a full page at
   * 100% does not fit a laptop pane and a resume is read as a whole page.
   * Choosing an explicit magnification pins it until the user asks to fit again.
   */
  const [pinnedZoom, setPinnedZoom] = useState<number | null>(null)

  /**
   * Read, not Visual, by default.
   *
   * The paper is what the user is judging — whether it fits, whether it reads —
   * and edit chrome sits on top of exactly the thing being judged. Editing is a
   * mode you ask for.
   */
  const [editing, setEditing] = useState(false)

  /**
   * The breaks the paper measured.
   *
   * Reported by the frame rather than recomputed here, because they are a fact
   * about the rendered document: what an export contains should be what the user
   * can see, and pagination is a measurement — there is nothing to measure in a
   * string. Both file exports and the print reuse these.
   */
  const [pages, setPages] = useState<ReadonlyArray<ReadonlyArray<string>>>()

  useEffect(() => {
    const well = wellRef.current

    if (well === null) {
      return
    }

    const observer = new ResizeObserver((entries) =>
      setWellWidth(entries[0]?.contentRect.width ?? 0),
    )

    observer.observe(well)

    return () => observer.disconnect()
  }, [])

  const fitZoom = useMemo(() => {
    if (wellWidth === 0) {
      return 1
    }

    const pageWidth = PAGE_WIDTH_INCHES[size] * CSS_PX_PER_INCH

    return clamp(
      Math.round(((wellWidth - WELL_PADDING) / pageWidth) * 100) / 100,
      0.25,
      2,
    )
  }, [wellWidth, size])

  const zoom = pinnedZoom ?? fitZoom

  const step = (direction: 1 | -1) => {
    const next =
      direction === 1
        ? ZOOM_STEPS.find((candidate) => candidate > zoom + 0.001)
        : [...ZOOM_STEPS]
            .reverse()
            .find((candidate) => candidate < zoom - 0.001)

    setPinnedZoom(next ?? clamp(zoom, ZOOM_STEPS[0] ?? 0.5, 2))
  }

  /** Stable, so it does not re-run the reporting effect inside the frame. */
  const handlePageCount = useCallback(
    (count: number) => setPageCount(count),
    [],
  )

  const handlePaginated = useCallback(
    (next: Array<Array<string>>) => setPages(next),
    [],
  )

  const dimensions = PAGE_DIMENSIONS[size]

  return (
    <section className={cn('flex min-h-0 flex-col', className)}>
      <OnboardingTour.Target id={TOUR_TARGET_IDS.paperTitlebar}>
        <header className="border-line-soft bg-surface flex h-titlebar flex-none items-center gap-3 border-b px-3">
          {/* The count stays at every width; the sheet's measurements go, since
              they are a reminder rather than something to act on and they are
              the widest thing in the row. */}
          <Text span className="text-subtle flex-none font-mono text-[11px]">
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            <Text component="span" visibleFrom="sm">
              {' · '}
              {dimensions.width} × {dimensions.height}
            </Text>
          </Text>

          <Box className="ml-auto flex items-center gap-1">
            <ExportMenu document={resume} pages={pages} title={title} />

            {apply === undefined ? null : (
              <SegmentedControl
                aria-label="Preview mode"
                data={[
                  { value: 'read', label: 'Read' },
                  { value: 'visual', label: 'Visual' },
                ]}
                onChange={(next) => setEditing(next === 'visual')}
                size="xs"
                value={editing ? 'visual' : 'read'}
              />
            )}

            {onPaperSizeChange === undefined ? null : (
              <SegmentedControl
                visibleFrom="sm"
                aria-label="Paper size"
                // `satisfies` rather than a cast: the literals are checked against
                // the model's sizes, and `onChange` still narrows to them.
                data={['Letter', 'A4'] satisfies Array<PaperSize>}
                onChange={onPaperSizeChange}
                size="xs"
                value={size}
              />
            )}

            {/* Zoom, only where there is room for it.

                Below `sm` the fit-to-width default is the only magnification
                that makes sense on a screen narrower than the page, and four
                more controls in a 38px row is what pushed this header — and
                with it the whole editor — 58px wider than the viewport. */}
            <Box className="flex items-center gap-1" visibleFrom="sm">
              <Tooltip label="Zoom out">
                <UnstyledButton
                  aria-label="Zoom out"
                  className="text-muted hover:text-body hover:bg-hover rounded-control flex size-[22px] items-center justify-center"
                  onClick={() => step(-1)}
                >
                  <Icon name="minus" size={14} />
                </UnstyledButton>
              </Tooltip>

              {/* Monospace, because it is a number that changes in place — the design
                system's rule for every numeric readout. */}
              <Text
                span
                className="text-subtle w-[3.5em] text-center font-mono text-[11px] tabular-nums"
              >
                {Math.round(zoom * 100)}%
              </Text>

              <Tooltip label="Zoom in">
                <UnstyledButton
                  aria-label="Zoom in"
                  className="text-muted hover:text-body hover:bg-hover rounded-control flex size-[22px] items-center justify-center"
                  onClick={() => step(1)}
                >
                  <Icon name="plus" size={14} />
                </UnstyledButton>
              </Tooltip>

              <Tooltip label="Fit width">
                <UnstyledButton
                  aria-label="Fit width"
                  aria-pressed={pinnedZoom === null}
                  className={cn(
                    'rounded-control flex size-[22px] items-center justify-center',
                    pinnedZoom === null
                      ? 'text-accent bg-selected'
                      : 'text-muted hover:text-body hover:bg-hover',
                  )}
                  onClick={() => setPinnedZoom(null)}
                >
                  <Icon name="arrows-horizontal" size={14} />
                </UnstyledButton>
              </Tooltip>
            </Box>
          </Box>
        </header>
      </OnboardingTour.Target>

      {/* The well, not the paper: the paper is inside an iframe, and nothing in
          this document can point at a node in another one. */}
      <OnboardingTour.Target id={TOUR_TARGET_IDS.paper}>
        <Box className="bg-sunken min-h-0 flex-1 overflow-hidden" ref={wellRef}>
          <PreviewFrame
            className="block size-full border-0 bg-transparent"
            apply={apply}
            document={resume}
            mode={editing && apply !== undefined ? 'edit' : 'view'}
            onPageCountChange={handlePageCount}
            onPaginated={handlePaginated}
            zoom={zoom}
          />
        </Box>
      </OnboardingTour.Target>
    </section>
  )
}
