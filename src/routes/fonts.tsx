import { createFileRoute } from '@tanstack/react-router'

import { Shell } from '@/components/shell/Shell'
import { EmptyState } from '@/components/EmptyState'

/** Font manager. Upload, validation and embedding land in phase 10. */
const FontsRoute: React.FC = () => (
  <Shell title="Fonts">
    <EmptyState
      icon="text-aa"
      title="No custom fonts"
      body="Resivo ships with Instrument Sans, JetBrains Mono and Source Serif 4. Upload a WOFF2, WOFF or TTF file to use your own."
    />
  </Shell>
)

export const Route = createFileRoute('/fonts')({ component: FontsRoute })
