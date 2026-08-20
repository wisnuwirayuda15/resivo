import { Button, Group, Modal, Stack } from '@mantine/core'

import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  opened: boolean
  title: string
  confirmLabel: string
  /** Styles the confirm button as destructive. Use only when the action cannot
   * be undone. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  children: ReactNode
}

/**
 * Confirmation for actions that cannot be undone.
 *
 * Resivo stores everything locally, so there is no server-side copy to recover a
 * deletion from — which is exactly why the destructive path is a deliberate,
 * named confirmation rather than an undo toast.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  opened,
  title,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
  children,
}) => (
  <Modal opened={opened} onClose={onCancel} title={title} size={420}>
    <Stack gap="lg">
      {children}
      <Group justify="flex-end" gap="xs">
        {/* Cancel is focused first, so a stray Enter does not confirm. */}
        <Button variant="default" onClick={onCancel} data-autofocus>
          Cancel
        </Button>
        <Button color={danger ? 'red' : undefined} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Group>
    </Stack>
  </Modal>
)
