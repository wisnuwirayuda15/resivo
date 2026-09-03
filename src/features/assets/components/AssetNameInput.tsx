import { useEffect, useState } from 'react'
import { TextInput } from '@mantine/core'

interface AssetNameInputProps {
  value: string
  onCommit: (name: string) => void
  'aria-label': string
}

/**
 * Renames an asset, on commit rather than on every keystroke.
 *
 * The inspector used to call the rename mutation from `onChange`, which wrote a
 * row to IndexedDB and invalidated every asset query once per character typed —
 * and the invalidation reset the field from the server value mid-word. This
 * holds the draft locally and commits on blur or Enter, which is also what makes
 * Escape able to mean "never mind".
 */
export const AssetNameInput: React.FC<AssetNameInputProps> = ({
  value,
  onCommit,
  'aria-label': label,
}) => {
  const [draft, setDraft] = useState(value)

  // A rename from elsewhere, or a different asset arriving in the same slot,
  // replaces the draft. Keyed on `value` so typing is never interrupted.
  useEffect(() => setDraft(value), [value])

  const commit = () => {
    const trimmed = draft.trim()

    if (trimmed === '' || trimmed === value) {
      setDraft(value)
      return
    }

    onCommit(trimmed)
  }

  return (
    <TextInput
      aria-label={label}
      onBlur={commit}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }

        if (event.key === 'Escape') {
          setDraft(value)
          event.currentTarget.blur()
        }
      }}
      value={draft}
    />
  )
}
