import { createFileRoute } from '@tanstack/react-router'

import { Shell } from '@/components/shell/Shell'
import { EmptyState } from '@/components/EmptyState'

/** Settings, including backup and restore. Filled in during phase 12. */
const SettingsRoute: React.FC = () => (
  <Shell title="Settings">
    <EmptyState
      icon="gear"
      title="Nothing to configure yet"
      body="Backup and restore, storage usage and editor preferences will live here."
    />
  </Shell>
)

export const Route = createFileRoute('/settings')({ component: SettingsRoute })
