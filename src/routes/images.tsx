import { createFileRoute } from '@tanstack/react-router'

import { Shell } from '@/components/shell/Shell'
import { EmptyState } from '@/components/EmptyState'

/** Image gallery. Storage and the object-URL cache land in phase 10. */
const ImagesRoute: React.FC = () => (
  <Shell title="Images">
    <EmptyState
      icon="image"
      title="No images yet"
      body="Upload an image to use it as an avatar or place it in a resume. Images are stored on this device and can be reused across resumes."
    />
  </Shell>
)

export const Route = createFileRoute('/images')({ component: ImagesRoute })
