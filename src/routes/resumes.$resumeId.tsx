import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box, Loader } from '@mantine/core'

import { Shell } from '@/components/shell/Shell'
import { ClientOnly } from '@/components/client-only'
import { EmptyState } from '@/components/EmptyState'
import { EditorLayout } from '@/features/editor/EditorLayout'
import { HistoryControls } from '@/features/editor/HistoryControls'
import { useAutosave } from '@/features/editor/useAutosave'
import { useDocumentHistoryShortcuts } from '@/features/editor/useDocumentHistoryShortcuts'
import { useEditorStore } from '@/features/editor/store'
import { useResume } from '@/features/resume/queries'

/**
 * One resume.
 *
 * This route owns the open document: it loads the record once, hands it to the
 * editor store, and lets everything below read from the store rather than from
 * the query cache. That is why the preview and the style inspector stay in step
 * without either knowing about the other, and why switching tabs inside the
 * inspector does not rehydrate the model.
 *
 * `EditorLayout` owns the panels. This route's job ends at deciding whether
 * there is a document to edit at all.
 */
const ResumeView: React.FC<{ resumeId: string }> = ({ resumeId }) => {
  const resume = useResume(resumeId)
  const load = useEditorStore((state) => state.load)
  const apply = useEditorStore((state) => state.apply)
  const replace = useEditorStore((state) => state.replace)
  const openResumeId = useEditorStore((state) => state.resumeId)
  const document = useEditorStore((state) => state.document)

  useAutosave(resumeId)
  useDocumentHistoryShortcuts()

  useEffect(() => {
    // Guarded on the id rather than on `document === null`, so navigating from
    // one resume to another swaps the working copy while re-rendering this route
    // with the same document never discards unsaved edits.
    if (
      resume.data !== undefined &&
      resume.data !== null &&
      openResumeId !== resume.data.id
    ) {
      load(resume.data.id, resume.data.document)
    }
  }, [resume.data, openResumeId, load])

  // Leaving the route closes the document. `useAutosave` flushes on its own
  // teardown, so this cannot drop a pending write.
  useEffect(() => () => useEditorStore.getState().close(), [])

  // `isPending` rather than `isLoading`: the latter is false while a query sits
  // between attempts, which would flash a wrong screen instead of the loader.
  if (resume.isPending) {
    return (
      <Box className="flex justify-center py-20">
        <Loader size="sm" />
      </Box>
    )
  }

  /**
   * A resume that fails to load is not the same as one that is not there, and
   * saying "not found" about a document sitting in the database is the kind of
   * wrong answer that sends someone looking in the wrong place. `migrateDocument`
   * refuses anything it cannot honestly repair — a document from a newer build,
   * or one that no longer validates — and its message says which, so it is shown
   * rather than flattened into a missing-file screen.
   */
  if (resume.isError) {
    return (
      <EmptyState
        icon="warning-circle"
        title="This resume could not be opened"
        body={
          resume.error instanceof Error
            ? resume.error.message
            : 'The stored document could not be read.'
        }
      />
    )
  }

  if (resume.data === null) {
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
      <Box className="flex justify-center py-20">
        <Loader size="sm" />
      </Box>
    )
  }

  return <EditorLayout apply={apply} document={document} replace={replace} />
}

const ResumeScreen: React.FC = () => {
  const { resumeId } = Route.useParams()
  const resume = useResume(resumeId)

  return (
    <Shell
      // Client-only because the history lives in the editor store, which only
      // exists once a document has been loaded from IndexedDB.
      actions={
        <ClientOnly>
          <HistoryControls />
        </ClientOnly>
      }
      title={resume.data?.title ?? 'Resume'}
    >
      {/* The editor fills the viewport rather than scrolling the page: the pane
          inside it owns its own scrolling, so the chrome never moves. */}
      <Box className="h-[calc(100dvh-var(--spacing-toolbar))]">
        <ClientOnly
          fallback={
            <Box className="flex justify-center py-20">
              <Loader size="sm" />
            </Box>
          }
        >
          <ResumeView resumeId={resumeId} />
        </ClientOnly>
      </Box>
    </Shell>
  )
}

export const Route = createFileRoute('/resumes/$resumeId')({
  component: ResumeScreen,
})
