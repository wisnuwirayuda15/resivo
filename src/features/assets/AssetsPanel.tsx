import { useState } from 'react'
import {
  Box,
  Button,
  Loader,
  Select,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'

import { ControlGroup } from '@/features/style/controls'
import {
  addBlock,
  patchDesign,
  setAvatarImage,
} from '@/features/editor/mutations'
import { plainText } from '@/features/resume/model/index'
import { createId } from '@/lib/id'

import { AssetNameInput } from './components/AssetNameInput'
import { AssetUpload, UploadError } from './components/AssetUpload'
import { DeleteFontDialog, DeleteImageDialog } from './components/deleteDialogs'
import { FontCard } from './components/FontCard'
import { Thumb } from './components/Thumb'
import { IMAGE_ACCEPT } from './readImage'
import { FONT_ACCEPT } from './readFont'
import { formatBytes } from './format'
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
 * What is here rather than on the standalone Images and Fonts pages is
 * everything that needs a document to act on: placing an image into a section,
 * making one the header photo, setting a resume in an uploaded face. The pages
 * own the library itself. Both draw from `./components`, so the two never
 * disagree about what a stored asset looks like or what deleting one costs.
 *
 * Nothing here is deleted automatically. An asset can be unreferenced simply
 * because it has not been placed yet, so "unused" is shown as a fact and
 * reclaiming the space stays a decision.
 */

interface AssetsPanelProps {
  document: ResumeDocument
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void
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
        <AssetUpload
          accept={IMAGE_ACCEPT}
          label="Add image"
          loading={add.isPending}
          onFile={(file) => add.mutate(file)}
        />

        <Text className="text-subtle font-mono text-[11px] tabular-nums" span>
          {(images ?? []).length} stored
        </Text>
      </Box>

      <UploadError className="mt-2" error={add.error} />

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
          <AssetNameInput
            aria-label="Image name"
            onCommit={(name) => rename.mutate({ id: selected.id, name })}
            value={selected.name}
          />

          <Box className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => apply(setAvatarImage(selected.id))}
              variant="default"
            >
              Use as photo
            </Button>

            {document.content.header.avatarImageId === selected.id ? (
              <Button
                onClick={() => apply(setAvatarImage(undefined))}
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
              value={sectionId}
            />
            <Button
              disabled={sectionId === null}
              onClick={() => sectionId !== null && insertInto(sectionId)}
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
              variant="subtle"
            >
              Delete
            </Button>
          </Box>
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
        <AssetUpload
          accept={FONT_ACCEPT}
          label="Add font"
          loading={add.isPending}
          onFile={(file) => add.mutate(file)}
        />

        <Text className="text-subtle font-mono text-[11px] tabular-nums" span>
          {(fonts ?? []).length} stored
        </Text>
      </Box>

      <UploadError className="mt-2" error={add.error} />

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
            <FontCard
              actions={
                <>
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
                    variant={
                      headingFont?.fontId === font.id ? 'light' : 'subtle'
                    }
                  >
                    Headings
                  </Button>
                </>
              }
              font={font}
              key={font.id}
              onDelete={() => setConfirming(font)}
              unused={unusedIds.has(font.id)}
            />
          ))}
        </Box>
      )}

      <DeleteFontDialog
        font={confirming}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming !== null) {
            remove.mutate(confirming.id)
          }

          setConfirming(null)
        }}
        unused={confirming !== null && unusedIds.has(confirming.id)}
      />
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
