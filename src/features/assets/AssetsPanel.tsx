import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FileButton,
  Loader,
  Select,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/features/icons/IconRenderer'
import { ControlGroup } from '@/features/style/controls'
import {
  addBlock,
  patchDesign,
  setAvatarImage,
} from '@/features/editor/mutations'
import { plainText } from '@/features/resume/model/index'
import { createId } from '@/lib/id'
import { cn } from '@/lib/utils'

import { IMAGE_ACCEPT } from './readImage'
import { FONT_ACCEPT } from './readFont'
import { useImageUrl } from './useAssetUrls'
import {
  useAddFont,
  useAddImage,
  useDeleteFont,
  useDeleteImage,
  useFonts,
  useImages,
  useRenameImage,
  useUnusedFonts,
  useUnusedImages,
} from './queries'

import type { Recipe } from '@/features/editor/mutations'
import type { FontSummary, ImageSummary } from '@/database/index'
import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * The Assets tab — the images and fonts stored on this device.
 *
 * Device-wide, not per-resume, and the panel says so: the same photograph is
 * usually wanted on every version of a CV, and duplicating it per document would
 * multiply both the storage and the work of replacing it.
 *
 * Nothing here is deleted automatically. An asset can be unreferenced simply
 * because it has not been placed yet, so "unused" is shown as a fact and
 * reclaiming the space stays a decision.
 */

interface AssetsPanelProps {
  document: ResumeDocument
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void
}

const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`

/** The message from a rejected upload, which is written for the user. Anything
 * else is unexpected, so it is shown verbatim rather than paraphrased. */
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const Thumb: React.FC<{ image: ImageSummary; selected: boolean }> = ({
  image,
  selected,
}) => {
  const resolved = useImageUrl(image.id)

  return (
    <Box
      className={cn(
        'rounded-control border-line-soft relative flex size-full items-center justify-center overflow-hidden border',
        selected ? 'border-accent' : null,
      )}
    >
      {resolved === undefined ? (
        <Loader size={14} />
      ) : (
        <img
          alt={image.name}
          className="size-full object-cover"
          src={resolved.url}
        />
      )}
    </Box>
  )
}

const ImageGallery: React.FC<AssetsPanelProps> = ({ document, apply }) => {
  const { data: images, isPending } = useImages()
  const { data: unused } = useUnusedImages()
  const add = useAddImage()
  const rename = useRenameImage()
  const remove = useDeleteImage()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<ImageSummary | null>(null)
  const [sectionId, setSectionId] = useState<string | null>(null)

  const selected = (images ?? []).find((image) => image.id === selectedId)
  const unusedIds = new Set((unused ?? []).map((image) => image.id))

  const sections = document.content.sections.map((section) => ({
    value: section.id,
    label: plainText(section.title).trim() || 'Untitled section',
  }))

  const insertInto = (target: string) => {
    if (selected === undefined) {
      return
    }

    apply(
      addBlock(target, {
        id: createId(),
        kind: 'image',
        imageId: selected.id,
        // Empty rather than the file name: alt text describes the picture to
        // someone who cannot see it, and "photo-2024-final" describes nothing.
        alt: '',
      }),
    )
  }

  return (
    <ControlGroup title="Images">
      <Box className="flex items-center gap-2">
        <FileButton
          accept={IMAGE_ACCEPT}
          onChange={(file) => file && add.mutate(file)}
        >
          {(props) => (
            <Button
              {...props}
              leftSection={<Icon name="upload-simple" size={13} />}
              loading={add.isPending}
              size="xs"
              variant="default"
            >
              Add image
            </Button>
          )}
        </FileButton>

        <Text className="text-subtle font-mono text-[11px] tabular-nums" span>
          {(images ?? []).length} stored
        </Text>
      </Box>

      {add.error === null ? null : (
        <Alert
          className="mt-2"
          color="red"
          icon={<Icon name="warning" size={14} />}
          variant="light"
        >
          <Text className="text-[12px]">{errorMessage(add.error)}</Text>
        </Alert>
      )}

      {isPending ? (
        <Box className="flex justify-center py-4">
          <Loader size="sm" />
        </Box>
      ) : (images ?? []).length === 0 ? (
        <Text className="text-muted mt-2 text-[12px]">
          No images yet. Add one and it is available to every resume on this
          device.
        </Text>
      ) : (
        <Box className="mt-2 grid grid-cols-4 gap-2">
          {(images ?? []).map((image) => (
            <Tooltip
              key={image.id}
              label={`${image.name} — ${image.width}×${image.height}, ${formatBytes(image.size)}${
                unusedIds.has(image.id) ? ', unused' : ''
              }`}
            >
              <UnstyledButton
                aria-pressed={image.id === selectedId}
                className="aspect-square"
                onClick={() =>
                  setSelectedId((current) =>
                    current === image.id ? null : image.id,
                  )
                }
              >
                <Thumb image={image} selected={image.id === selectedId} />
              </UnstyledButton>
            </Tooltip>
          ))}
        </Box>
      )}

      {selected === undefined ? null : (
        <Box className="border-line-soft mt-3 flex flex-col gap-2 border-t pt-3">
          <TextInput
            aria-label="Image name"
            onChange={(event) =>
              rename.mutate({
                id: selected.id,
                name: event.currentTarget.value,
              })
            }
            size="xs"
            value={selected.name}
          />

          <Box className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => apply(setAvatarImage(selected.id))}
              size="xs"
              variant="default"
            >
              Use as photo
            </Button>

            {document.content.header.avatarImageId === selected.id ? (
              <Button
                onClick={() => apply(setAvatarImage(undefined))}
                size="xs"
                variant="subtle"
              >
                Remove as photo
              </Button>
            ) : null}
          </Box>

          {/* Inserting needs a target, because a block belongs to a section and
              the panel has no notion of "where the cursor is". */}
          <Box className="flex items-end gap-2">
            <Select
              aria-label="Section to insert into"
              className="flex-1"
              data={sections}
              onChange={setSectionId}
              placeholder="Insert into section…"
              size="xs"
              value={sectionId}
            />
            <Button
              disabled={sectionId === null}
              onClick={() => sectionId !== null && insertInto(sectionId)}
              size="xs"
              variant="default"
            >
              Insert
            </Button>
          </Box>

          <Box className="flex items-center justify-between">
            <Text className="text-subtle font-mono text-[11px]" span>
              {unusedIds.has(selected.id) ? 'Used by no resume' : 'In use'}
            </Text>
            <Button
              color="red"
              onClick={() => setConfirming(selected)}
              size="xs"
              variant="subtle"
            >
              Delete
            </Button>
          </Box>
        </Box>
      )}

      <ConfirmDialog
        confirmLabel="Delete image"
        danger
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming !== null) {
            remove.mutate(confirming.id)
          }

          setConfirming(null)
        }}
        opened={confirming !== null}
        title={`Delete ${confirming?.name ?? 'image'}?`}
      >
        <Text className="text-[13px]">
          {confirming !== null && !unusedIds.has(confirming.id)
            ? 'A resume still refers to this image. Deleting it leaves that resume showing a missing-image box.'
            : 'This image is not used by any resume. Deleting it frees the space it takes on this device.'}
        </Text>
      </ConfirmDialog>
    </ControlGroup>
  )
}

const FontList: React.FC<AssetsPanelProps> = ({ document, apply }) => {
  const { data: fonts, isPending } = useFonts()
  const { data: unused } = useUnusedFonts()
  const add = useAddFont()
  const remove = useDeleteFont()

  const [confirming, setConfirming] = useState<FontSummary | null>(null)

  const unusedIds = new Set((unused ?? []).map((font) => font.id))
  const { bodyFont, headingFont } = document.design.typography

  const use = (font: FontSummary, role: 'bodyFont' | 'headingFont') =>
    apply(
      patchDesign({
        typography: {
          [role]: { family: font.family, source: 'custom', fontId: font.id },
        },
      }),
    )

  return (
    <ControlGroup title="Fonts">
      <Box className="flex items-center gap-2">
        <FileButton
          accept={FONT_ACCEPT}
          onChange={(file) => file && add.mutate(file)}
        >
          {(props) => (
            <Button
              {...props}
              leftSection={<Icon name="upload-simple" size={13} />}
              loading={add.isPending}
              size="xs"
              variant="default"
            >
              Add font
            </Button>
          )}
        </FileButton>

        <Text className="text-subtle font-mono text-[11px] tabular-nums" span>
          {(fonts ?? []).length} stored
        </Text>
      </Box>

      {add.error === null ? null : (
        <Alert
          className="mt-2"
          color="red"
          icon={<Icon name="warning" size={14} />}
          variant="light"
        >
          <Text className="text-[12px]">{errorMessage(add.error)}</Text>
        </Alert>
      )}

      {isPending ? (
        <Box className="flex justify-center py-4">
          <Loader size="sm" />
        </Box>
      ) : (fonts ?? []).length === 0 ? (
        <Text className="text-muted mt-2 text-[12px]">
          The three built-in families need no upload. Add a WOFF2, WOFF,
          TrueType or OpenType file to use your own — it is embedded in an HTML
          export, so the file stays self-contained.
        </Text>
      ) : (
        <Box className="mt-2 flex flex-col gap-2">
          {(fonts ?? []).map((font) => (
            <Box
              className="border-line-soft rounded-control flex flex-col gap-1 border p-2"
              key={font.id}
            >
              <Box className="flex items-baseline justify-between gap-2">
                {/* Set in its own face, which is the only preview that tells you
                    anything — and proof the file loaded at all. */}
                <Text
                  className="truncate text-[13px]"
                  style={{
                    fontFamily: `'${font.family}', var(--font-serif)`,
                    fontWeight: font.weight,
                    fontStyle: font.style,
                  }}
                >
                  {font.family}
                </Text>
                <Text
                  className="text-subtle flex-none font-mono text-[10px] tabular-nums"
                  span
                >
                  {font.weight} {font.style === 'italic' ? 'italic' : ''}{' '}
                  {font.format} {formatBytes(font.size)}
                </Text>
              </Box>

              <Box className="flex items-center gap-1">
                <Button
                  disabled={bodyFont.fontId === font.id}
                  onClick={() => use(font, 'bodyFont')}
                  size="compact-xs"
                  variant={bodyFont.fontId === font.id ? 'light' : 'subtle'}
                >
                  Body
                </Button>
                <Button
                  disabled={headingFont?.fontId === font.id}
                  onClick={() => use(font, 'headingFont')}
                  size="compact-xs"
                  variant={headingFont?.fontId === font.id ? 'light' : 'subtle'}
                >
                  Headings
                </Button>

                <Box className="flex-1" />

                {unusedIds.has(font.id) ? (
                  <Text className="text-subtle font-mono text-[10px]" span>
                    unused
                  </Text>
                ) : null}

                <Button
                  color="red"
                  onClick={() => setConfirming(font)}
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

      <ConfirmDialog
        confirmLabel="Delete font"
        danger
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming !== null) {
            remove.mutate(confirming.id)
          }

          setConfirming(null)
        }}
        opened={confirming !== null}
        title={`Delete ${confirming?.family ?? 'font'}?`}
      >
        <Text className="text-[13px]">
          {confirming !== null && !unusedIds.has(confirming.id)
            ? 'A resume is set in this font. Deleting it makes that resume print in a fallback face instead, which changes where its pages break.'
            : 'No resume is set in this font. Deleting it frees the space it takes on this device.'}
        </Text>
      </ConfirmDialog>
    </ControlGroup>
  )
}

export const AssetsPanel: React.FC<AssetsPanelProps> = ({
  document,
  apply,
}) => (
  <Box>
    <ImageGallery apply={apply} document={document} />
    <FontList apply={apply} document={document} />
  </Box>
)
