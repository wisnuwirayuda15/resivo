import { createFileRoute } from '@tanstack/react-router'
import { Box, Loader, Text } from '@mantine/core'

import { Shell } from '@/components/shell/Shell'
import { ClientOnly } from '@/components/client-only'
import { BackupPanel } from '@/features/backup/BackupPanel'

/**
 * Settings.
 *
 * Backup and restore only, for now, and that is the point of the page: it is
 * where the answer to "what happens if I lose this laptop" lives. Editor
 * preferences and storage usage will join it here rather than being scattered
 * through the app.
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
    </Box>
  </Shell>
)

export const Route = createFileRoute('/settings')({ component: SettingsRoute })
