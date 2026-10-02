import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Box, Loader } from "@mantine/core";

import { seo } from "@/lib/seo";

import { Shell } from "@/components/shell/Shell";
import { ClientOnly } from "@/components/client-only";
import { EmptyState } from "@/components/EmptyState";
import { EditorLayout } from "@/features/editor/EditorLayout";
import { HistoryControls } from "@/features/editor/HistoryControls";
import { SaveIndicator } from "@/features/editor/SaveIndicator";
import { useAutosave } from "@/features/editor/useAutosave";
import { useDocumentHistoryShortcuts } from "@/features/editor/useDocumentHistoryShortcuts";
import { useEditorStore } from "@/features/editor/store";
import { useRenameResume, useResume } from "@/features/resume/queries";
import { VersionChip } from "@/features/versions/VersionChip";
import { useTranslation } from "@/lib/i18n/useTranslation";

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
  const { t } = useTranslation("editor");
  const resume = useResume(resumeId);
  const load = useEditorStore((state) => state.load);
  const apply = useEditorStore((state) => state.apply);
  const replace = useEditorStore((state) => state.replace);
  const openResumeId = useEditorStore((state) => state.resumeId);
  const document = useEditorStore((state) => state.document);

  useAutosave(resumeId);
  useDocumentHistoryShortcuts();

  useEffect(() => {
    // Guarded on the id rather than on `document === null`, so navigating from
    // one resume to another swaps the working copy while re-rendering this route
    // with the same document never discards unsaved edits.
    if (
      resume.data !== undefined &&
      resume.data !== null &&
      openResumeId !== resume.data.id
    ) {
      load(resume.data.id, resume.data.document);
    }
  }, [resume.data, openResumeId, load]);

  // Leaving the route closes the document. `useAutosave` flushes on its own
  // teardown, so this cannot drop a pending write.
  useEffect(() => () => useEditorStore.getState().close(), []);

  // `isPending` rather than `isLoading`: the latter is false while a query sits
  // between attempts, which would flash a wrong screen instead of the loader.
  if (resume.isPending) {
    return (
      <Box className="flex justify-center py-20">
        <Loader size="sm" />
      </Box>
    );
  }

  /**
   * A resume that fails to load is not the same as one that is not there, and
   * saying "not found" about a document sitting in the database is the kind of
   * wrong answer that sends someone looking in the wrong place. `migrateDocument`
   * refuses anything it cannot honestly repair (a document from a newer build,
   * or one that no longer validates), and its message says which, so it is shown
   * rather than flattened into a missing-file screen.
   */
  if (resume.isError) {
    return (
      <EmptyState
        icon="warning-circle"
        title={t("route.couldNotOpen")}
        body={
          resume.error instanceof Error
            ? resume.error.message
            : t("route.couldNotRead")
        }
      />
    );
  }

  if (resume.data === null) {
    return (
      <EmptyState
        icon="warning-circle"
        title={t("route.notFound")}
        body={t("route.notFoundBody")}
      />
    );
  }

  /**
   * The editor waits for the store to hold *this* resume, not just any document.
   *
   * Between the record arriving and the load effect running, the store still
   * holds the resume that was open before, and `document === null` alone lets
   * that through whenever the route is reused for another id (new resume from
   * inside the editor, a switch from the library's recents). The editor then
   * mounts against the old document; Monaco is still loading when the store
   * swaps, and the Markdown pane was left showing the previous resume's text.
   */
  if (document === null || openResumeId !== resume.data.id) {
    return (
      <Box className="flex justify-center py-20">
        <Loader size="sm" />
      </Box>
    );
  }

  return <EditorLayout apply={apply} document={document} replace={replace} />;
};

const ResumeScreen: React.FC = () => {
  const { t } = useTranslation("editor");
  const { resumeId } = Route.useParams();
  const resume = useResume(resumeId);
  const rename = useRenameResume();

  return (
    <Shell
      // Only once the record is here: renaming a title that is still the
      // placeholder would write "Untitled" over a name that has not loaded yet.
      {...(resume.data
        ? {
            onTitleChange: (title: string) =>
              rename.mutate({ id: resumeId, title }),
          }
        : {})}
      // Client-only because the history lives in the editor store, which only
      // exists once a document has been loaded from IndexedDB.
      actions={
        <ClientOnly>
          {/* The save state before the undo pair: it is a readout, and the
              controls beside it are actions. */}
          <Box className="flex items-center gap-2">
            <VersionChip resumeId={resumeId} />
            <SaveIndicator />
            <HistoryControls />
          </Box>
        </ClientOnly>
      }
      title={resume.data?.title ?? t("route.untitled")}
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
  );
};

export const Route = createFileRoute("/resumes/$resumeId")({
  head: () => ({
    meta: seo({
      title: "Editor | Resivo",
      indexable: false,
    }),
  }),
  component: ResumeScreen,
});
