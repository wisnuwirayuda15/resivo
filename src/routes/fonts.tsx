import { createFileRoute } from '@tanstack/react-router'

import { Shell } from '@/components/shell/Shell'
import { ClientOnly } from '@/components/client-only'
import { FontManagerView } from '@/features/assets/FontManagerView'

/** Font manager. Client-only, because it reads IndexedDB. */
const FontsRoute: React.FC = () => (
  <Shell title="Fonts">
    <ClientOnly>
      <FontManagerView />
    </ClientOnly>
  </Shell>
)

export const Route = createFileRoute('/fonts')({ component: FontsRoute })
