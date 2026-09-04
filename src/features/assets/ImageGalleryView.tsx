import { useState } from 'react'
import { Box, Button, Loader, SegmentedControl, Text } from '@mantine/core'

import { EmptyState } from '@/components/EmptyState'

import { AssetNameInput } from './components/AssetNameInput'
import { AssetUpload, UploadError } from './components/AssetUpload'
import { DeleteImageDialog } from './components/deleteDialogs'
import { Thumb } from './components/Thumb'
import { IMAGE_ACCEPT } from './readImage'
import { formatBytes } from './format'
import {
  useAddImage,
  useDeleteImage,
  useImages,
  useRenameImage,
  useUnusedImages,
} from './queries'

import type { ImageSummary } from '@/database/index'

/**
 * The image gallery, as a page of its own.
 *
 * This route existed as a hardcoded empty state that never read the database, so
 * it reported "No images yet" to anyone who had uploaded through the editor's
 * Assets tab. The gallery in the inspector is the same data with a different
 * job: there, an image is being placed into the document in front of it, so it
 * carries a section picker and a selection. Here there is no document, so the
 * page is about the library itself, what is stored, what it costs, and what
 * nothing refers to any more.
 */
export const ImageGalleryView: React.FC = () => {
  const { data: images, isPending } = useImages()
  const { data: unused } = useUnusedImages()
  const add = useAddImage()
  const rename = useRenameImage()
  const remove = useDeleteImage()

  const [filter, setFilter] = useState<'all' | 'unused'>('all')
  const [confirming, setConfirming] = useState<ImageSummary | null>(null)

  const all = images ?? []
  const unusedIds = new Set((unused ?? []).map((image) => image.id))
  const visible =
    filter === 'all' ? all : all.filter((image) => unusedIds.has(image.id))
  const totalBytes = all.reduce((sum, image) => sum + image.size, 0)

  return (
    <Box className="p-6">
      <Text className="text-muted mb-5 max-w-[70ch] text-[13px] leading-normal">
        Images are stored on this device and shared by every resume on it, so
        the same photograph does not have to be uploaded twice. Nothing is
        deleted automatically: an image can be unused simply because it has not
        been placed yet.
      </Text>

      <Box className="mb-4 flex flex-wrap items-center gap-3">
        <AssetUpload
          accept={IMAGE_ACCEPT}
          label="Add image"
          loading={add.isPending}
          onFile={(file) => add.mutate(file)}
        />

        <Text className="text-subtle font-mono text-[11px] tabular-nums" span>
          {all.length} stored · {formatBytes(totalBytes)} · {unusedIds.size}{' '}
          unused
        </Text>

        <Box className="flex-1" />

        {all.length === 0 ? null : (
          <SegmentedControl
            aria-label="Filter images"
            data={[
              { value: 'all', label: 'All' },
              { value: 'unused', label: 'Unused' },
            ]}
            onChange={(value) =>
              setFilter(value === 'unused' ? 'unused' : 'all')
            }
            size="xs"
            value={filter}
          />
        )}
      </Box>

      <UploadError className="mb-4" error={add.error} />

      {isPending ? (
        <Box className="flex justify-center py-20">
          <Loader size="sm" />
        </Box>
      ) : all.length === 0 ? (
        <EmptyState
          body="Upload an image to use it as a photo or place it in a resume. It stays on this device and can be reused across resumes."
          icon="image"
          title="No images yet"
        />
      ) : visible.length === 0 ? (
        <EmptyState
          body="Every stored image is referenced by at least one resume."
          icon="check-circle"
          title="Nothing unused"
        />
      ) : (
        <Box className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {visible.map((image) => (
            <Box className="flex flex-col gap-2" key={image.id}>
              <Box className="aspect-[4/3]">
                <Thumb image={image} />
              </Box>

              <AssetNameInput
                aria-label={`Name of ${image.name}`}
                onCommit={(name) => rename.mutate({ id: image.id, name })}
                value={image.name}
              />

              <Box className="flex items-center justify-between gap-2">
                <Text
                  className="text-subtle truncate font-mono text-[10px] tabular-nums"
                  span
                >
                  {image.width}×{image.height} · {formatBytes(image.size)}
                  {unusedIds.has(image.id) ? ' · unused' : ''}
                </Text>
                <Button
                  color="red"
                  onClick={() => setConfirming(image)}
                  size="compact-xs"
                  variant="subtle"
                >
                  Delete
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <DeleteImageDialog
        image={confirming}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming !== null) {
            remove.mutate(confirming.id)
          }

          setConfirming(null)
        }}
        unused={confirming !== null && unusedIds.has(confirming.id)}
      />
    </Box>
  )
}
