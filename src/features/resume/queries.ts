import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { groupRepo, resumeRepo } from '@/database/index'

import type { QueryClient } from '@tanstack/react-query'
import type { ResumeSummary } from '@/database/index'
import type { TemplateId } from './model/document'

/**
 * Query bindings over the resume and group repositories.
 *
 * TanStack Query owns the *persistent* side of state — the library list, groups,
 * the loaded record — because it gives caching, invalidation and loading/error
 * states for free. The document being actively edited does NOT live here: it is
 * mutated on every keystroke, which would thrash this cache and re-render the
 * library. That belongs to the editor's Zustand store (phase 3), which writes
 * back through `useSaveResumeDocument`.
 *
 * Every query here reads IndexedDB, so all of them are client-only. They must be
 * mounted inside a client-only boundary, never prefetched from a route loader
 * that can run on the server.
 */

export const resumeKeys = {
  all: ['resumes'] as const,
  list: () => [...resumeKeys.all, 'list'] as const,
  archived: () => [...resumeKeys.all, 'archived'] as const,
  detail: (id: string) => [...resumeKeys.all, 'detail', id] as const,
}

export const groupKeys = {
  all: ['groups'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
  counts: () => [...groupKeys.all, 'counts'] as const,
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const useResumes = () =>
  useQuery({
    queryKey: resumeKeys.list(),
    queryFn: () => resumeRepo.listResumes(),
  })

export const useArchivedResumes = () =>
  useQuery({
    queryKey: resumeKeys.archived(),
    queryFn: () => resumeRepo.listArchivedResumes(),
  })

export const useResume = (id: string | undefined) =>
  useQuery({
    queryKey: resumeKeys.detail(id ?? ''),
    queryFn: () => resumeRepo.getResume(id as string),
    enabled: id !== undefined,
    /**
     * The editor store holds the working copy, so refetching a resume that is
     * open would either be discarded or clobber unsaved edits. It is reloaded
     * deliberately, by invalidating the key.
     */
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

export const useGroups = () =>
  useQuery({
    queryKey: groupKeys.list(),
    queryFn: () => groupRepo.listGroups(),
  })

export const useGroupCounts = () =>
  useQuery({
    queryKey: groupKeys.counts(),
    queryFn: () => groupRepo.countResumesByGroup(),
  })

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Invalidates every list affected by a structural change. */
const invalidateLibrary = async (client: QueryClient): Promise<void> => {
  await Promise.all([
    client.invalidateQueries({ queryKey: resumeKeys.all }),
    client.invalidateQueries({ queryKey: groupKeys.counts() }),
  ])
}

export const useCreateResume = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      title?: string
      groupId?: string
      templateId?: TemplateId
    }) => resumeRepo.createResume(input),
    onSuccess: () => invalidateLibrary(client),
  })
}

/**
 * Records a save against the cached library list.
 *
 * Patches the one affected row's `updatedAt` in place rather than invalidating:
 * autosave fires every time the user pauses typing, and refetching every summary
 * on each of those would be wasteful when the only thing that changed is this
 * row's edit time. Re-sorts so the "recently edited" ordering stays correct
 * without a round trip.
 *
 * The detail key is deliberately left alone — the editor store already holds the
 * newer document, so writing it back into the cache would be pointless work.
 *
 * Shared with `features/editor/useAutosave`, which is the other caller that
 * persists a document.
 */
export const patchSavedSummary = (
  client: QueryClient,
  id: string,
  savedAt: number = Date.now(),
): void => {
  client.setQueryData<Array<ResumeSummary>>(resumeKeys.list(), (summaries) =>
    summaries === undefined
      ? summaries
      : summaries
          .map((summary) =>
            summary.id === id ? { ...summary, updatedAt: savedAt } : summary,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
  )
}

/** Imperative save, for an explicit "Save now" action. The debounced path lives
 * in `features/editor/useAutosave`. */
export const useSaveResumeDocument = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      document,
    }: {
      id: string
      document: Parameters<typeof resumeRepo.saveResumeDocument>[1]
    }) => resumeRepo.saveResumeDocument(id, document),
    onSuccess: (_result, { id }) => patchSavedSummary(client, id),
  })
}

export const useUpdateResume = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Parameters<typeof resumeRepo.updateResume>[1]
    }) => resumeRepo.updateResume(id, changes),
    onSuccess: () => invalidateLibrary(client),
  })
}

export const useDuplicateResume = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => resumeRepo.duplicateResume(id),
    onSuccess: () => invalidateLibrary(client),
  })
}

export const useArchiveResume = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => resumeRepo.archiveResume(id),
    onSuccess: () => invalidateLibrary(client),
  })
}

export const useRestoreResume = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => resumeRepo.restoreResume(id),
    onSuccess: () => invalidateLibrary(client),
  })
}

export const useDeleteResume = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => resumeRepo.deleteResume(id),
    onSuccess: async (_result, id) => {
      client.removeQueries({ queryKey: resumeKeys.detail(id) })
      await invalidateLibrary(client)
    },
  })
}

export const useCreateGroup = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => groupRepo.createGroup(name),
    onSuccess: () => invalidateLibrary(client),
  })
}

export const useRenameGroup = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      groupRepo.renameGroup(id, name),
    onSuccess: () => client.invalidateQueries({ queryKey: groupKeys.all }),
  })
}

/** Deleting a group moves its resumes out, so the resume lists change too. */
export const useDeleteGroup = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => groupRepo.deleteGroup(id),
    onSuccess: () => invalidateLibrary(client),
  })
}
