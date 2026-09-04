/**
 * Remembering how wide the editor's panels were.
 *
 * A pane width is a UI preference, not part of the resume, so it lives in
 * `localStorage` and never in the document, otherwise dragging a splitter would
 * dirty the resume and cost an undo step.
 *
 * Stored per pane count. The editor grows a third pane when the Markdown and CSS
 * editors land, and a two-pane layout restored into a three-pane splitter would
 * be silently wrong, so the count is part of the key rather than something to
 * validate after the fact.
 */

import type { SplitterPaneSize } from '@mantine/hooks'

/**
 * Mantine's own pane size: a number or percentage string for a flexible pane, a
 * `px`/`rem` string for a fixed one. Aliased rather than re-described so a
 * restored layout is exactly what the splitter accepts.
 */
export type PaneSize = SplitterPaneSize

const STORAGE_PREFIX = 'resivo.editor.panels'

const storageKey = (paneCount: number): string =>
  `${STORAGE_PREFIX}.${paneCount}`

const SIZE_PATTERN = /^\d+(?:\.\d+)?(?:px|rem|%)$/

const isPaneSize = (value: unknown): value is PaneSize =>
  (typeof value === 'number' && Number.isFinite(value) && value >= 0) ||
  (typeof value === 'string' && SIZE_PATTERN.test(value))

/**
 * Reads a stored layout, or `null` if there is nothing usable.
 *
 * Everything about the stored value is treated as untrusted: it may have been
 * written by an older build, hand-edited, or left behind by a layout that no
 * longer exists. A `null` means "use the defaults", which is always a correct
 * answer, so nothing here throws.
 */
export const readPaneSizes = (paneCount: number): Array<PaneSize> | null => {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const raw = localStorage.getItem(storageKey(paneCount))

  if (raw === null) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    if (
      Array.isArray(parsed) &&
      parsed.length === paneCount &&
      parsed.every(isPaneSize)
    ) {
      return parsed
    }
  } catch {
    // Unparseable means a corrupt entry, which is exactly the case the defaults
    // exist for.
  }

  return null
}

export const writePaneSizes = (
  paneCount: number,
  sizes: ReadonlyArray<PaneSize>,
): void => {
  if (typeof localStorage === 'undefined' || sizes.length !== paneCount) {
    return
  }

  try {
    localStorage.setItem(storageKey(paneCount), JSON.stringify(sizes))
  } catch {
    // Storage can be full or blocked outright by the browser's privacy settings.
    // Losing a remembered pane width is not worth failing an edit session over.
  }
}
