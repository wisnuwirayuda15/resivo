import { createFileRoute } from '@tanstack/react-router'
import { Box, Loader, Text } from '@mantine/core'

import { seo } from '@/lib/seo'

import { Shell } from '@/components/shell/Shell'
import { ClientOnly } from '@/components/client-only'
import { BackupPanel } from '@/features/backup/BackupPanel'
import { StoragePanel } from '@/features/settings/StoragePanel'

/**
 * Settings.
 *
 * Two things, and they are the two questions about a local-first app that are
 * not about any one document: what happens if this laptop is lost, and how much
 * of the device is this using.
 */
const SettingsRoute: React.FC = () => (
  <Shell title="Settings">
    <Box className="flex flex-col gap-6 p-6">
      <Box>
        <Text className="text-body text-[15px] font-medium">
          Backup and restore
        </Text>
        <Text className="text-muted mt-1 max-w-[62ch] text-[13px]">
          Everything Resivo stores lives in this browser, on this device. There
          is no copy anywhere else, so a backup is the only thing that survives
          a cleared browser or a lost machine.
        </Text>
      </Box>

      {/* Client-only: reading the database and writing a file both need a
          browser, and this page is nothing but those two things. */}
      <ClientOnly
        fallback={
          <Box className="flex py-6">
            <Loader size="sm" />
          </Box>
        }
      >
        <BackupPanel />
      </ClientOnly>

      <Box className="border-line-soft border-t pt-6">
        <Text className="text-body text-[15px] font-medium">Storage</Text>
        <Text className="text-muted mt-1 max-w-[62ch] text-[13px]">
          Every image and font is stored once and shared by every resume on this
          device.
        </Text>

        <Box className="mt-4">
          <ClientOnly
            fallback={
              <Box className="flex py-6">
                <Loader size="sm" />
              </Box>
            }
          >
            <StoragePanel />
          </ClientOnly>
        </Box>
      </Box>
    </Box>
  </Shell>
)

export const Route = createFileRoute('/settings')({
  head: () => ({
    meta: seo({
      title: 'Settings | Resivo',
      indexable: false,
    }),
  }),
  component: SettingsRoute,
})
