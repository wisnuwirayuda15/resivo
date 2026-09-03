import { Box, Loader, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { formatBytes } from '@/features/assets/format'
import {
  useAssetUsage,
  useFonts,
  useImages,
  useUnusedFonts,
  useUnusedImages,
} from '@/features/assets/queries'

/**
 * What Resivo is holding on this device.
 *
 * The settings page said "storage usage will join it here" from the day it was
 * written, and `totalImageBytes` carried the comment "for the settings view"
 * with no view to call it. This is that view.
 *
 * Deliberately not a quota bar. A browser's storage budget depends on the disk,
 * the origin and how much the user has visited the site, and
 * `navigator.storage.estimate()` returns a number that is padded, shared with
 * other origins and different in a private window — so drawing "23% full" would
 * be inventing precision. What is honest is what the tables actually hold.
 */

const Row: React.FC<{
  label: string
  count: number
  bytes: number
  unused: number
  to: '/images' | '/fonts'
}> = ({ label, count, bytes, unused, to }) => (
  <Box className="border-line-soft flex items-baseline justify-between gap-3 border-b py-2 last:border-b-0">
    <Link className="text-body hover:text-accent text-[13px]" to={to}>
      {label}
    </Link>
    <Text className="text-subtle font-mono text-[11px] tabular-nums" span>
      {count} {count === 1 ? 'file' : 'files'} · {formatBytes(bytes)}
      {unused === 0 ? '' : ` · ${unused} unused`}
    </Text>
  </Box>
)

export const StoragePanel: React.FC = () => {
  const usage = useAssetUsage()
  const images = useImages()
  const fonts = useFonts()
  const unusedImages = useUnusedImages()
  const unusedFonts = useUnusedFonts()

  if (usage.data === undefined) {
    return (
      <Box className="flex py-6">
        <Loader size="sm" />
      </Box>
    )
  }

  return (
    <Box>
      <Row
        bytes={usage.data.images}
        count={(images.data ?? []).length}
        label="Images"
        to="/images"
        unused={(unusedImages.data ?? []).length}
      />
      <Row
        bytes={usage.data.fonts}
        count={(fonts.data ?? []).length}
        label="Fonts"
        to="/fonts"
        unused={(unusedFonts.data ?? []).length}
      />

      <Text className="text-muted mt-3 max-w-[62ch] text-[13px]">
        Resumes themselves are text and take a negligible amount of room; images
        and fonts are what a device notices. Nothing is deleted automatically,
        because an asset can be unused simply because it has not been placed yet
        — the Images and Fonts pages are where that decision is made.
      </Text>
    </Box>
  )
}
