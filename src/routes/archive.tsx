import { createFileRoute } from '@tanstack/react-router'

import { Shell } from '@/components/shell/Shell'
import { ClientOnly } from '@/components/client-only'
import { EmptyState } from '@/components/EmptyState'
import { ResumeLibrary } from '@/features/resume/components/ResumeLibrary'
import { useArchivedResumes } from '@/features/resume/queries'

/**
 * Archived resumes.
 *
 * A separate route rather than a filter on the library, because archiving is
 * about getting something out of the way — mixing the two views back together
 * would defeat the point.
 */
const ArchiveRoute: React.FC = () => {
  const archived = useArchivedResumes()

  return (
    <Shell title="Archived">
      <ClientOnly>
        <ResumeLibrary
          resumes={archived.data}
          isLoading={archived.isLoading}
          query=""
          sort="edited"
          emptyState={
            <EmptyState
              icon="archive"
              title="Nothing archived"
              body="Archiving hides a resume from the library without deleting it. Archived resumes show up here."
            />
          }
        />
      </ClientOnly>
    </Shell>
  )
}

export const Route = createFileRoute('/archive')({ component: ArchiveRoute })
