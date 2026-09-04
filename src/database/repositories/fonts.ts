import { createId } from '@/lib/id'

import { getDb } from '../db'
import { collectReferencedFontIds } from './resumes'

import type { FontRecord } from '../records'

/** Uploaded font rows. Built-in families are vendored in `styles/fonts.css` and
 * never appear here. */

export type FontSummary = Omit<FontRecord, 'blob'>

const toSummary = ({ blob: _blob, ...rest }: FontRecord): FontSummary => rest

export const listFonts = async (): Promise<Array<FontSummary>> => {
  const records = await getDb().fonts.orderBy('family').toArray()

  return records.map(toSummary)
}

export const getFont = async (id: string): Promise<FontRecord | undefined> =>
  getDb().fonts.get(id)

export interface AddFontInput {
  family: string
  blob: Blob
  format: FontRecord['format']
  weight?: number
  style?: FontRecord['style']
}

export const addFont = async (input: AddFontInput): Promise<FontRecord> => {
  const record: FontRecord = {
    id: createId(),
    family: input.family,
    weight: input.weight ?? 400,
    style: input.style ?? 'normal',
    format: input.format,
    blob: input.blob,
    size: input.blob.size,
    createdAt: Date.now(),
  }

  await getDb().fonts.add(record)

  return record
}

export const deleteFont = async (id: string): Promise<void> => {
  await getDb().fonts.delete(id)
}

/**
 * Fonts no resume references.
 *
 * Deleting a font that IS referenced would silently change how a resume prints,
 * so the caller is expected to warn first, this is what tells it whether to.
 */
export const listUnusedFonts = async (): Promise<Array<FontSummary>> => {
  const [fonts, referenced] = await Promise.all([
    listFonts(),
    collectReferencedFontIds(),
  ])

  return fonts.filter((font) => !referenced.has(font.id))
}

export const totalFontBytes = async (): Promise<number> => {
  let total = 0

  await getDb().fonts.each((record) => {
    total += record.size
  })

  return total
}
