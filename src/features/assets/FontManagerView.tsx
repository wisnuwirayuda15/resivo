import { useState } from 'react'
import { Box, Loader, Text } from '@mantine/core'

import { EmptyState } from '@/components/EmptyState'

import { AssetUpload, UploadError } from './components/AssetUpload'
import { DeleteFontDialog } from './components/deleteDialogs'
import { FontCard } from './components/FontCard'
import { FONT_ACCEPT } from './readFont'
import { formatBytes } from './format'
import { useAddFont, useDeleteFont, useFonts, useUnusedFonts } from './queries'

import type { FontSummary } from '@/database/index'

/**
 * Uploaded fonts, as a page of its own.
 *
 * Like the image route, this one used to be a hardcoded empty state that never
 * read the database. There is no assignment here, which face a resume is set in
 * belongs to that resume, and is chosen in its style inspector. This page is
 * about the files: what is stored, what it costs, and what nothing uses.
 */
export const FontManagerView: React.FC = () => {
  const { data: fonts, isPending } = useFonts()
  const { data: unused } = useUnusedFonts()
  const add = useAddFont()
  const remove = useDeleteFont()

  const [confirming, setConfirming] = useState<FontSummary | null>(null)

  const all = fonts ?? []
  const unusedIds = new Set((unused ?? []).map((font) => font.id))
  const totalBytes = all.reduce((sum, font) => sum + font.size, 0)

  return (
    <Box className="p-6">
      <Text className="text-muted mb-5 max-w-[70ch] text-[13px] leading-normal">
        Resivo ships with Instrument Sans, JetBrains Mono and Source Serif 4,
        which need no upload. Add a WOFF2, WOFF, TrueType or OpenType file to
        use your own, the browser&rsquo;s own font parser validates it on
        upload, so a bad file is refused rather than silently falling back, and
        the face is embedded into an HTML export.
      </Text>

      <Box className="mb-4 flex flex-wrap items-center gap-3">
        <AssetUpload
          accept={FONT_ACCEPT}
          label="Add font"
          loading={add.isPending}
          onFile={(file) => add.mutate(file)}
        />

        <Text className="text-subtle font-mono text-[11px] tabular-nums" span>
          {all.length} stored · {formatBytes(totalBytes)} · {unusedIds.size}{' '}
          unused
        </Text>
      </Box>

      <UploadError className="mb-4" error={add.error} />

      {isPending ? (
        <Box className="flex justify-center py-20">
          <Loader size="sm" />
        </Box>
      ) : all.length === 0 ? (
        <EmptyState
          body="Upload a WOFF2, WOFF or TrueType file to set a resume in your own typeface. It stays on this device and is embedded into exports."
          icon="text-aa"
          title="No custom fonts"
        />
      ) : (
        <Box className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {all.map((font) => (
            <FontCard
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
    </Box>
  )
}
