import { Text } from '@mantine/core'

import { ConfirmDialog } from '@/components/ConfirmDialog'

import type { FontSummary, ImageSummary } from '@/database/index'

/**
 * The two asset deletions.
 *
 * Both say what breaks, not just that the action cannot be undone: a resume
 * still pointing at a deleted image shows a missing-image box, and one set in a
 * deleted font prints in a fallback face — which moves its page breaks. Nothing
 * here is deleted automatically for the same reason, since an asset can be
 * unreferenced simply because it has not been placed yet.
 */

interface DeleteImageDialogProps {
  image: ImageSummary | null
  unused: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteImageDialog: React.FC<DeleteImageDialogProps> = ({
  image,
  unused,
  onConfirm,
  onCancel,
}) => (
  <ConfirmDialog
    confirmLabel="Delete image"
    danger
    onCancel={onCancel}
    onConfirm={onConfirm}
    opened={image !== null}
    title={`Delete ${image?.name ?? 'image'}?`}
  >
    <Text className="text-[13px]">
      {image !== null && !unused
        ? 'A resume still refers to this image. Deleting it leaves that resume showing a missing-image box.'
        : 'This image is not used by any resume. Deleting it frees the space it takes on this device.'}
    </Text>
  </ConfirmDialog>
)

interface DeleteFontDialogProps {
  font: FontSummary | null
  unused: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteFontDialog: React.FC<DeleteFontDialogProps> = ({
  font,
  unused,
  onConfirm,
  onCancel,
}) => (
  <ConfirmDialog
    confirmLabel="Delete font"
    danger
    onCancel={onCancel}
    onConfirm={onConfirm}
    opened={font !== null}
    title={`Delete ${font?.family ?? 'font'}?`}
  >
    <Text className="text-[13px]">
      {font !== null && !unused
        ? 'A resume is set in this font. Deleting it makes that resume print in a fallback face instead, which changes where its pages break.'
        : 'No resume is set in this font. Deleting it frees the space it takes on this device.'}
    </Text>
  </ConfirmDialog>
)
