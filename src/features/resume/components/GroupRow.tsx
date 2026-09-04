import { useState } from 'react'
import {
  Box,
  Button,
  Group as ButtonRow,
  Menu,
  Modal,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/features/icons/IconRenderer'
import { NavItemContent, navItemClassName } from '@/components/shell/NavItem'

import { useDeleteGroup, useRenameGroup } from '../queries'

import type { GroupRecord } from '@/database/index'

interface GroupRowProps {
  group: GroupRecord
  count?: number
  active: boolean
  onNavigate: () => void
}

/**
 * One group in the sidebar, with its own actions.
 *
 * The row is a link and the menu button is its sibling rather than its child:
 * nesting a button inside a link gives one control two meanings, and a click
 * near the edge of the icon would navigate instead of opening the menu.
 *
 * Renaming and deleting were in the repository from the start and had no way in.
 * Deleting is confirmed, but not because it is dangerous, `deleteGroup` moves
 * the resumes out rather than deleting them, and the dialog says so. What it is
 * really confirming is that the user meant the folder and not its contents.
 */
export const GroupRow: React.FC<GroupRowProps> = ({
  group,
  count,
  active,
  onNavigate,
}) => {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(group.name)
  const [confirming, setConfirming] = useState(false)

  const rename = useRenameGroup()
  const remove = useDeleteGroup()

  const submit = async () => {
    const trimmed = name.trim()

    if (trimmed !== '' && trimmed !== group.name) {
      await rename.mutateAsync({ id: group.id, name: trimmed })
    }

    setRenaming(false)
  }

  return (
    <Box className="group/row relative">
      <Link
        aria-current={active ? 'page' : undefined}
        className={navItemClassName(active)}
        onClick={onNavigate}
        search={{ group: group.id }}
        to="/resumes"
      >
        {/* Room for the menu button, so a long group name is truncated before it
            runs underneath. */}
        <NavItemContent count={count} icon="folder" label={group.name} />
      </Link>

      <Box className="absolute inset-y-0 right-1 flex items-center opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
        <Menu position="right-start" radius="panel" shadow="lg" width={170}>
          <Menu.Target>
            <UnstyledButton
              aria-label={`Actions for ${group.name}`}
              className="text-muted hover:bg-hover hover:text-body rounded-control bg-surface flex h-[20px] w-[20px] items-center justify-center"
            >
              <Icon name="dots-three" size={14} />
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown aria-label={`Actions for ${group.name}`}>
            <Menu.Item
              leftSection={<Icon name="cursor-text" size={15} />}
              onClick={() => {
                setName(group.name)
                setRenaming(true)
              }}
            >
              Rename
            </Menu.Item>
            <Menu.Item
              c="var(--danger-text)"
              leftSection={<Icon name="trash" size={15} />}
              onClick={() => setConfirming(true)}
            >
              Delete group
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>

      <Modal
        onClose={() => setRenaming(false)}
        opened={renaming}
        size={420}
        title="Rename group"
      >
        <Stack gap="lg">
          <TextInput
            data-autofocus
            label="Name"
            onChange={(event) => setName(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void submit()
              }
            }}
            value={name}
          />
          <ButtonRow gap="xs" justify="flex-end">
            <Button onClick={() => setRenaming(false)} variant="default">
              Cancel
            </Button>
            <Button loading={rename.isPending} onClick={() => void submit()}>
              Rename
            </Button>
          </ButtonRow>
        </Stack>
      </Modal>

      <ConfirmDialog
        confirmLabel="Delete group"
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          remove.mutate(group.id)
          setConfirming(false)
        }}
        opened={confirming}
        title={`Delete ${group.name}?`}
      >
        <Text className="text-[13px]">
          {count === undefined || count === 0
            ? 'The group is empty, so nothing else changes.'
            : `The ${count === 1 ? 'resume' : `${count} resumes`} in it ${
                count === 1 ? 'becomes' : 'become'
              } ungrouped. Nothing is deleted but the group itself.`}
        </Text>
      </ConfirmDialog>
    </Box>
  )
}
