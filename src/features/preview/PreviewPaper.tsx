import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";

import {
  loadedGlyphCount,
  onIconCatalogLoaded,
} from "@/features/icons/catalog";
import {
  addBlock,
  duplicateBlock,
  removeBlock,
  removeSection,
  setImageWidth,
  setSectionBreakBefore,
} from "@/features/editor/mutations";

import { createId } from "@/lib/id";
import {
  INSERTABLE_BLOCK_KINDS,
  createBlock,
} from "@/features/resume/model/factory";
import { resolveTemplate } from "@/features/templates/registry";

import { documentFlow, flowItemClass } from "./flow";
import { ImageResizeHandle } from "./ImageResizeHandle";
import { ItemChrome } from "./ItemChrome";
import { dropMark, isMovable, moveRecipe, stepRecipe } from "./reorder";
import { paginate } from "./paginate";
import { renderFlow } from "./renderFlow";
import { useTranslation } from "@/lib/i18n/useTranslation";

import type { DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import type { DropMark } from "./reorder";
import type { Recipe } from "@/features/editor/mutations";
import type { InsertableBlockKind } from "@/features/resume/model/factory";
import type { ImageMap } from "@/features/assets/useAssetUrls";
import type { FlowItem } from "./flow";
import type { FlowMetric } from "./paginate";
import type {
  RenderContext,
  RenderMode,
} from "@/features/templates/renderer/types";
import type {
  Block,
  DesignConfig,
  ResumeDocument,
  TemplateId,
} from "@/features/resume/model/document";

/** How close to the top or bottom of the window a held drag starts to scroll
 * the page, and the most it scrolls in a frame. 56 is about the height of a
 * heading, which is the thing being aimed at on the page below; 18 crosses a
 * page of this height in a couple of seconds, which is quick and still
 * stoppable. */
const AUTOSCROLL_EDGE_PX = 56;
const AUTOSCROLL_MAX_PX = 18;

/**
 * The paper itself, rendered inside the preview iframe.
 *
 * Two passes. The first lays every flow item out in one continuous column at the
 * exact page width and measures it; the second distributes those items into page
 * boxes using the breaks the paginator chose. Both passes render the *same React
 * elements* (they are built once and placed twice), which is what guarantees
 * that what was measured is what appears.
 *
 * Plain `div`s and one inline style, unlike the rest of the app. Everything here
 * is portalled into the iframe, which loads no Mantine stylesheet and no
 * Tailwind, so `Box` would render a class with nothing behind it; the only rules
 * that reach this document are the ones `previewStylesheet` injects. The zoom is
 * inline because it is a live value and because `zoom`, unlike `transform`,
 * participates in layout, which is the whole reason it is used here.
 */

interface PreviewPaperProps {
  document: ResumeDocument;
  /**
   * Bumped each time the iframe loads more typefaces. Not a rendering concern,
   * it is part of the pagination key, because heights measured against a
   * fallback face are wrong and must be discarded once the real face lands.
   */
  fontEpoch: number;
  /**
   * Object URLs for the images this document references. Resolved by the host,
   * because reading a blob is asynchronous and this component is inside the
   * iframe, where a suspense boundary would blank the paper.
   */
  images: ImageMap;
  /**
   * `edit` mounts the editing chrome and makes every field writable. The
   * measuring pass ignores it entirely (see below), so switching modes cannot
   * move a page break.
   */
  mode: RenderMode;
  /** How an edit reaches the store. Required for `edit` to do anything. */
  apply?: (recipe: Recipe) => void;
  /** 1 = 100%. */
  zoom: number;
  /** Called whenever pagination settles on a different number of pages. */
  onPageCountChange?: (count: number) => void;
  /**
   * Called with the flow-item ids on each page whenever pagination settles.
   *
   * Published rather than kept private because HTML export needs the breaks the
   * user is looking at. Pagination is a measurement, and there is nothing to
   * measure in a string, so export reuses this instead of estimating.
   *
   * The second argument is the document those breaks were measured for. It is
   * what lets a reader that is not in this tree (the ATS tab) know whether a
   * page count is about the document in front of it or about an earlier one.
   */
  onPaginated?: (pages: Array<Array<string>>, measured: ResumeDocument) => void;
}

/** Everything that, if it changed, invalidates a set of page breaks. */
interface PaginationKey {
  items: Array<FlowItem>;
  design: DesignConfig;
  templateId: TemplateId;
  fontEpoch: number;
  /** Bumped when the icon catalog arrives, see below. */
  glyphEpoch: number;
  /**
   * An image landing changes the height of whatever holds it, so the breaks
   * computed without it are wrong. Compared by identity, which is why
   * `useImageUrls` returns a map that only changes when its contents do.
   */
  images: ImageMap;
  /** Whether the frame has been laid out yet, see the observer below. */
  laidOut: boolean;
}

interface PaginationResult extends PaginationKey {
  pages: Array<Array<string>>;
  /** The document the pages were measured for. Not part of the key above: it
   * is implied by `items`, which is memoised on it, and carrying it there
   * would only be a second way to say the same thing. */
  document: ResumeDocument;
}

/**
 * Reads the measuring pass.
 *
 * Returns `null` when the numbers cannot be trusted (the iframe not laid out
 * yet, or a DOM that does not line up with the item list), so the caller leaves
 * the previous pagination in place rather than committing to a wrong one.
 */
const readMetrics = (
  root: HTMLElement,
  items: ReadonlyArray<FlowItem>,
): { metrics: Array<FlowMetric>; contentHeight: number } | null => {
  const probe = root.querySelector<HTMLElement>('[data-probe="page"]');

  if (probe === null || probe.clientHeight <= 0) {
    return null;
  }

  // DOM order matches item order, so the index is the join, no attribute
  // selector, and no escaping of ids that contain a colon.
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>("[data-measure-flow] > [data-flow-id]"),
  );

  if (nodes.length !== items.length) {
    return null;
  }

  // The iframe's own window, not the app's: computed styles must be read through
  // the view the element actually belongs to.
  const view = root.ownerDocument.defaultView;

  if (view === null) {
    return null;
  }

  const metrics: Array<FlowMetric> = [];

  for (const [index, item] of items.entries()) {
    const node = nodes[index];

    if (node === undefined) {
      return null;
    }

    const spaceBefore = Number.parseFloat(
      view.getComputedStyle(node).paddingTop,
    );

    metrics.push({
      id: item.id,
      height: node.getBoundingClientRect().height,
      // The stylesheet expresses leading space as padding precisely so it can be
      // read back here; a collapsed margin would measure as nothing.
      spaceBefore: Number.isFinite(spaceBefore) ? spaceBefore : 0,
      ...(item.keepWithNext === true ? { keepWithNext: true } : {}),
      ...(item.breakBefore === true ? { breakBefore: true } : {}),
    });
  }

  return { metrics, contentHeight: probe.clientHeight };
};

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
  const { t } = useTranslation("editor");
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
  );

  const template = useMemo(
    () => resolveTemplate(document.templateId),
    [document.templateId],
  );
  const items = useMemo(
    () =>
      documentFlow(document, {
        keepHeadingWithContent:
          document.design.pagination?.keepHeadingWithContent,
      }),
    [document],
  );

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
      ...(mode === "edit" ? { apply } : {}),
    }),
    [document.meta.locale, document.design, images, mode, apply],
  );

  const rootRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [paged, setPaged] = useState<PaginationResult | null>(null);

  /**
   * Whether the root has been laid out at all, not how wide it is.
   *
   * The page box is a fixed physical size, so the container's width cannot
   * change what the paginator measures. What it can do is be zero, before the
   * first layout, and `readMetrics` has nothing to read then. So one bit is the
   * whole requirement: has this been laid out yet.
   *
   * It was the width, and that was a feedback loop. The chain: the well's width
   * sets the zoom, `zoom` participates in layout inside the frame, so the
   * frame's own scrollbar appears or disappears, which changes this element's
   * width by the width of a scrollbar, which re-ran a pagination that could only
   * produce the same pages, and each pass could move the scrollbar again. Most
   * geometries settled after a few rounds; at the wrong one it never settled,
   * and React stops a chain of nested updates at 50 with "Maximum update depth
   * exceeded". Repeatedly collapsing the sidebar is a way to walk the zoom
   * across those geometries one after another.
   *
   * Watching height would have fed back on itself even more obviously: more
   * pages makes the root taller.
   */
  const [laidOut, setLaidOut] = useState(false);

  useEffect(() => {
    const root = rootRef.current;

    if (root === null) {
      return;
    }

    /**
     * One transition, false to true, and never back.
     *
     * A width of zero after the first layout means the pane was hidden, not that
     * the pagination became invalid, and going back would throw away pages that
     * are still correct only to compute them again on the way in.
     */
    const observer = new ResizeObserver((entries) => {
      if ((entries[0]?.contentRect.width ?? 0) > 0) {
        setLaidOut(true);
      }
    });

    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  const stale =
    paged === null ||
    paged.items !== items ||
    paged.design !== document.design ||
    paged.templateId !== document.templateId ||
    paged.fontEpoch !== fontEpoch ||
    paged.glyphEpoch !== glyphEpoch ||
    paged.images !== images ||
    paged.laidOut !== laidOut;

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
  );

  const nodeById = useMemo(
    () => new Map(rendered.map(({ item, node }) => [item.id, node])),
    [rendered],
  );
  const itemById = useMemo(
    () => new Map(rendered.map(({ item }) => [item.id, item])),
    [rendered],
  );

  useLayoutEffect(() => {
    if (!stale) {
      return;
    }

    const root = measureRef.current;

    if (root === null) {
      return;
    }

    const measured = readMetrics(root, items);

    if (measured === null) {
      return;
    }

    setPaged({
      items,
      design: document.design,
      templateId: document.templateId,
      fontEpoch,
      glyphEpoch,
      images,
      laidOut,
      pages: paginate(measured.metrics, measured.contentHeight),
      document,
    });
  }, [
    stale,
    items,
    document.design,
    document.templateId,
    fontEpoch,
    glyphEpoch,
    images,
    laidOut,
  ]);

  const pageCount = paged?.pages.length;

  useEffect(() => {
    if (pageCount !== undefined) {
      onPageCountChange?.(pageCount);
    }
  }, [pageCount, onPageCountChange]);

  const breaks = paged?.pages;
  const measuredDocument = paged?.document;

  useEffect(() => {
    if (breaks !== undefined && measuredDocument !== undefined) {
      onPaginated?.(breaks, measuredDocument);
    }
  }, [breaks, measuredDocument, onPaginated]);

  /**
   * A one-step keyboard move, or `null` when there is nowhere to go.
   *
   * Returned as a callback-or-null rather than a boolean plus a handler, so the
   * button renders disabled from the same fact that would make the move a
   * no-op, the two cannot disagree.
   */
  const step = (item: FlowItem, direction: -1 | 1) => {
    if (apply === undefined) {
      return null;
    }

    const index = items.indexOf(item);
    const recipe =
      index === -1
        ? null
        : stepRecipe(document, items, { item, index }, direction);

    return recipe === null ? null : () => apply(recipe);
  };

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
  );

  /**
   * Where the drag in progress would land, for the rule that says so.
   *
   * State, not derived on render: it is a function of the pointer, which dnd-kit
   * reports through `onDragOver`, and only the item it names should re-render.
   */
  const [mark, setMark] = useState<DropMark | null>(null);

  const [dragging, setDragging] = useState(false);

  const startDrag = () => setDragging(true);

  const endDrag = () => {
    setDragging(false);
    setMark(null);
  };

  /**
   * Scrolls the page while a drag is held near its top or bottom edge.
   *
   * dnd-kit has its own, and it did not scroll here: measured, a drag held in the
   * bottom band of the window left `scrollTop` at 0. Most likely because it
   * follows the dragged item, and the item stays where it is (see `ItemChrome`,
   * which applies no transform, because a sliding animation would move content
   * off one page without it appearing on the next) while only the pointer moves.
   * So the pointer is what is watched here, and a drop onto the next page would
   * otherwise be out of reach in any document longer than the window, which is
   * every document that has a next page.
   *
   * The speed rises with how far into the edge band the pointer is, so it can be
   * stopped by easing off and not only by leaving. The loop runs on the iframe's
   * own frames, and reads the pointer from the iframe's own events: a pointer
   * that has left the iframe sends nothing here, which is the right moment to stop.
   */
  useEffect(() => {
    const root = rootRef.current;
    const doc = root?.ownerDocument;
    const view = doc?.defaultView;

    if (!dragging || doc === undefined || view === null || view === undefined) {
      return undefined;
    }

    let pointerY: number | null = null;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      pointerY = event.clientY;
    };

    const tick = () => {
      if (pointerY !== null) {
        const height = view.innerHeight;
        const speed =
          pointerY < AUTOSCROLL_EDGE_PX
            ? -(AUTOSCROLL_EDGE_PX - pointerY) / AUTOSCROLL_EDGE_PX
            : pointerY > height - AUTOSCROLL_EDGE_PX
              ? (pointerY - (height - AUTOSCROLL_EDGE_PX)) / AUTOSCROLL_EDGE_PX
              : 0;

        if (speed !== 0) {
          doc.scrollingElement?.scrollBy(
            0,
            Math.max(-1, Math.min(1, speed)) * AUTOSCROLL_MAX_PX,
          );
        }
      }

      frame = view.requestAnimationFrame(tick);
    };

    doc.addEventListener("pointermove", onMove);
    frame = view.requestAnimationFrame(tick);

    return () => {
      doc.removeEventListener("pointermove", onMove);
      view.cancelAnimationFrame(frame);
    };
  }, [dragging]);

  const handleDragOver = (event: DragOverEvent) => {
    const subject = itemById.get(String(event.active.id));
    const target =
      event.over === null ? undefined : itemById.get(String(event.over.id));

    setMark(
      subject === undefined || target === undefined
        ? null
        : dropMark(document, items, subject, target),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    endDrag();

    const { active, over } = event;

    if (apply === undefined || over === null || active.id === over.id) {
      return;
    }

    const subject = itemById.get(String(active.id));
    const target = itemById.get(String(over.id));

    if (subject === undefined || target === undefined) {
      return;
    }

    const recipe = moveRecipe(document, subject, target);

    if (recipe !== null) {
      apply(recipe);
    }
  };

  const pageAttributes = {
    "data-template": document.templateId,
    "data-size": document.design.paper.size,
  };

  /**
   * Per-item controls, on the chrome's second row.
   *
   * Everything here is chrome, which is the only reason a control may sit on the
   * paper at all: chrome is rendered in the paged pass alone and positioned in
   * the page's margin, so nothing here is measured and nothing here can move a
   * break.
   */
  const itemControls = (item: FlowItem): React.ReactNode => {
    if (item.type === "header" || apply === undefined) {
      return undefined;
    }

    const section = document.content.sections.find(
      (candidate) => candidate.id === item.sectionId,
    );

    if (section === undefined) {
      return undefined;
    }

    // A heading is not a block, so what follows it is the top of its section.
    // That is the same place a block dropped on a heading goes (see `reorder.ts`).
    const insertAt =
      item.type === "sectionHeading"
        ? 0
        : section.blocks.findIndex(
            (candidate) => candidate.id === item.blockId,
          ) + 1;

    if (item.type === "block" && insertAt === 0) {
      return undefined;
    }

    const insert = (
      <select
        aria-label={t("chrome.insert")}
        className="rp-chrome-select"
        onChange={(event) => {
          const kind = event.currentTarget.value as InsertableBlockKind;

          apply(addBlock(section.id, createBlock(kind), insertAt));
        }}
        value=""
      >
        <option disabled value="">
          {t("chrome.insertPlaceholder")}
        </option>
        {INSERTABLE_BLOCK_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {t(`chrome.blocks.${kind}`)}
          </option>
        ))}
      </select>
    );

    if (item.type === "sectionHeading") {
      const breaksBefore = section.style?.breakBefore === "page";

      return (
        <>
          {insert}
          <button
            aria-label={
              breaksBefore
                ? t("chrome.sectionBreakOff")
                : t("chrome.sectionBreak")
            }
            aria-pressed={breaksBefore}
            className="rp-chrome-button"
            onClick={() =>
              apply(
                setSectionBreakBefore(
                  section.id,
                  breaksBefore ? "auto" : "page",
                ),
              )
            }
            type="button"
          >
            <span aria-hidden>⤓</span>
          </button>
        </>
      );
    }

    const imageWidth = widthControl(item);
    const isBreak = section.blocks[insertAt - 1]?.kind === "pageBreak";

    return (
      <>
        {insert}
        {/* Not offered on a break itself, two in a row means a blank page,
            which nobody reaches for from this button. Deleting one is the
            chrome's own × above. */}
        {isBreak ? null : (
          <button
            aria-label={t("chrome.insertBreak")}
            className="rp-chrome-button"
            onClick={() =>
              apply(
                addBlock(
                  section.id,
                  { id: createId(), kind: "pageBreak" },
                  insertAt,
                ),
              )
            }
            type="button"
          >
            <span aria-hidden>⤓</span>
          </button>
        )}
        {imageWidth}
      </>
    );
  };

  /**
   * The handle that drags an image's width, or nothing for any other item.
   *
   * It sets the same `widthPercent` the dropdown does, through the same recipe,
   * so the two cannot disagree: the dropdown stays as the way to do it from the
   * keyboard, which a drag is not.
   */
  const resizeHandle = (item: FlowItem): React.ReactNode => {
    if (item.type !== "block" || apply === undefined) {
      return undefined;
    }

    const block = document.content.sections
      .find((section) => section.id === item.sectionId)
      ?.blocks.find((candidate) => candidate.id === item.blockId);

    if (block?.kind !== "image") {
      return undefined;
    }

    return (
      <ImageResizeHandle
        onResize={(next) =>
          apply(setImageWidth(item.sectionId ?? "", item.blockId ?? "", next))
        }
        percent={block.widthPercent ?? 100}
      />
    );
  };

  /** The kind of block a flow item stands for, or `undefined` for a heading. */
  const blockKind = (item: FlowItem): Block["kind"] | undefined =>
    document.content.sections
      .find((section) => section.id === item.sectionId)
      ?.blocks.find((candidate) => candidate.id === item.blockId)?.kind;

  /**
   * The width control for an image block, or nothing for any other item.
   *
   * `widthPercent` was in the model, the Markdown codec and the renderer from
   * the start with no control anywhere, so an image inserted from the Assets
   * panel was full width for ever and the only way to change it was to type the
   * directive's `width` attribute by hand.
   *
   * 100 writes `undefined` rather than the number: a figure with no inline width
   * is already full width, and storing the default would put a redundant
   * attribute into every exported Markdown file.
   */
  const widthControl = (item: FlowItem): React.ReactNode => {
    if (item.type !== "block" || apply === undefined) {
      return undefined;
    }

    const block = document.content.sections
      .find((section) => section.id === item.sectionId)
      ?.blocks.find((candidate) => candidate.id === item.blockId);

    if (block?.kind !== "image") {
      return undefined;
    }

    return (
      <select
        aria-label={t("chrome.imageWidth")}
        className="rp-chrome-select"
        onChange={(event) => {
          const next = Number(event.currentTarget.value);

          apply(
            setImageWidth(
              item.sectionId ?? "",
              item.blockId ?? "",
              next === 100 ? undefined : next,
            ),
          );
        }}
        value={block.widthPercent ?? 100}
      >
        <option value={25}>25%</option>
        <option value={33}>33%</option>
        <option value={50}>50%</option>
        <option value={75}>75%</option>
        <option value={100}>100%</option>
      </select>
    );
  };

  /**
   * The pages, and (while editing) the drag context around them.
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
          aria-label={t("preview.page", { number: index + 1 })}
          role="group"
        >
          <div className="rp-page-body" data-paged>
            {ids.map((id) => {
              const item = itemById.get(id);

              if (item === undefined) {
                return null;
              }

              const node = nodeById.get(id);

              if (mode !== "edit" || apply === undefined) {
                return (
                  <div className={flowItemClass(item.type)} key={id}>
                    {node}
                  </div>
                );
              }

              return (
                <ItemChrome
                  className={flowItemClass(item.type)}
                  extra={itemControls(item)}
                  id={id}
                  key={id}
                  movable={isMovable(item)}
                  overlay={resizeHandle(item)}
                  onMoveDown={step(item, 1)}
                  onMoveUp={step(item, -1)}
                  onDuplicate={
                    item.type === "block" && blockKind(item) !== "pageBreak"
                      ? () =>
                          apply(
                            duplicateBlock(
                              item.sectionId ?? "",
                              item.blockId ?? "",
                            ),
                          )
                      : undefined
                  }
                  confirmRemove={item.type === "sectionHeading"}
                  dropEdge={mark?.id === id ? mark.edge : undefined}
                  onRemove={
                    item.type === "block"
                      ? () =>
                          apply(
                            removeBlock(
                              item.sectionId ?? "",
                              item.blockId ?? "",
                            ),
                          )
                      : item.type === "sectionHeading"
                        ? () => apply(removeSection(item.sectionId ?? ""))
                        : undefined
                  }
                >
                  {node}
                </ItemChrome>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="rp-root"
      ref={rootRef}
      style={
        {
          // Read by `.rp-editable:empty::before` in `editing.css`. A custom
          // property because that pseudo-element can only see its own element's
          // attributes, and the words have to come from `t()`. On the root, not
          // on the pages: the measuring container is a sibling of them, and it
          // has to count the same line the pages draw.
          "--rp-placeholder": JSON.stringify(t("chrome.placeholder")),
        } as React.CSSProperties
      }
    >
      {/* The zoomed subtree. The measuring container is a sibling, never a
          descendant, because `zoom` scales the numbers it would read. */}
      {mode === "edit" && apply !== undefined ? (
        <DndContext
          collisionDetection={closestCenter}
          autoScroll={false}
          onDragCancel={endDrag}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={startDrag}
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
  );
};
