import { createFileRoute } from '@tanstack/react-router'
import { Loader } from '@mantine/core'

import { Shell } from '@/components/shell/Shell'
import { ClientOnly } from '@/components/client-only'
import { EmptyState } from '@/components/EmptyState'
import { useResume } from '@/features/resume/queries'

/**
 * One resume.
 *
 * A stub for now: phase 5 turns this into the three-panel editor. It already
 * reads through the client-only boundary, so the SSR shell renders and the
 * database is only touched in the browser — which is the constraint the editor
 * inherits.
 */
const ResumeRoute: React.FC = () => {
  const { resumeId } = Route.useParams()
  const resume = useResume(resumeId)

  if (resume.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="sm" />
      </div>
    )
  }

  if (resume.data === undefined) {
    return (
      <EmptyState
        icon="warning-circle"
        title="Resume not found"
        body="It may have been deleted on this device. Go back to the library to see what is there."
      />
    )
  }

  return (
    <div className="p-6">
      <p className="text-muted text-[13px]">
        The editor arrives in the next phase. This resume has{' '}
        <span className="font-mono">
          {resume.data.document.content.sections.length}
        </span>{' '}
        sections.
      </p>
    </div>
  )
}

const ResumeScreen: React.FC = () => {
  const { resumeId } = Route.useParams()
  const resume = useResume(resumeId)

  return (
    <Shell title={resume.data?.title ?? 'Resume'}>
      <ClientOnly
        fallback={
          <div className="flex justify-center py-20">
            <Loader size="sm" />
          </div>
        }
      >
        <ResumeRoute />
      </ClientOnly>
    </Shell>
  )
}

export const Route = createFileRoute('/resumes/$resumeId')({
  component: ResumeScreen,
})
