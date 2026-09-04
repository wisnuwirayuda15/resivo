import { Alert, Button, FileButton, Text } from '@mantine/core'

import { Icon } from '@/features/icons/IconRenderer'

import { errorMessage } from '../format'

interface AssetUploadProps {
  /** The `accept` string from `readImage` or `readFont`. */
  accept: string
  label: string
  loading: boolean
  onFile: (file: File) => void
}

/**
 * The upload button.
 *
 * Kept separate from the error it can produce, because the two do not sit in the
 * same place: the button is one item in a toolbar row, the message belongs on its
 * own line underneath.
 */
export const AssetUpload: React.FC<AssetUploadProps> = ({
  accept,
  label,
  loading,
  onFile,
}) => (
  <FileButton accept={accept} onChange={(file) => file && onFile(file)}>
    {(props) => (
      <Button
        {...props}
        leftSection={<Icon name="upload-simple" size={13} />}
        loading={loading}
        variant="default"
      >
        {label}
      </Button>
    )}
  </FileButton>
)

/**
 * Why the last upload was refused.
 *
 * Validation lives in the mutation (the browser's own image decoder and font
 * parser do it), so the only place a rejection can be explained is next to the
 * control that started it.
 */
export const UploadError: React.FC<{ error: unknown; className?: string }> = ({
  error,
  className,
}) =>
  error === null || error === undefined ? null : (
    <Alert
      className={className}
      color="red"
      icon={<Icon name="warning" size={14} />}
      variant="light"
    >
      <Text className="text-[12px]">{errorMessage(error)}</Text>
    </Alert>
  )
