import { createFileRoute } from '@tanstack/react-router'

import { seo } from '@/lib/seo'

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

export const Route = createFileRoute('/fonts')({
  head: () => ({
    meta: seo({
      title: 'Fonts | Resivo',
      indexable: false,
    }),
  }),
  component: FontsRoute,
})
