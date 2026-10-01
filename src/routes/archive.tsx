import { createFileRoute } from "@tanstack/react-router";

import { useTranslation } from "@/lib/i18n/useTranslation";

import { seo } from "@/lib/seo";

import { Shell } from "@/components/shell/Shell";
import { ClientOnly } from "@/components/client-only";
import { EmptyState } from "@/components/EmptyState";
import { ResumeLibrary } from "@/features/resume/components/ResumeLibrary";
import { useArchivedResumes } from "@/features/resume/queries";

/**
 * Archived resumes.
 *
 * A separate route rather than a filter on the library, because archiving is
 * about getting something out of the way, mixing the two views back together
 * would defeat the point.
 */
const ArchiveRoute: React.FC = () => {
  const { t } = useTranslation("library");
  const archived = useArchivedResumes();

  return (
    <Shell title={t("title.archived")}>
      <ClientOnly>
        <ResumeLibrary
          resumes={archived.data}
          isLoading={archived.isLoading}
          query=""
          sort="edited"
          emptyState={
            <EmptyState
              icon="archive"
              title={t("empty.archived")}
              body={t("empty.archivedBody")}
            />
          }
        />
      </ClientOnly>
    </Shell>
  );
};

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: seo({
      title: "Archive | Resivo",
      indexable: false,
    }),
  }),
  component: ArchiveRoute,
});
