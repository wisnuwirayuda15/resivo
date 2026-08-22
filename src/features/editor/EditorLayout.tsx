import { useCallback, useState } from 'react'
import { Splitter } from '@mantine/core'

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
 */

const PANE_COUNT = 3

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

  return (
    <Splitter
      className="h-full"
      lineSize={1}
      onResizeEnd={(_handle, next) => writePaneSizes(PANE_COUNT, next)}
      onSizeChange={setSizes}
      sizes={sizes}
    >
      <Splitter.Pane defaultSize={CODE_DEFAULT} max="60%" min="280px">
        <CodePane
          className="h-full"
          document={document}
          onCustomCssChange={handleCustomCss}
          onSourceChange={handleSourceChange}
          warnings={warnings}
        />
      </Splitter.Pane>

      <Splitter.Pane defaultSize={100} min="340px">
        <PreviewPane
          apply={apply}
          className="h-full"
          document={document}
          onPaperSizeChange={(size) => apply(patchDesign({ paper: { size } }))}
          title={document.meta.fullName}
        />
      </Splitter.Pane>

      <Splitter.Pane defaultSize={INSPECTOR_DEFAULT} max="45%" min="268px">
        <StyleInspector apply={apply} className="h-full" document={document} />
      </Splitter.Pane>
    </Splitter>
  )
}
