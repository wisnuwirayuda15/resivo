import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fontRepo, imageRepo } from '@/database/index'

import { invalidateAsset } from './objectUrl'
import { readFontFile } from './readFont'
import { readImageFile } from './readImage'

import type { QueryClient } from '@tanstack/react-query'

/**
 * Query bindings over the image and font repositories.
 *
 * Summaries only — never blobs. A gallery of fifty photographs would be fifty
 * megabytes held in a query cache that has no idea it is holding them; the bytes
 * are fetched one at a time, through the object-URL cache, by whatever is
 * actually drawing them.
 *
 * All of these read IndexedDB, so all of them are client-only.
 */

export const assetKeys = {
  images: ['assets', 'images'] as const,
  unusedImages: ['assets', 'images', 'unused'] as const,
  fonts: ['assets', 'fonts'] as const,
  unusedFonts: ['assets', 'fonts', 'unused'] as const,
}

/**
 * "Unused" is derived from every resume, so it goes stale when any document is
 * saved — not only when an asset changes. Invalidating both lists together keeps
 * the badge honest instead of leaving it to be noticed later.
 */
const invalidateAssets = async (client: QueryClient): Promise<void> => {
  await client.invalidateQueries({ queryKey: ['assets'] })
}

export const useImages = () =>
  useQuery({
    queryKey: assetKeys.images,
    queryFn: () => imageRepo.listImages(),
  })

export const useUnusedImages = () =>
  useQuery({
    queryKey: assetKeys.unusedImages,
    queryFn: () => imageRepo.listUnusedImages(),
  })

export const useFonts = () =>
  useQuery({ queryKey: assetKeys.fonts, queryFn: () => fontRepo.listFonts() })

export const useUnusedFonts = () =>
  useQuery({
    queryKey: assetKeys.unusedFonts,
    queryFn: () => fontRepo.listUnusedFonts(),
  })

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Reads and validates the file, then stores it.
 *
 * Validation is part of the mutation rather than of the component, so every
 * upload path — button, drop zone, and whatever a later paste handler adds —
 * rejects the same files with the same message.
 */
export const useAddImage = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) =>
      imageRepo.addImage(await readImageFile(file)),
    onSuccess: () => invalidateAssets(client),
  })
}

export const useRenameImage = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      imageRepo.renameImage(id, name),
    onSuccess: () => invalidateAssets(client),
  })
}

export const useDeleteImage = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => imageRepo.deleteImage(id),
    onSuccess: async (_result, id) => {
      // The row is gone, so anything still holding its URL is pointing at bytes
      // that no longer exist.
      invalidateAsset('image', id)
      await invalidateAssets(client)
    },
  })
}

export const useAddFont = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) =>
      fontRepo.addFont(await readFontFile(file)),
    onSuccess: () => invalidateAssets(client),
  })
}

export const useDeleteFont = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => fontRepo.deleteFont(id),
    onSuccess: async (_result, id) => {
      invalidateAsset('font', id)
      await invalidateAssets(client)
    },
  })
}
