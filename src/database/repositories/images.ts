import { createId } from '@/lib/id'
import { hashBlob } from '@/lib/hash'

import { getDb } from '../db'
import { collectReferencedImageIds } from './resumes'

import type { ImageRecord } from '../records'

/**
 * Image rows.
 *
 * Blobs go in and come out as blobs; nothing here creates object URLs. That is
 * `features/images/objectUrlCache`'s job, because a URL has a lifetime and must
 * be revoked, which is a concern of the component tree rather than of storage.
 */

/** Metadata only — never loads blobs. Lets the gallery list hundreds of images
 * without pulling their bytes into memory. */
export type ImageSummary = Omit<ImageRecord, 'blob'>

const toSummary = ({ blob: _blob, ...rest }: ImageRecord): ImageSummary => rest

export const listImages = async (): Promise<Array<ImageSummary>> => {
  const records = await getDb().images.orderBy('createdAt').reverse().toArray()

  return records.map(toSummary)
}

export const getImage = async (id: string): Promise<ImageRecord | undefined> =>
  getDb().images.get(id)

export interface AddImageInput {
  name: string
  blob: Blob
  width: number
  height: number
}

/**
 * Stores an image, or returns the existing row when the same bytes are already
 * present.
 *
 * Deduplicating on content means re-uploading a photo does not silently double
 * the size of the user's backup, and it keeps `hash` meaningful as an identity
 * for import conflict handling.
 */
export const addImage = async (input: AddImageInput): Promise<ImageRecord> => {
  const hash = await hashBlob(input.blob)
  const existing = await getDb().images.where('hash').equals(hash).first()

  if (existing !== undefined) {
    return existing
  }

  const record: ImageRecord = {
    id: createId(),
    name: input.name,
    blob: input.blob,
    mime: input.blob.type,
    width: input.width,
    height: input.height,
    size: input.blob.size,
    hash,
    createdAt: Date.now(),
  }

  await getDb().images.add(record)

  return record
}

export const renameImage = async (id: string, name: string): Promise<void> => {
  await getDb().images.update(id, { name })
}

export const deleteImage = async (id: string): Promise<void> => {
  await getDb().images.delete(id)
}

/**
 * Images no resume references.
 *
 * Surfaced in the gallery rather than deleted automatically: an image can be
 * unreferenced simply because the user has not placed it yet, so reclaiming the
 * space stays their decision.
 */
export const listUnusedImages = async (): Promise<Array<ImageSummary>> => {
  const [images, referenced] = await Promise.all([
    listImages(),
    collectReferencedImageIds(),
  ])

  return images.filter((image) => !referenced.has(image.id))
}

/** Total bytes held by images, for the settings view. */
export const totalImageBytes = async (): Promise<number> => {
  let total = 0

  await getDb().images.each((record) => {
    total += record.size
  })

  return total
}
