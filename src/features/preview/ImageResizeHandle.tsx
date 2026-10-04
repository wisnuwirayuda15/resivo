import { useRef, useState } from "react";

import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * A handle on the right edge of an image, dragged to set its width.
 *
 * Rendered only in the paged pass, in edit mode, as an overlay of the item that
 * holds the figure, and absolutely positioned: like the rest of the chrome it
 * adds no height and is never measured, so it cannot move a page break.
 *
 * While the pointer is down it draws a ghost of the width it would commit and
 * leaves the figure alone. Resizing the figure live would re-measure and
 * re-paginate the whole document on every pointer move, for a number that is
 * only wanted once, on release, which is also what makes one drag one undo step.
 *
 * No Mantine and no Tailwind, this renders inside the preview iframe. Everything
 * it needs is in `editing.css`.
 */

interface ImageResizeHandleProps {
  /** The width the figure draws at now, as a percentage of the column. */
  percent: number;
  /** `undefined` is full width, which is stored as the absence of a width. */
  onResize: (percent: number | undefined) => void;
}

/** Narrower than this is not a picture any more, and is easy to reach by
 * accident when the pointer runs off the left edge. */
const MIN_PERCENT = 10;

/** At or past this the drag means "the whole column". A handle that has to be
 * dragged to exactly 100% is one that lands on 99 every second time. */
const SNAP_TO_FULL = 97;

const clampPercent = (value: number): number =>
  Math.max(MIN_PERCENT, Math.min(100, Math.round(value)));

export const ImageResizeHandle: React.FC<ImageResizeHandleProps> = ({
  percent,
  onResize,
}) => {
  const { t } = useTranslation("editor");
  const [ghost, setGhost] = useState<number | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);

  /**
   * The width the pointer is asking for.
   *
   * The item that holds the figure is the reference, so the percentage means what
   * it means everywhere else: a share of the text column. The page is zoomed with
   * CSS `zoom`, and a rectangle read inside it comes back in the same visual
   * pixels as the pointer, so the zoom cancels out of the ratio and needs no
   * correction here.
   */
  const widthAt = (clientX: number): number | null => {
    const item = handleRef.current?.parentElement;

    if (item === null || item === undefined) {
      return null;
    }

    const box = item.getBoundingClientRect();

    return box.width === 0
      ? null
      : clampPercent(((clientX - box.left) / box.width) * 100);
  };

  return (
    <>
      {ghost === null ? null : (
        <div
          aria-hidden
          className="rp-resize-ghost"
          style={{ width: `${ghost}%` }}
        >
          <span className="rp-resize-label">{`${ghost}%`}</span>
        </div>
      )}

      <div
        aria-label={t("chrome.resize")}
        className="rp-resize"
        data-active={ghost === null ? undefined : ""}
        onPointerCancel={() => setGhost(null)}
        onPointerDown={(event) => {
          // The primary button only, so a right click opens its menu and a
          // second finger does not start a second drag.
          if (event.button !== 0) {
            return;
          }

          event.preventDefault();
          // Captured, so the drag keeps following the pointer when it leaves the
          // handle, which at this width it does within a frame.
          event.currentTarget.setPointerCapture(event.pointerId);
          setGhost(widthAt(event.clientX) ?? percent);
        }}
        onPointerMove={(event) => {
          if (ghost === null) {
            return;
          }

          setGhost(widthAt(event.clientX) ?? ghost);
        }}
        onPointerUp={(event) => {
          if (ghost === null) {
            return;
          }

          const next = widthAt(event.clientX) ?? ghost;

          event.currentTarget.releasePointerCapture(event.pointerId);
          setGhost(null);

          if (next >= SNAP_TO_FULL) {
            if (percent !== 100) {
              onResize(undefined);
            }
          } else if (next !== percent) {
            onResize(next);
          }
        }}
        ref={handleRef}
        role="separator"
        style={{ left: `${percent}%` }}
      />
    </>
  );
};
