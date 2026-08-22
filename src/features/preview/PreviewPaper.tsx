import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'

import { loadedGlyphCount, onIconCatalogLoaded } from '@/features/icons/catalog'
import { removeBlock } from '@/features/editor/mutations'

import { resolveTemplate } from '@/features/templates/registry'

import { documentFlow, flowItemClass } from './flow'
import { ItemChrome } from './ItemChrome'
import { isMovable, moveRecipe, stepRecipe } from './reorder'
import { paginate } from './paginate'
import { renderFlow } from './renderFlow'

import type { DragEndEvent } from '@dnd-kit/core'
import type { Recipe } from '@/features/editor/mutations'
import type { ImageMap } from '@/features/assets/useAssetUrls'
import type { FlowItem } from './flow'
import type { FlowMetric } from './paginate'
import type {
  RenderContext,
  RenderMode,
} from '@/features/templates/renderer/types'
import type {
  DesignConfig,
  ResumeDocument,
  TemplateId,
} from '@/features/resume/model/document'

/**
 * The paper itself, rendered inside the preview iframe.
 *
 * Two passes. The first lays every flow item out in one continuous column at the
 * exact page width and measures it; the second distributes those items into page
 * boxes using the breaks the paginator chose. Both passes render the *same React
 * elements* — they are built once and placed twice — which is what guarantees
 * that what was measured is what appears.
 *
 * Plain `div`s and one inline style, unlike the rest of the app. Everything here
 * is portalled into the iframe, which loads no Mantine stylesheet and no
 * Tailwind, so `Box` would render a class with nothing behind it; the only rules
 * that reach this document are the ones `previewStylesheet` injects. The zoom is
 * inline because it is a live value and because `zoom` — unlike `transform` —
 * participates in layout, which is the whole reason it is used here.
 */

interface PreviewPaperProps {
  document: ResumeDocument
  /**
   * Bumped each time the iframe loads more typefaces. Not a rendering concern —
   * it is part of the pagination key, because heights measured against a
   * fallback face are wrong and must be discarded once the real face lands.
   */
  fontEpoch: number
  /**
   * Object URLs for the images this document references. Resolved by the host,
   * because reading a blob is asynchronous and this component is inside the
   * iframe, where a suspense boundary would blank the paper.
   */
  images: ImageMap
  /**
   * `edit` mounts the editing chrome and makes every field writable. The
   * measuring pass ignores it entirely — see below — so switching modes cannot
   * move a page break.
   */
  mode: RenderMode
  /** How an edit reaches the store. Required for `edit` to do anything. */
  apply?: (recipe: Recipe) => void
  /** 1 = 100%. */
  zoom: number
  /** Called whenever pagination settles on a different number of pages. */
  onPageCountChange?: (count: number) => void
  /**
   * Called with the flow-item ids on each page whenever pagination settles.
   *
   * Published rather than kept private because HTML export needs the breaks the
   * user is looking at. Pagination is a measurement, and there is nothing to
   * measure in a string — so export reuses this instead of estimating.
   */
  onPaginated?: (pages: Array<Array<string>>) => void
}

/** Everything that, if it changed, invalidates a set of page breaks. */
interface PaginationKey {
  items: Array<FlowItem>
  design: DesignConfig
  templateId: TemplateId
  fontEpoch: number
  /** Bumped when the icon catalog arrives — see below. */
  glyphEpoch: number
  /**
   * An image landing changes the height of whatever holds it, so the breaks
   * computed without it are wrong. Compared by identity, which is why
   * `useImageUrls` returns a map that only changes when its contents do.
   */
  images: ImageMap
  /** The iframe's width — see the observer below. */
  width: number
}

interface PaginationResult extends PaginationKey {
  pages: Array<Array<string>>
}

/**
 * Reads the measuring pass.
 *
 * Returns `null` when the numbers cannot be trusted — the iframe not laid out
 * yet, or a DOM that does not line up with the item list — so the caller leaves
 * the previous pagination in place rather than committing to a wrong one.
 */
const readMetrics = (
  root: HTMLElement,
  items: ReadonlyArray<FlowItem>,
): { metrics: Array<FlowMetric>; contentHeight: number } | null => {
  const probe = root.querySelector<HTMLElement>('[data-probe="page"]')

  if (probe === null || probe.clientHeight <= 0) {
    return null
  }

  // DOM order matches item order, so the index is the join — no attribute
  // selector, and no escaping of ids that contain a colon.
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>('[data-measure-flow] > [data-flow-id]'),
  )

  if (nodes.length !== items.length) {
    return null
  }

  // The iframe's own window, not the app's: computed styles must be read through
  // the view the element actually belongs to.
  const view = root.ownerDocument.defaultView

  if (view === null) {
    return null
  }

  const metrics: Array<FlowMetric> = []

  for (const [index, item] of items.entries()) {
    const node = nodes[index]

    if (node === undefined) {
      return null
    }

    const spaceBefore = Number.parseFloat(
      view.getComputedStyle(node).paddingTop,
    )

    metrics.push({
      id: item.id,
      height: node.getBoundingClientRect().height,
      // The stylesheet expresses leading space as padding precisely so it can be
      // read back here; a collapsed margin would measure as nothing.
      spaceBefore: Number.isFinite(spaceBefore) ? spaceBefore : 0,
      ...(item.keepWithNext === true ? { keepWithNext: true } : {}),
    })
  }

  return { metrics, contentHeight: probe.clientHeight }
}

export const PreviewPaper: React.FC<PreviewPaperProps> = ({
  document,
  fontEpoch,
  images,
  mode,
  apply,
  zoom,
  onPageCountChange,
  onPaginated,
}) => {
  /**
   * Glyphs load asynchronously, one file per weight, and one that appears after
   * pagination changes nothing about layout only because the reserved box is
   * exactly its size. Re-paginating anyway is the cheap insurance: if that
   * assumption is ever wrong, the breaks are corrected rather than left wrong.
   *
   * The count of loaded weights, not a boolean: a document mixing `regular` and
   * `duotone` gets its glyphs in two arrivals, and the second matters as much as
   * the first.
   */
  const glyphEpoch = useSyncExternalStore(
    onIconCatalogLoaded,
    loadedGlyphCount,
    () => 0,
  )

  const template = useMemo(
    () => resolveTemplate(document.templateId),
    [document.templateId],
  )
  const items = useMemo(() => documentFlow(document), [document])

  const context = useMemo<RenderContext>(
    () => ({
      locale: document.meta.locale,
      design: document.design,
      images,
      mode,
      /**
       * Deliberately absent unless editing. A field decides whether it is
       * writable by whether it was handed a way to write, so an export or a
       * print render cannot produce an editable node even by mistake.
       */
      ...(mode === 'edit' ? { apply } : {}),
    }),
    [document.meta.locale, document.design, images, mode, apply],
  )

  const rootRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [paged, setPaged] = useState<PaginationResult | null>(null)

  /**
   * Width is tracked rather than the whole size, because the page box is a fixed
   * physical size and only ever needs re-pagination when it is first laid out.
   * Watching height instead would feed back on itself: more pages makes the root
   * taller, which would trigger another pass.
   */
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const root = rootRef.current

    if (root === null) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0

      setWidth((previous) => (previous === measured ? previous : measured))
    })

    observer.observe(root)

    return () => observer.disconnect()
  }, [])

  const stale =
    paged === null ||
    paged.items !== items ||
    paged.design !== document.design ||
    paged.templateId !== document.templateId ||
    paged.fontEpoch !== fontEpoch ||
    paged.glyphEpoch !== glyphEpoch ||
    paged.images !== images ||
    paged.width !== width

  /**
   * Build every item's markup once, then place the same elements in both passes.
   *
   * Two separate renderings of "the same" content would be two things that could
   * diverge, and a divergence here means page breaks computed against markup
   * that never appears on screen.
   */
  const rendered = useMemo(
    () => renderFlow(document, template, context, items),
    [document, template, context, items],
  )

  const nodeById = useMemo(
    () => new Map(rendered.map(({ item, node }) => [item.id, node])),
    [rendered],
  )
  const itemById = useMemo(
    () => new Map(rendered.map(({ item }) => [item.id, item])),
    [rendered],
  )

  useLayoutEffect(() => {
    if (!stale) {
      return
    }

    const root = measureRef.current

    if (root === null) {
      return
    }

    const measured = readMetrics(root, items)

    if (measured === null) {
      return
    }

    setPaged({
      items,
      design: document.design,
      templateId: document.templateId,
      fontEpoch,
      glyphEpoch,
      images,
      width,
      pages: paginate(measured.metrics, measured.contentHeight),
    })
  }, [
    stale,
    items,
    document.design,
    document.templateId,
    fontEpoch,
    glyphEpoch,
    images,
    width,
  ])

  const pageCount = paged?.pages.length

  useEffect(() => {
    if (pageCount !== undefined) {
      onPageCountChange?.(pageCount)
    }
  }, [pageCount, onPageCountChange])

  const breaks = paged?.pages

  useEffect(() => {
    if (breaks !== undefined) {
      onPaginated?.(breaks)
    }
  }, [breaks, onPaginated])

  /**
   * A one-step keyboard move, or `null` when there is nowhere to go.
   *
   * Returned as a callback-or-null rather than a boolean plus a handler, so the
   * button renders disabled from the same fact that would make the move a
   * no-op — the two cannot disagree.
   */
  const step = (item: FlowItem, direction: -1 | 1) => {
    if (apply === undefined) {
      return null
    }

    const index = items.indexOf(item)
    const recipe =
      index === -1
        ? null
        : stepRecipe(document, items, { item, index }, direction)

    return recipe === null ? null : () => apply(recipe)
  }

  /**
   * Pointer and keyboard, because the keyboard path is not a nicety here: the
   * grip is the only affordance, and a control reachable by Tab that then does
   * nothing is worse than no control. The move buttons cover the same ground
   * with plain clicks, which is what a screen reader or a trackpad-averse user
   * gets.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // A few pixels of slop, so clicking a field inside a draggable item is a
      // click and not a one-pixel drag.
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (apply === undefined || over === null || active.id === over.id) {
      return
    }

    const subject = itemById.get(String(active.id))
    const target = itemById.get(String(over.id))

    if (subject === undefined || target === undefined) {
      return
    }

    const recipe = moveRecipe(document, subject, target)

    if (recipe !== null) {
      apply(recipe)
    }
  }

  const pageAttributes = {
    'data-template': document.templateId,
    'data-size': document.design.paper.size,
  }

  /**
   * The pages, and — while editing — the drag context around them.
   *
   * The context wraps only the paged pass. The measuring pass has no draggables
   * in it, which is what keeps drag measurement from seeing two copies of every
   * item.
   */
  const pages = (
    <div className="rp-pages" style={{ zoom: String(zoom) }}>
      {(paged?.pages ?? []).map((ids, index) => (
        <div
          className="resivo-paper rp-page"
          key={index}
          {...pageAttributes}
          aria-label={`Page ${index + 1}`}
          role="group"
        >
          <div className="rp-page-body" data-paged>
            {ids.map((id) => {
              const item = itemById.get(id)

              if (item === undefined) {
                return null
              }

              const node = nodeById.get(id)

              if (mode !== 'edit' || apply === undefined) {
                return (
                  <div className={flowItemClass(item.type)} key={id}>
                    {node}
                  </div>
                )
              }

              return (
                <ItemChrome
                  className={flowItemClass(item.type)}
                  id={id}
                  key={id}
                  movable={isMovable(item)}
                  onMoveDown={step(item, 1)}
                  onMoveUp={step(item, -1)}
                  onRemove={
                    item.type === 'block'
                      ? () =>
                          apply(
                            removeBlock(
                              item.sectionId ?? '',
                              item.blockId ?? '',
                            ),
                          )
                      : undefined
                  }
                >
                  {node}
                </ItemChrome>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="rp-root" ref={rootRef}>
      {/* The zoomed subtree. The measuring container is a sibling, never a
          descendant, because `zoom` scales the numbers it would read. */}
      {mode === 'edit' && apply !== undefined ? (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext items={items.map((item) => item.id)}>
            {pages}
          </SortableContext>
        </DndContext>
      ) : (
        pages
      )}

      {/**
       * Mounted only while a measurement is owed, so a settled preview does not
       * pay to render its content twice on every unrelated re-render.
       */}
      {stale ? (
        <div className="rp-measure" ref={measureRef}>
          {/* One page at its true height. Its content box is the number the
              paginator fills. */}
          <div className="resivo-paper rp-page rp-probe" {...pageAttributes}>
            <div className="rp-page-body" data-probe="page" />
          </div>

          <div className="resivo-paper rp-page" {...pageAttributes}>
            <div className="rp-page-body" data-measure-flow>
              {rendered.map(({ item, node }) => (
                <div
                  className={flowItemClass(item.type)}
                  data-flow-id={item.id}
                  key={item.id}
                >
                  {node}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
