import { useMemo, useState } from "react";
import { Box, Skeleton, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { useTranslation } from "@/lib/i18n/useTranslation";

import { EmptyState } from "@/components/EmptyState";

import { ResumeCard } from "./ResumeCard";
import { RenameResumeDialog } from "./RenameResumeDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  useArchiveResume,
  useDeleteResume,
  useDuplicateResume,
  useExportResumeBundle,
  useGroups,
  useRestoreResume,
  useUpdateResume,
} from "../queries";

import type { ResumeSummary } from "@/database/index";

export type SortKey = "edited" | "created" | "title";

interface ResumeLibraryProps {
  resumes: Array<ResumeSummary> | undefined;
  isLoading: boolean;
  query: string;
  sort: SortKey;
  /** Rendered when the user has no resumes at all, as opposed to none matching
   * the current search. */
  emptyState: React.ReactNode;
}

const compare = (sort: SortKey) => (a: ResumeSummary, b: ResumeSummary) => {
  switch (sort) {
    case "edited":
      return b.updatedAt - a.updatedAt;
    case "created":
      return b.createdAt - a.createdAt;
    case "title":
      return a.title.localeCompare(b.title);
  }
};

/**
 * The resume grid, with search, sort and per-card actions.
 *
 * Search and sort run in memory rather than as database queries: the library is
 * a personal collection, and filtering a few dozen already-loaded summaries is
 * faster than a round trip, while keeping the search field instant as the user
 * types.
 */
export const ResumeLibrary: React.FC<ResumeLibraryProps> = ({
  resumes,
  isLoading,
  query,
  sort,
  emptyState,
}) => {
  const { t } = useTranslation("library");
  const [renaming, setRenaming] = useState<ResumeSummary | undefined>(
    undefined,
  );
  const [deleting, setDeleting] = useState<ResumeSummary | undefined>(
    undefined,
  );

  const duplicate = useDuplicateResume();
  const exportBundle = useExportResumeBundle();
  const archive = useArchiveResume();
  const restore = useRestoreResume();
  const remove = useDeleteResume();
  const update = useUpdateResume();
  const groups = useGroups();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches =
      needle === ""
        ? (resumes ?? [])
        : (resumes ?? []).filter((resume) =>
            // Title and the denormalized header name, so searching for the
            // person's name works as well as searching for the file's name.
            [resume.title, resume.fullName, resume.headline ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(needle),
          );

    return [...matches].sort(compare(sort));
  }, [resumes, query, sort]);

  if (isLoading) {
    return (
      <Box className="grid grid-cols-[repeat(auto-fill,minmax(196px,1fr))] gap-4 p-6">
        {Array.from({ length: 6 }, (_unused, index) => (
          <Skeleton key={index} height={252} radius="card" />
        ))}
      </Box>
    );
  }

  if ((resumes ?? []).length === 0) {
    return <>{emptyState}</>;
  }

  if (visible.length === 0) {
    return (
      <EmptyState
        icon="magnifying-glass"
        title={t("search.noMatches")}
        body={t("search.noMatchesBody", { query: query.trim() })}
      />
    );
  }

  return (
    <>
      <Box className="grid grid-cols-[repeat(auto-fill,minmax(196px,1fr))] gap-4 p-6">
        {visible.map((resume) => (
          <ResumeCard
            key={resume.id}
            resume={resume}
            onRename={() => setRenaming(resume)}
            groups={groups.data ?? []}
            onDuplicate={() => duplicate.mutate(resume.id)}
            onExportBundle={() =>
              exportBundle.mutate(resume.id, {
                onError: () =>
                  notifications.show({
                    color: "red",
                    message: t("card.exportFailed", { title: resume.title }),
                  }),
              })
            }
            onMove={(groupId) =>
              update.mutate({ id: resume.id, changes: { groupId } })
            }
            onArchive={() => archive.mutate(resume.id)}
            onRestore={() => restore.mutate(resume.id)}
            onDelete={() => setDeleting(resume)}
          />
        ))}
      </Box>

      <RenameResumeDialog
        resume={renaming}
        onClose={() => setRenaming(undefined)}
      />

      {/* Deleting is irreversible and local (there is no server-side copy to
          recover from), so it always asks first and names what will go. */}
      <ConfirmDialog
        opened={deleting !== undefined}
        title={t("delete.title", { title: deleting?.title ?? "" })}
        confirmLabel={t("delete.confirm")}
        danger
        onCancel={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting !== undefined) {
            remove.mutate(deleting.id);
          }
          setDeleting(undefined);
        }}
      >
        <Text size="md" c="var(--text-muted)">
          {t("delete.body")}
        </Text>
      </ConfirmDialog>
    </>
  );
};
