import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Popover,
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
 * iframe, the iframe's body is transparent so this shows through. That division
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

/**
 * The narrowest pane that can hold the whole control row.
 *
 * Measured, not chosen: the row needs 538px at its shortest (one page, Letter),
 * and grows with the page count's digits, so this is that with room for the
 * count to reach three figures.
 */
const STRIP_MIN_WIDTH = 600

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

interface PreviewPaneProps {
  document: ResumeDocument
  onPaperSizeChange?: (size: PaperSize) => void
  /**
   * How an edit from the paper reaches the store. Its presence is what makes
   * Visual mode available at all, without it the toggle would offer a mode that
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
   * The paper is what the user is judging, whether it fits, whether it reads,
   * and edit chrome sits on top of exactly the thing being judged. Editing is a
   * mode you ask for.
   */
  const [editing, setEditing] = useState(false)

  /**
   * The breaks the paper measured.
   *
   * Reported by the frame rather than recomputed here, because they are a fact
   * about the rendered document: what an export contains should be what the user
   * can see, and pagination is a measurement, there is nothing to measure in a
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

  /**
   * Whether the strip has room for every control, or has to fold.
   *
   * Measured from the pane rather than asked of the viewport, because the pane
   * is what the row has to fit in and the two part company in both directions.
   * At a 768px viewport (an iPad held upright) the permanent sidebar leaves
   * this pane 536px and the full row wants 538. In the other direction, three
   * panes at 1200px leave the preview 258px, so a viewport that is "wide" by
   * any breakpoint still cannot show the row. Both were clipped; one number
   * covers both.
   *
   * Roomy until measured, so the row does not fold for a frame and then open.
   */
  const roomy = wellWidth === 0 || wellWidth >= STRIP_MIN_WIDTH

  const paperSizeControl =
    onPaperSizeChange === undefined ? null : (
      <SegmentedControl
        aria-label="Paper size"
        // `satisfies` rather than a cast: the literals are checked against
        // the model's sizes, and `onChange` still narrows to them.
        data={['Letter', 'A4'] satisfies Array<PaperSize>}
        onChange={onPaperSizeChange}
        size="xs"
        value={size}
      />
    )

  /**
   * The zoom cluster, built once and placed in one of two rows.
   *
   * Built as a value rather than duplicated into both branches, so the strip
   * and the popover cannot drift and there is never a second copy of these
   * controls in the document with the same accessible names.
   */
  const zoomControls = (
    <Box className="flex items-center gap-1">
      <Tooltip label="Zoom out">
        <UnstyledButton
          aria-label="Zoom out"
          className="text-muted hover:text-body hover:bg-hover rounded-control flex size-[22px] items-center justify-center"
          onClick={() => step(-1)}
        >
          <Icon name="minus" size={14} />
        </UnstyledButton>
      </Tooltip>

      {/* Monospace, because it is a number that changes in place, the design
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
  )

  const sheet = `${dimensions.width} × ${dimensions.height}`

  return (
    <section className={cn('flex min-h-0 flex-col', className)}>
      <OnboardingTour.Target id={TOUR_TARGET_IDS.paperTitlebar}>
        <header className="border-line-soft bg-surface flex h-titlebar flex-none items-center gap-3 border-b px-3">
          {/* The count stays at every width. The sheet's measurements follow it
              only when there is room, and move into the popover below. */}
          <Text span className="text-subtle flex-none font-mono text-[11px]">
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            {roomy ? ` · ${sheet}` : ''}
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

            {roomy ? (
              <>
                {paperSizeControl}
                {zoomControls}
              </>
            ) : (
              /* Everything the strip cannot hold, one tap away.

                 Not dropped, which is what it was: paper size, zoom and fit
                 were simply not on a phone at all. These are the same controls
                 moved rather than copied, so the document never holds a second
                 Letter/A4 or a second "Fit width". */
              <Popover
                position="bottom-end"
                radius="panel"
                shadow="lg"
                width={264}
                withArrow
              >
                <Popover.Target>
                  <UnstyledButton
                    aria-label="Paper and zoom"
                    className="text-muted hover:text-body hover:bg-hover rounded-control flex size-[24px] items-center justify-center"
                  >
                    <Icon name="sliders-horizontal" size={15} />
                  </UnstyledButton>
                </Popover.Target>

                <Popover.Dropdown>
                  <Box className="flex flex-col gap-3">
                    {paperSizeControl === null ? null : (
                      <Box className="flex items-center justify-between gap-3">
                        <Text className="text-muted text-[12px]" span>
                          Paper
                        </Text>
                        {paperSizeControl}
                      </Box>
                    )}

                    <Box className="flex items-center justify-between gap-3">
                      <Text className="text-muted text-[12px]" span>
                        Zoom
                      </Text>
                      {zoomControls}
                    </Box>

                    <Text className="text-subtle font-mono text-[11px]" span>
                      {sheet}
                    </Text>
                  </Box>
                </Popover.Dropdown>
              </Popover>
            )}
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
