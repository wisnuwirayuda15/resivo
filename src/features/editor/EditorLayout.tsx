import { useState } from 'react'
import { Splitter } from '@mantine/core'

import { PreviewPane } from '@/features/preview/PreviewPane'
import { StyleInspector } from '@/features/style/StyleInspector'
import { patchDesign } from '@/features/editor/mutations'

import { readPaneSizes, writePaneSizes } from './panels'

import type { PaneSize } from './panels'
import type { Recipe } from './mutations'
import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * The editor's panel layout.
 *
 * Two panes today — the preview and the style inspector. The code pane (Markdown
 * and CSS in Monaco) is the third, and it goes to the left of the preview when
 * it lands; the splitter, the minimums and the persistence are already sized for
 * that, so adding it is a pane rather than a rework.
 *
 * The inspector is a fixed `px` pane and the preview a flexible one, which is
 * what makes resizing the window widen the paper instead of the controls beside
 * it. Neither can collapse to nothing: a pane you cannot see is a pane you
 * cannot drag back.
 */

const PANE_COUNT = 2

/** The design system's inspector width, and the smallest it stays usable at. */
const INSPECTOR_DEFAULT = '288px'

const DEFAULT_SIZES: Array<PaneSize> = [100, INSPECTOR_DEFAULT]

interface EditorLayoutProps {
  document: ResumeDocument
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  document,
  apply,
}) => {
  /**
   * Read once, lazily, rather than in an effect. This component only ever mounts
   * inside a client-only boundary, so `localStorage` is there — and restoring in
   * an effect would show the default layout for a frame and then jump.
   */
  const [sizes, setSizes] = useState<Array<PaneSize>>(
    () => readPaneSizes(PANE_COUNT) ?? DEFAULT_SIZES,
  )

  return (
    <Splitter
      className="h-full"
      lineSize={1}
      onResizeEnd={(_handle, next) => writePaneSizes(PANE_COUNT, next)}
      onSizeChange={setSizes}
      sizes={sizes}
    >
      <Splitter.Pane defaultSize={100} min="340px">
        <PreviewPane
          className="h-full"
          document={document}
          onPaperSizeChange={(size) => apply(patchDesign({ paper: { size } }))}
        />
      </Splitter.Pane>

      <Splitter.Pane defaultSize={INSPECTOR_DEFAULT} max="45%" min="268px">
        <StyleInspector apply={apply} className="h-full" document={document} />
      </Splitter.Pane>
    </Splitter>
  )
}
