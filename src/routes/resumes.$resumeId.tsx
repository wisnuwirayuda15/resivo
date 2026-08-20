import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Loader } from '@mantine/core'

import { Shell } from '@/components/shell/Shell'
import { ClientOnly } from '@/components/client-only'
import { EmptyState } from '@/components/EmptyState'
import { PreviewPane } from '@/features/preview/PreviewPane'
import { patchDesign } from '@/features/editor/mutations'
import { useAutosave } from '@/features/editor/useAutosave'
import { useEditorStore } from '@/features/editor/store'
import { useResume } from '@/features/resume/queries'

/**
 * One resume.
 *
 * This route owns the open document: it loads the record once, hands it to the
 * editor store, and lets everything below read from the store rather than from
 * the query cache. That is why the preview updates from an edit without a
 * refetch, and why navigating between the preview and (later) the editor panels
 * will not rehydrate the model.
 *
 * The three-panel layout arrives with the Markdown and style editors. For now
 * the preview fills the pane, which is the half of the editor that has to be
 * right first: every other surface is judged against what this shows.
 */
const ResumeView: React.FC<{ resumeId: string }> = ({ resumeId }) => {
  const resume = useResume(resumeId)
  const load = useEditorStore((state) => state.load)
  const apply = useEditorStore((state) => state.apply)
  const openResumeId = useEditorStore((state) => state.resumeId)
  const document = useEditorStore((state) => state.document)

  useAutosave(resumeId)

  useEffect(() => {
    // Guarded on the id rather than on `document === null`, so navigating from
    // one resume to another swaps the working copy while re-rendering this route
    // with the same document never discards unsaved edits.
    if (resume.data !== undefined && openResumeId !== resume.data.id) {
      load(resume.data.id, resume.data.document)
    }
  }, [resume.data, openResumeId, load])

  // Leaving the route closes the document. `useAutosave` flushes on its own
  // teardown, so this cannot drop a pending write.
  useEffect(() => () => useEditorStore.getState().close(), [])

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

  // One render between the record arriving and the store accepting it.
  if (document === null) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="sm" />
      </div>
    )
  }

  return (
    <PreviewPane
      className="h-full"
      document={document}
      onPaperSizeChange={(size) => apply(patchDesign({ paper: { size } }))}
    />
  )
}

const ResumeScreen: React.FC = () => {
  const { resumeId } = Route.useParams()
  const resume = useResume(resumeId)

  return (
    <Shell title={resume.data?.title ?? 'Resume'}>
      {/* The editor fills the viewport rather than scrolling the page: the pane
          inside it owns its own scrolling, so the chrome never moves. */}
      <div className="h-[calc(100dvh-44px)]">
        <ClientOnly
          fallback={
            <div className="flex justify-center py-20">
              <Loader size="sm" />
            </div>
          }
        >
          <ResumeView resumeId={resumeId} />
        </ClientOnly>
      </div>
    </Shell>
  )
}

export const Route = createFileRoute('/resumes/$resumeId')({
  component: ResumeScreen,
})
