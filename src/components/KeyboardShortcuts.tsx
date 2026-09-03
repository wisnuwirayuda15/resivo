import { Box, Kbd, Modal, Text } from '@mantine/core'
import { useOs } from '@mantine/hooks'

/**
 * What the keyboard does.
 *
 * The menu item for this sat disabled since the chrome was built, which is the
 * worst version of a help sheet: it advertises that shortcuts exist and refuses
 * to say what they are.
 *
 * It documents what is bound and nothing else. A sheet listing shortcuts the app
 * does not have is worse than no sheet, so the three groups here are the three
 * places a keystroke means something different — and the reason it differs is
 * given, because "undo does something else in the code pane" is surprising until
 * you know the pane has its own history.
 */

interface KeyboardShortcutsProps {
  opened: boolean
  onClose: () => void
}

interface Shortcut {
  /** Keys, already resolved for this platform. Rendered as separate chips. */
  keys: Array<Array<string>>
  description: string
}

interface Group {
  title: string
  /** Why this group's bindings differ from the ones above it. */
  note?: string
  shortcuts: Array<Shortcut>
}

const groups = (mod: string): Array<Group> => [
  {
    title: 'Anywhere in the app',
    shortcuts: [
      { keys: [[mod, 'K']], description: 'Open the command palette' },
      { keys: [[mod, 'Z']], description: 'Undo the last change to the resume' },
      {
        keys: [
          [mod, 'Shift', 'Z'],
          [mod, 'Y'],
        ],
        description: 'Redo',
      },
    ],
  },
  {
    title: 'In the Markdown and CSS panes',
    note: 'The code editor keeps its own history, so undo there means the text you typed rather than the document as a whole.',
    shortcuts: [
      { keys: [[mod, 'Z']], description: 'Undo typing, a step at a time' },
      { keys: [[mod, 'F']], description: 'Find in the pane' },
      { keys: [['F1']], description: "The code editor's own command list" },
    ],
  },
  {
    title: 'On the paper, in Visual mode',
    note: 'The paper is a document of its own, which is why a keystroke inside it does not reach the app around it.',
    shortcuts: [
      { keys: [['Enter']], description: 'Edit the highlighted text' },
      { keys: [['Enter']], description: 'Finish editing and keep the change' },
      { keys: [['Escape']], description: 'Finish editing and discard it' },
    ],
  },
]

const Keys: React.FC<{ keys: Array<Array<string>> }> = ({ keys }) => (
  <Box className="flex flex-none items-center gap-1.5">
    {keys.map((combination, index) => (
      <Box className="flex items-center gap-1" key={combination.join('+')}>
        {index === 0 ? null : (
          <Text className="text-subtle mr-1 text-[11px]" span>
            or
          </Text>
        )}
        {combination.map((key) => (
          <Kbd key={key} size="xs">
            {key}
          </Kbd>
        ))}
      </Box>
    ))}
  </Box>
)

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  opened,
  onClose,
}) => {
  // The label has to name the right key or it is worse than no label.
  const mod = useOs() === 'macos' ? '⌘' : 'Ctrl'

  return (
    <Modal
      onClose={onClose}
      opened={opened}
      size={560}
      title="Keyboard shortcuts"
    >
      <Box className="flex flex-col gap-5">
        {groups(mod).map((group) => (
          <Box key={group.title}>
            <Text
              className="text-subtle text-[10px] font-medium tracking-[0.06em] uppercase"
              component="h3"
            >
              {group.title}
            </Text>

            {group.note === undefined ? null : (
              <Text className="text-muted mt-1 max-w-[58ch] text-[12px] leading-normal">
                {group.note}
              </Text>
            )}

            <Box className="mt-2 flex flex-col">
              {group.shortcuts.map((shortcut) => (
                <Box
                  className="border-line-soft flex items-center justify-between gap-4 border-b py-1.5 last:border-b-0"
                  key={`${group.title}:${shortcut.description}`}
                >
                  <Text className="text-body text-[13px]">
                    {shortcut.description}
                  </Text>
                  <Keys keys={shortcut.keys} />
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Modal>
  )
}
