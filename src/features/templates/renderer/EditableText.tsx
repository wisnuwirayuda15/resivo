import { useCallback, useRef, useState } from 'react'

import { InlineTextView } from './inline'
import { domToInline } from './domInline'

import type { InlineText } from '@/features/resume/model/document'
import type { RenderContext } from './types'

/**
 * One editable field on the paper.
 *
 * Field-level, not a document-wide `contentEditable`. A single editable root
 * would let the browser restructure the whole resume — merging paragraphs,
 * splitting entries, inventing `<div>`s — and every one of those would have to
 * be diffed back into a typed model. Here the browser can only edit *inside* one
 * field, so the shape of the document is never in question and only its text is.
 *
 * In `view` and `print` mode this renders exactly what `InlineTextView` renders,
 * with no wrapper and no attributes. That is not an optimisation but the
 * guarantee: what is measured, printed and exported is byte-identical whether or
 * not the editor exists.
 */

interface EditableTextProps {
  value: InlineText
  context: RenderContext
  /** Called with the field's new content when the user commits. */
  onCommit?: (value: InlineText) => void
  /** Shown in the tooltip and used as the accessible name of the editable box. */
  label: string
}

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  context,
  onCommit,
  label,
}) => {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)

  /**
   * Bumped on every commit and every abandon, and used as the key on both
   * branches below.
   *
   * Both render a `span`, so without a changing key React reconciles them in
   * place — and the DOM it would patch is not the DOM it last rendered, because
   * the browser has been writing into it. Diffing the old virtual children
   * against the new ones then lands the patches on nodes that have moved.
   * Changing the key forces a fresh element rendered from the model.
   */
  const [generation, setGeneration] = useState(0)

  const commit = useCallback(() => {
    const element = ref.current

    setEditing(false)

    if (element === null || onCommit === undefined) {
      return
    }

    const next = domToInline(element)

    setGeneration((current) => current + 1)
    onCommit(next)
  }, [onCommit])

  if (context.mode !== 'edit' || onCommit === undefined) {
    return <InlineTextView value={value} />
  }

  if (!editing) {
    return (
      <span
        className="rp-editable"
        data-editable
        key={generation}
        onClick={(event) => {
          // The paper's own chrome — a drag handle, a link — must keep its click.
          event.stopPropagation()
          setEditing(true)
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setEditing(true)
          }
        }}
        title={`Edit ${label}`}
      >
        <InlineTextView value={value} />
      </span>
    )
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
        if (event.key === 'Enter') {
          // Single-line fields: Enter commits rather than inserting a break.
          event.preventDefault()
          event.currentTarget.blur()
          return
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          // Abandon: re-render from the model, which is still unchanged.
          setEditing(false)
          setGeneration((current) => current + 1)
        }
      }}
      ref={(element) => {
        ref.current = element
        // Focused on mount, so the click that started editing also lands a caret.
        element?.focus()
      }}
      /**
       * React must not manage these children. They are written by the browser
       * from here on, and read back on commit.
       */
      suppressContentEditableWarning
    >
      <InlineTextView value={value} />
    </span>
  )
}
