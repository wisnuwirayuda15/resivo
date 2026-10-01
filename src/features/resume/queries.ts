import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { groupRepo, resumeRepo } from "@/database/index";
import { downloadBlob, safeFilename } from "@/lib/download";

import type { QueryClient } from "@tanstack/react-query";
import type { ParsedBundle } from "@/features/bundle/importBundle";
import type {
  CreateResumeInput,
  ResumeRecord,
  ResumeSummary,
} from "@/database/index";

/**
 * Query bindings over the resume and group repositories.
 *
 * TanStack Query owns the *persistent* side of state (the library list, groups,
 * the loaded record) because it gives caching, invalidation and loading/error
 * states for free. The document being actively edited does NOT live here: it is
 * mutated on every keystroke, which would thrash this cache and re-render the
 * library. That belongs to the editor's Zustand store, which writes
 * back through `useSaveResumeDocument`.
 *
 * Every query here reads IndexedDB, so all of them are client-only. They must be
 * mounted inside a client-only boundary, never prefetched from a route loader
 * that can run on the server.
 */

export const resumeKeys = {
  all: ["resumes"] as const,
  list: () => [...resumeKeys.all, "list"] as const,
  archived: () => [...resumeKeys.all, "archived"] as const,
  detail: (id: string) => [...resumeKeys.all, "detail", id] as const,
};

export const groupKeys = {
  all: ["groups"] as const,
  list: () => [...groupKeys.all, "list"] as const,
  counts: () => [...groupKeys.all, "counts"] as const,
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const useResumes = () =>
  useQuery({
    queryKey: resumeKeys.list(),
    queryFn: () => resumeRepo.listResumes(),
  });

export const useArchivedResumes = () =>
  useQuery({
    queryKey: resumeKeys.archived(),
    queryFn: () => resumeRepo.listArchivedResumes(),
  });

export const useResume = (id: string | undefined) =>
  useQuery({
    queryKey: resumeKeys.detail(id ?? ""),
    /**
     * `null`, never `undefined`, for a resume that is not there.
     *
     * TanStack Query rejects an `undefined` result as a programming error and
     * turns it into a failed query, which would report a deleted resume as a
     * document that could not be read, and put its own internal message on
     * screen. `null` is a value, so "not found" stays distinguishable from
     * "broken".
     */
    queryFn: async () => (await resumeRepo.getResume(id as string)) ?? null,
    enabled: id !== undefined,
    /**
     * The editor store holds the working copy, so refetching a resume that is
     * open would either be discarded or clobber unsaved edits. It is reloaded
     * deliberately, by invalidating the key.
     */
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    /**
     * A local read either works or fails for a structural reason, a document
     * from a newer build, or one that no longer validates. There is no flaky
     * network to ride out, so retrying just delays the error: during the backoff
     * the query is neither loading nor failed, and the UI shows "not found"
     * about a resume that is sitting right there.
     */
    retry: false,
  });

export const useGroups = () =>
  useQuery({
    queryKey: groupKeys.list(),
    queryFn: () => groupRepo.listGroups(),
  });

export const useGroupCounts = () =>
  useQuery({
    queryKey: groupKeys.counts(),
    queryFn: () => groupRepo.countResumesByGroup(),
  });

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Invalidates every list affected by a structural change.
 *
 * `groupKeys.all` rather than only the counts. Invalidating the counts alone
 * left the group *list* stale, and every query here is `staleTime: Infinity`, so
 * a group the user had just created did not appear in the sidebar until the page
 * was reloaded. The list is a handful of rows; refetching it after any structural
 * change costs nothing next to being wrong.
 */
const invalidateLibrary = async (client: QueryClient): Promise<void> => {
  await Promise.all([
    client.invalidateQueries({ queryKey: resumeKeys.all }),
    client.invalidateQueries({ queryKey: groupKeys.all }),
  ]);
};

export const useCreateResume = () => {
  const client = useQueryClient();

  return useMutation({
    /**
     * The repository's own input type, rather than a narrower copy of it.
     *
     * The copy used to leave `document` out while the new-resume dialog passed
     * one anyway, through a spread, which is the one shape TypeScript does not
     * check for excess properties. It worked, and it was one refactor away
     * from silently dropping an imported resume.
     */
    mutationFn: (input: CreateResumeInput) => resumeRepo.createResume(input),
    onSuccess: () => invalidateLibrary(client),
  });
};

/**
 * Records a save against both cached views of the resume.
 *
 * The **list** row is patched in place rather than invalidated: autosave fires
 * every time the user pauses typing, and refetching every summary on each of
 * those would be wasteful when the only thing that changed is this row's edit
 * time. Re-sorted, so the "recently edited" ordering stays correct without a
 * round trip.
 *
 * The **detail** row has to be written too, and used not to be. The reasoning
 * for leaving it alone was that the editor store already holds the newer
 * document, true, and only true while the editor is open. On leaving, the store
 * is emptied and this key still held the document as it was when the editor
 * opened; since it is `staleTime: Infinity`, walking back in served that. The
 * edits were in IndexedDB and invisible, which reads as "it did not save", and
 * the next keystroke would autosave the stale document over the real one. So
 * this is data loss, not a display bug, and the whole record is written here.
 *
 * The record comes from the repository rather than being reconstructed: it
 * decides `updatedAt` and rewrites part of the document through `syncMeta`, so
 * anything assembled by the caller would differ from what is on disk.
 */
export const patchSavedResume = (
  client: QueryClient,
  record: ResumeRecord,
): void => {
  client.setQueryData<ResumeRecord | null>(
    resumeKeys.detail(record.id),
    record,
  );

  client.setQueryData<Array<ResumeSummary>>(resumeKeys.list(), (summaries) =>
    summaries === undefined
      ? summaries
      : summaries
          .map((summary) =>
            summary.id === record.id
              ? { ...summary, updatedAt: record.updatedAt }
              : summary,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
  );
};

/** Imperative save, for an explicit "Save now" action. The debounced path lives
 * in `features/editor/useAutosave`. */
export const useSaveResumeDocument = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      document,
    }: {
      id: string;
      document: Parameters<typeof resumeRepo.saveResumeDocument>[1];
    }) => resumeRepo.saveResumeDocument(id, document),
    onSuccess: (record) => patchSavedResume(client, record),
  });
};

export const useUpdateResume = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string;
      changes: Parameters<typeof resumeRepo.updateResume>[1];
    }) => resumeRepo.updateResume(id, changes),
    onSuccess: () => invalidateLibrary(client),
  });
};

/**
 * Imports a parsed bundle as a new resume.
 *
 * The module is loaded here, on the first import, so the zip library is not part
 * of what the library page opens with.
 */
export const useImportBundle = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      parsed: ParsedBundle;
      title?: string;
      groupId?: string;
    }) => {
      const { restoreResumeBundle } =
        await import("@/features/bundle/importBundle");

      return restoreResumeBundle(input.parsed, {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.groupId === undefined ? {} : { groupId: input.groupId }),
      });
    },
    onSuccess: () => invalidateLibrary(client),
  });
};

/**
 * Writes a resume's bundle and hands it to the browser.
 *
 * Reads the stored resume rather than taking the one on the card, which is a
 * summary, and builds from what is saved: the library has no editor open, so
 * there is no newer live document to prefer.
 */
export const useExportResumeBundle = () =>
  useMutation({
    mutationFn: async (id: string) => {
      const record = await resumeRepo.getResume(id);

      if (record === undefined) {
        throw new Error("That resume is no longer here.");
      }

      const { buildResumeBundle } =
        await import("@/features/bundle/exportBundle");

      downloadBlob(
        await buildResumeBundle(record, Date.now()),
        safeFilename(record.title, "zip"),
      );
    },
  });

export const useDuplicateResume = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resumeRepo.duplicateResume(id),
    onSuccess: () => invalidateLibrary(client),
  });
};

export const useArchiveResume = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resumeRepo.archiveResume(id),
    onSuccess: () => invalidateLibrary(client),
  });
};

export const useRestoreResume = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resumeRepo.restoreResume(id),
    onSuccess: () => invalidateLibrary(client),
  });
};

export const useDeleteResume = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resumeRepo.deleteResume(id),
    onSuccess: async (_result, id) => {
      client.removeQueries({ queryKey: resumeKeys.detail(id) });
      await invalidateLibrary(client);
    },
  });
};

export const useCreateGroup = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => groupRepo.createGroup(name),
    onSuccess: () => invalidateLibrary(client),
  });
};

export const useRenameGroup = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      groupRepo.renameGroup(id, name),
    onSuccess: () => client.invalidateQueries({ queryKey: groupKeys.all }),
  });
};

/** Deleting a group moves its resumes out, so the resume lists change too. */
export const useDeleteGroup = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => groupRepo.deleteGroup(id),
    onSuccess: () => invalidateLibrary(client),
  });
};
