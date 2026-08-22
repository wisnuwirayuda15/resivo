import { Tooltip, UnstyledButton } from '@mantine/core'
import { useOs } from '@mantine/hooks'

import { Icon } from '@/features/icons/IconRenderer'

import { useEditorStore } from './store'

/**
 * Undo and redo for the document.
 *
 * The store has kept a history since the editor existed — one entry per change,
 * with consecutive edits under the same coalesce key merged so a typed sentence
 * is one step. Nothing reached it: there was no button and no shortcut, which
 * made every slider in the style panel and every edit on the paper a one-way
 * change.
 *
 * This is deliberately the document's history, not a text buffer's. Monaco keeps
 * its own undo stack for the pane it owns, and the keyboard shortcut is left to
 * it while the caret is in it — see `useDocumentHistoryShortcuts`. The buttons
 * always act on the document, whatever has focus.
 */

interface HistoryButtonProps {
  icon: string
  label: string
  disabled: boolean
  onClick: () => void
}

const HistoryButton: React.FC<HistoryButtonProps> = ({
  icon,
  label,
  disabled,
  onClick,
}) => (
  <Tooltip label={label}>
    <UnstyledButton
      aria-label={label}
      className="text-muted hover:bg-hover hover:text-body rounded-control duration-fast ease-standard flex h-[30px] w-[30px] items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40"
      component="button"
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={16} />
    </UnstyledButton>
  </Tooltip>
)

export const HistoryControls: React.FC = () => {
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  // Called in the selector rather than read as a field: both are derived from
  // the history arrays, and a boolean is a stable enough result to subscribe to.
  const canUndo = useEditorStore((state) => state.canUndo())
  const canRedo = useEditorStore((state) => state.canRedo())

  // The label has to name the right key or it is worse than no label. `useOs`
  // resolves on the client only, which is fine: this whole control is client-only.
  const modifier = useOs() === 'macos' ? '⌘' : 'Ctrl+'

  return (
    <>
      <HistoryButton
        disabled={!canUndo}
        icon="arrow-u-up-left"
        label={`Undo (${modifier}Z)`}
        onClick={undo}
      />
      <HistoryButton
        disabled={!canRedo}
        icon="arrow-u-up-right"
        label={`Redo (${modifier}⇧Z)`}
        onClick={redo}
      />
    </>
  )
}
