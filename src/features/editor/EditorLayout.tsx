import { useCallback, useState } from 'react'
import { Splitter, Tabs } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

import { Icon } from '@/features/icons/IconRenderer'
import { PreviewPane } from '@/features/preview/PreviewPane'
import { StyleInspector } from '@/features/style/StyleInspector'
import { applyMarkdown } from '@/features/markdown/index'
import { patchDesign, setCustomCss } from '@/features/editor/mutations'

import { readPaneSizes, writePaneSizes } from './panels'
import { CodePane } from './CodePane'

import type { PaneSize } from './panels'
import type { Recipe } from './mutations'
import type { ParseWarning } from '@/features/markdown/index'
import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * The editor's three panels: code, preview, style.
 *
 * The code pane and the inspector are fixed `px` panes and the preview is the
 * flexible one, which is what makes widening the window widen the paper rather
 * than the controls beside it. None of the three can collapse to nothing: a pane
 * you cannot see is a pane you cannot drag back.
 *
 * Below `WIDE` the three become one, chosen by a tab strip. That is not a
 * preference: the minimums below add up to 888px of panes, plus two handles and
 * a 232px sidebar, so three panes need a 1122px viewport before anything is
 * even usable — and there was no fallback at all, so on a phone the editor
 * simply overflowed sideways.
 */

const PANE_COUNT = 3

/**
 * The breakpoint, and why it is this one.
 *
 * 1122px is the measured floor; Mantine's `lg` is the nearest token above it,
 * and rounding up rather than down means the three-pane layout is never offered
 * at a width where it is already cramped.
 */
const WIDE = '(min-width: 1200px)'

/** The design system's widths for the two side panels. */
const CODE_DEFAULT = '420px'
const INSPECTOR_DEFAULT = '288px'

const DEFAULT_SIZES: Array<PaneSize> = [CODE_DEFAULT, 100, INSPECTOR_DEFAULT]

interface EditorLayoutProps {
  document: ResumeDocument
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void
  replace: (document: ResumeDocument, options?: { coalesce?: string }) => void
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  document,
  apply,
  replace,
}) => {
  /**
   * Read once, lazily, rather than in an effect. This only ever mounts inside a
   * client-only boundary, so `localStorage` is there — and restoring in an
   * effect would show the default layout for a frame and then jump.
   */
  const [sizes, setSizes] = useState<Array<PaneSize>>(
    () => readPaneSizes(PANE_COUNT) ?? DEFAULT_SIZES,
  )
  const [warnings, setWarnings] = useState<Array<ParseWarning>>([])

  /**
   * Read during the first render rather than in an effect. This only mounts
   * inside a client-only boundary, so `matchMedia` is there — and deciding in
   * an effect would paint the wrong layout for a frame, which on a narrow screen
   * means a horizontal overflow appearing and vanishing.
   */
  const wide = useMediaQuery(WIDE, true, { getInitialValueInEffect: false })

  /**
   * Parsing lives here because this is what owns the store.
   *
   * Every edit from the text pane is one `replace` under a single coalesce key,
   * so a sentence typed in the editor collapses to one undo step rather than
   * one per debounce window — the same treatment the style panel's sliders get.
   */
  const handleSourceChange = useCallback(
    (source: string) => {
      const result = applyMarkdown(document, source)

      setWarnings(result.warnings)
      replace(result.document, { coalesce: 'markdown' })
    },
    [document, replace],
  )

  /**
   * Custom CSS is stored verbatim; the preview sanitizes it on the way out. One
   * coalesce key, so a stylesheet typed in one sitting is one undo step.
   */
  const handleCustomCss = useCallback(
    (css: string) => apply(setCustomCss(css), { coalesce: 'customCss' }),
    [apply],
  )

  const code = (
    <CodePane
      className="h-full"
      document={document}
      onCustomCssChange={handleCustomCss}
      onSourceChange={handleSourceChange}
      warnings={warnings}
    />
  )

  const preview = (
    <PreviewPane
      apply={apply}
      className="h-full"
      document={document}
      onPaperSizeChange={(size) => apply(patchDesign({ paper: { size } }))}
      title={document.meta.fullName}
    />
  )

  const inspector = (
    <StyleInspector apply={apply} className="h-full" document={document} />
  )

  if (!wide) {
    return (
      /**
       * One pane at a time.
       *
       * `keepMounted={false}` is load-bearing rather than an optimisation: an
       * inactive Mantine tab panel is `display: none`, so a preview left
       * mounted in one would measure its paper at zero width and paginate
       * against nonsense. Unmounting costs a re-pagination on each switch,
       * which is the right price for a paper that is always measured at the
       * width it is drawn at.
       *
       * The paper is the default tab because the document is the point; the
       * other two are things done to it.
       */
      <Tabs
        className="flex h-full min-h-0 flex-col"
        defaultValue="paper"
        keepMounted={false}
      >
        <Tabs.List
          aria-label="Editor panes"
          className="h-titlebar border-line-soft bg-surface flex-none border-b px-1"
        >
          <Tabs.Tab
            leftSection={<Icon name="markdown-logo" size={13} />}
            value="code"
          >
            Code
          </Tabs.Tab>
          <Tabs.Tab
            leftSection={<Icon name="file-text" size={13} />}
            value="paper"
          >
            Paper
          </Tabs.Tab>
          <Tabs.Tab
            leftSection={<Icon name="palette" size={13} />}
            value="style"
          >
            Style
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel className="min-h-0 flex-1" value="code">
          {code}
        </Tabs.Panel>
        <Tabs.Panel className="min-h-0 flex-1" value="paper">
          {preview}
        </Tabs.Panel>
        <Tabs.Panel className="min-h-0 flex-1" value="style">
          {inspector}
        </Tabs.Panel>
      </Tabs>
    )
  }

  return (
    <Splitter
      className="h-full"
      lineSize={1}
      onResizeEnd={(_handle, next) => writePaneSizes(PANE_COUNT, next)}
      onSizeChange={setSizes}
      sizes={sizes}
    >
      <Splitter.Pane defaultSize={CODE_DEFAULT} max="60%" min="280px">
        {code}
      </Splitter.Pane>

      <Splitter.Pane defaultSize={100} min="340px">
        {preview}
      </Splitter.Pane>

      <Splitter.Pane defaultSize={INSPECTOR_DEFAULT} max="45%" min="268px">
        {inspector}
      </Splitter.Pane>
    </Splitter>
  )
}
