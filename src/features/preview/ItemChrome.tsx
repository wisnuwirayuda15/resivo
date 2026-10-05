import { useState } from "react";

import { useSortable } from "@dnd-kit/sortable";

import { useTranslation } from "@/lib/i18n/useTranslation";

import type { DropEdge } from "./reorder";

/**
 * The editing chrome around one flow item.
 *
 * Rendered only in the paged pass, and only in edit mode. That is the whole
 * reason page breaks cannot move when the editor is switched on: the measuring
 * pass renders the item without any of this, so the heights the paginator reads
 * are the heights of the printed document, not of the document plus its handles.
 *
 * The chrome is absolutely positioned in the page's left margin for the same
 * reason, belt to that braces: even if it did appear in a measured tree, it
 * would contribute no height. It is two small buttons (a plus that duplicates,
 * and a grip that drags and, on a click, opens a menu), so it never covers the
 * dates at the item's right edge, which the earlier row of four buttons did.
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
  onDuplicate?: () => void;
  /**
   * The plus: a control that adds something after this item, a select of block
   * kinds drawn over a plus sign. Owned by the caller because what can be added
   * depends on the document; this only gives it its place beside the grip.
   */
  insert?: React.ReactNode;
  onRemove?: () => void;
  /**
   * Ask twice before removing. The first press only arms the button, which turns
   * red and says so, and the second does it; moving focus away disarms it. For a
   * delete that takes more with it than the thing under the pointer, a section
   * and every block in it. A native dialog would do, and there is no component
   * library in the iframe to draw a better one.
   */
  confirmRemove?: boolean;
  /** Where a drag in progress would land relative to this item, if it would. */
  dropEdge?: DropEdge;
  /**
   * Controls for what this particular item is, an image's width, so far.
   *
   * Rendered in the grip's menu, so the chrome stays two buttons wide whatever
   * the item is. It is inside the chrome for the reason the chrome exists, the
   * measuring pass does not render any of this, so no control here can move a
   * page break.
   */
  extra?: React.ReactNode;
  /**
   * Something drawn over the item itself rather than in the chrome's corner, an
   * image's resize handle. It has to be absolutely positioned and out of flow,
   * for the reason the chrome has to be.
   */
  overlay?: React.ReactNode;
  children: React.ReactNode;
  className: string;
}

export const ItemChrome: React.FC<ItemChromeProps> = ({
  id,
  movable,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  insert,
  onRemove,
  confirmRemove = false,
  dropEdge,
  extra,
  overlay,
  children,
  className,
}) => {
  const { t } = useTranslation("editor");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useSortable({ id, disabled: !movable });
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    setArmed(false);
  };

  /**
   * No transform is applied, unlike a normal sortable list.
   *
   * The items of one section can be split across two page boxes, so the
   * "translate everything below the gap downwards" animation a sorting strategy
   * produces would slide content off one page and not onto the next. The drop
   * position is shown with a rule instead, see `[data-drop]` in `editing.css`.
   */
  return (
    <div
      className={className}
      data-dragging={isDragging ? "" : undefined}
      data-flow-id={id}
      data-drop={isDragging ? undefined : dropEdge}
      ref={setNodeRef}
    >
      {movable ? (
        <div
          className="rp-chrome"
          contentEditable={false}
          data-open={open ? "" : undefined}
          onBlur={(event) => {
            // Focus leaving the whole chrome, not moving between its buttons.
            if (!event.currentTarget.contains(event.relatedTarget)) {
              close();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className="rp-chrome-row">
            {insert === undefined ? null : (
              <span className="rp-chrome-plus">
                <span aria-hidden>+</span>
                {insert}
              </span>
            )}

            <button
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label={t("chrome.drag")}
              className="rp-chrome-grip"
              ref={setActivatorNodeRef}
              title={t("chrome.drag")}
              type="button"
              {...attributes}
              {...listeners}
              aria-roledescription="sortable"
              onClick={() => {
                setOpen((current) => !current);
                setArmed(false);
              }}
              onKeyDown={(event) => {
                // Enter opens the menu, which is where a keyboard user finds
                // move, duplicate and delete. Space still picks the item up for
                // a keyboard drag, which dnd-kit starts from the same key press.
                if (event.key === "Enter") {
                  return;
                }

                (
                  listeners?.onKeyDown as
                    ((event: React.KeyboardEvent) => void) | undefined
                )?.(event);
              }}
            >
              {/* Six dots, drawn inline: the iframe has no icon font and no
                Mantine, and an SVG here would be the seventh copy of a glyph the
                app already ships. */}
              <span aria-hidden>⠿</span>
            </button>
          </div>

          {open ? (
            <div
              aria-label={t("chrome.menu")}
              className="rp-chrome-menu"
              role="menu"
            >
              <button
                className="rp-chrome-item"
                disabled={onMoveUp === null || onMoveUp === undefined}
                onClick={() => {
                  onMoveUp?.();
                  close();
                }}
                role="menuitem"
                type="button"
              >
                {t("chrome.moveUp")}
              </button>

              <button
                className="rp-chrome-item"
                disabled={onMoveDown === null || onMoveDown === undefined}
                onClick={() => {
                  onMoveDown?.();
                  close();
                }}
                role="menuitem"
                type="button"
              >
                {t("chrome.moveDown")}
              </button>

              {onDuplicate === undefined ? null : (
                <button
                  className="rp-chrome-item"
                  onClick={() => {
                    onDuplicate();
                    close();
                  }}
                  role="menuitem"
                  type="button"
                >
                  {t("chrome.duplicate")}
                </button>
              )}

              {extra === undefined ? null : (
                <div
                  className="rp-chrome-extra"
                  onClick={(event) => {
                    // A button in here has done its thing, and the menu is done.
                    if ((event.target as HTMLElement).closest("button")) {
                      close();
                    }
                  }}
                >
                  {extra}
                </div>
              )}

              {onRemove === undefined ? null : (
                <button
                  aria-label={
                    armed ? t("chrome.confirmDelete") : t("chrome.delete")
                  }
                  className="rp-chrome-item rp-chrome-danger"
                  data-armed={armed ? "" : undefined}
                  onClick={() => {
                    if (confirmRemove && !armed) {
                      setArmed(true);

                      return;
                    }

                    close();
                    onRemove();
                  }}
                  role="menuitem"
                  type="button"
                >
                  {armed ? t("chrome.sure") : t("chrome.delete")}
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {children}

      {overlay}
    </div>
  );
};
