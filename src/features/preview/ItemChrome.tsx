import { useSortable } from "@dnd-kit/sortable";

/**
 * The editing chrome around one flow item.
 *
 * Rendered only in the paged pass, and only in edit mode. That is the whole
 * reason page breaks cannot move when the editor is switched on: the measuring
 * pass renders the item without any of this, so the heights the paginator reads
 * are the heights of the printed document, not of the document plus its handles.
 *
 * The chrome is absolutely positioned in the item's own margin for the same
 * reason, belt to that braces: even if it did appear in a measured tree, it
 * would contribute no height.
 *
 * No Mantine and no Tailwind, this renders inside the preview iframe, which
 * loads neither. Everything it needs is in `frame.css`.
 */

interface ItemChromeProps {
  id: string;
  /** Disabled for the header, which has nowhere to move to. */
  movable: boolean;
  /** `null` when the move is impossible, first item, last item, nothing of its
   * kind in that direction. The button is rendered disabled rather than removed,
   * so the row of controls does not change width as an item moves. */
  onMoveUp?: (() => void) | null;
  onMoveDown?: (() => void) | null;
  onRemove?: () => void;
  /**
   * Controls for what this particular item is, an image's width, so far.
   *
   * Rendered on a second row of the chrome rather than beside the buttons: the
   * chrome sits in the page's margin, and growing it sideways would eventually
   * run off the paper, whereas growing it downwards costs nothing. It is inside
   * the chrome for the reason the chrome exists, the measuring pass does not
   * render any of this, so no control here can move a page break.
   */
  extra?: React.ReactNode;
  children: React.ReactNode;
  className: string;
}

export const ItemChrome: React.FC<ItemChromeProps> = ({
  id,
  movable,
  onMoveUp,
  onMoveDown,
  onRemove,
  extra,
  children,
  className,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
    isOver,
  } = useSortable({ id, disabled: !movable });

  /**
   * No transform is applied, unlike a normal sortable list.
   *
   * The items of one section can be split across two page boxes, so the
   * "translate everything below the gap downwards" animation a sorting strategy
   * produces would slide content off one page and not onto the next. The drop
   * position is shown with a rule instead, see `[data-over]` in `frame.css`.
   */
  return (
    <div
      className={className}
      data-dragging={isDragging ? "" : undefined}
      data-flow-id={id}
      data-over={isOver && !isDragging ? "" : undefined}
      ref={setNodeRef}
    >
      {movable ? (
        <div className="rp-chrome" contentEditable={false}>
          <div className="rp-chrome-row">
            <button
              aria-label="Drag to move"
              className="rp-chrome-grip"
              ref={setActivatorNodeRef}
              type="button"
              {...attributes}
              {...listeners}
            >
              {/* Six dots, drawn inline: the iframe has no icon font and no
                Mantine, and an SVG here would be the seventh copy of a glyph the
                app already ships. */}
              <span aria-hidden>⠿</span>
            </button>

            <button
              aria-label="Move up"
              className="rp-chrome-button"
              disabled={onMoveUp === null || onMoveUp === undefined}
              onClick={() => onMoveUp?.()}
              type="button"
            >
              <span aria-hidden>↑</span>
            </button>

            <button
              aria-label="Move down"
              className="rp-chrome-button"
              disabled={onMoveDown === null || onMoveDown === undefined}
              onClick={() => onMoveDown?.()}
              type="button"
            >
              <span aria-hidden>↓</span>
            </button>

            {onRemove === undefined ? null : (
              <button
                aria-label="Delete"
                className="rp-chrome-button rp-chrome-danger"
                onClick={onRemove}
                type="button"
              >
                <span aria-hidden>×</span>
              </button>
            )}
          </div>

          {extra === undefined ? null : (
            <div className="rp-chrome-row">{extra}</div>
          )}
        </div>
      ) : null}

      {children}
    </div>
  );
};
