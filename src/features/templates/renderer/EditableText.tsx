import { useCallback, useEffect, useRef, useState } from "react";

import { InlineTextView } from "./inline";
import { domToInline } from "./domInline";

import type { InlineText } from "@/features/resume/model/document";
import type { RenderContext } from "./types";

/**
 * One editable field on the paper.
 *
 * Field-level, not a document-wide `contentEditable`. A single editable root
 * would let the browser restructure the whole resume (merging paragraphs,
 * splitting entries, inventing `<div>`s), and every one of those would have to
 * be diffed back into a typed model. Here the browser can only edit *inside* one
 * field, so the shape of the document is never in question and only its text is.
 *
 * In `view` and `print` mode this renders exactly what `InlineTextView` renders,
 * with no wrapper and no attributes. That is not an optimisation but the
 * guarantee: what is measured, printed and exported is byte-identical whether or
 * not the editor exists.
 */

/**
 * The field that should open for editing the next time it renders, if any.
 *
 * A key rather than a prop threaded down from the document, because the thing
 * that asks (Enter at the end of a bullet) and the thing that answers (the new
 * bullet, which does not exist until the document has changed) are in different
 * places and only meet after a render. It expires: a request nobody answers must
 * not open some field a second later, when an undo happens to bring the same key
 * back.
 */
let pendingFocus: { key: string; at: number } | null = null;

const FOCUS_REQUEST_TTL_MS = 1000;

/** Asks the field with this `focusKey` to open once it has rendered. */
export const requestFocus = (key: string): void => {
  pendingFocus = { key, at: Date.now() };
};

const takeFocusRequest = (key: string): boolean => {
  if (
    pendingFocus === null ||
    pendingFocus.key !== key ||
    Date.now() - pendingFocus.at > FOCUS_REQUEST_TTL_MS
  ) {
    return false;
  }

  pendingFocus = null;

  return true;
};

interface EditableTextProps {
  value: InlineText;
  context: RenderContext;
  /** Called with the field's new content when the user commits. */
  onCommit?: (value: InlineText) => void;
  /**
   * Enter, for a field that is one item of a list: the item's own text, so the
   * caller can store it and add the next item in one recipe, which is one undo
   * step. Without it Enter just commits.
   */
  onBreak?: (value: InlineText) => void;
  /** Backspace in a field with nothing in it: the item is asked to go. */
  onRemoveEmpty?: () => void;
  /** Alt and an arrow key: the item's text, and which way it wants to move. */
  onMove?: (direction: -1 | 1, value: InlineText) => void;
  /** Names this field for `requestFocus`. */
  focusKey?: string;
  /** Shown in the tooltip and used as the accessible name of the editable box. */
  label: string;
}

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  context,
  onCommit,
  onBreak,
  onRemoveEmpty,
  onMove,
  focusKey,
  label,
}) => {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  /** The caret goes to the end when a field was opened by `requestFocus`, so
   * stepping back into the previous bullet lets you carry on writing it. */
  const caretAtEnd = useRef(false);

  /**
   * Set when a key already handed the text to its caller, so the blur that
   * follows (the element is removed under the caret) does not commit it a second
   * time. A second commit is not harmless: after a move it would write the text
   * to the position the item has just left, over whichever item is there now.
   */
  const handed = useRef(false);

  /**
   * Bumped on every commit and every abandon, and used as the key on both
   * branches below.
   *
   * Both render a `span`, so without a changing key React reconciles them in
   * place, and the DOM it would patch is not the DOM it last rendered, because
   * the browser has been writing into it. Diffing the old virtual children
   * against the new ones then lands the patches on nodes that have moved.
   * Changing the key forces a fresh element rendered from the model.
   */
  const [generation, setGeneration] = useState(0);

  const commit = useCallback(() => {
    const element = ref.current;

    if (handed.current) {
      return;
    }

    setEditing(false);

    if (element === null || onCommit === undefined) {
      return;
    }

    const next = domToInline(element);

    setGeneration((current) => current + 1);
    onCommit(next);
  }, [onCommit]);

  // After every render, and cleared here rather than in the blur: a removed
  // element is not guaranteed to blur, and a flag left set would swallow the next
  // genuine commit.
  useEffect(() => {
    if (!editing) {
      handed.current = false;
    }

    if (focusKey !== undefined && !editing && takeFocusRequest(focusKey)) {
      caretAtEnd.current = true;
      setEditing(true);
    }
  });

  /** Hands the text to a list callback and closes the field. */
  const hand = (element: HTMLElement, give: (value: InlineText) => void) => {
    const next = domToInline(element);

    handed.current = true;
    setEditing(false);
    setGeneration((current) => current + 1);
    give(next);
  };

  if (context.mode !== "edit" || onCommit === undefined) {
    return <InlineTextView value={value} />;
  }

  if (!editing) {
    return (
      <span
        className="rp-editable"
        data-editable
        key={generation}
        onClick={(event) => {
          // The paper's own chrome (a drag handle, a link) must keep its click.
          event.stopPropagation();
          setEditing(true);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setEditing(true);
          }
        }}
        title={`Edit ${label}`}
      >
        <InlineTextView value={value} />
      </span>
    );
  }

  return (
    <span
      aria-label={label}
      className="rp-editable rp-editing"
      contentEditable
      data-editing
      key={generation}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          // Single-line fields: Enter commits rather than inserting a break.
          event.preventDefault();

          if (onBreak === undefined) {
            event.currentTarget.blur();
          } else {
            hand(event.currentTarget, onBreak);
          }

          return;
        }

        if (
          event.key === "Backspace" &&
          onRemoveEmpty !== undefined &&
          event.currentTarget.textContent === ""
        ) {
          event.preventDefault();
          handed.current = true;
          setEditing(false);
          onRemoveEmpty();

          return;
        }

        if (
          event.altKey &&
          onMove !== undefined &&
          (event.key === "ArrowUp" || event.key === "ArrowDown")
        ) {
          event.preventDefault();

          const direction = event.key === "ArrowUp" ? -1 : 1;

          hand(event.currentTarget, (next) => onMove(direction, next));

          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          // Abandon: re-render from the model, which is still unchanged.
          setEditing(false);
          setGeneration((current) => current + 1);
        }
      }}
      ref={(element) => {
        ref.current = element;
        // Focused on mount, so the click that started editing also lands a caret.
        element?.focus();

        if (element !== null && caretAtEnd.current) {
          caretAtEnd.current = false;

          const selection = element.ownerDocument.defaultView?.getSelection();
          const range = element.ownerDocument.createRange();

          range.selectNodeContents(element);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }}
      /**
       * React must not manage these children. They are written by the browser
       * from here on, and read back on commit.
       */
      suppressContentEditableWarning
    >
      <InlineTextView value={value} />
    </span>
  );
};
