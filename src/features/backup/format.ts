import { z } from 'zod'

import { documentSchema } from '@/features/resume/model/index'

/**
 * The backup file's shape.
 *
 * A backup is the user's only copy. Everything lives on this device, so there is
 * no server-side snapshot to fall back on if a restore goes wrong — which is why
 * this file is validated as strictly as a stored document, and why a restore
 * never overwrites.
 *
 * Assets are base64 rather than a zip: a single JSON file is inspectable, and a
 * user who wants to know what leaves their machine can read it. The cost is a
 * third more bytes, which is the right trade for a file written occasionally.
 */

export const BACKUP_VERSION = 1

/** Identifies the file as ours before anything else is trusted, so a JSON file
 * picked by mistake is rejected with a sentence rather than a type error. */
export const BACKUP_KIND = 'resivo.backup'

const imageSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  mime: z.string(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  size: z.number().int().nonnegative(),
  hash: z.string(),
  createdAt: z.number(),
  /** The bytes, as a `data:` URL. */
  data: z.string().startsWith('data:'),
})

const fontSchema = z.object({
  id: z.string().min(1),
  family: z.string(),
  weight: z.number(),
  style: z.enum(['normal', 'italic']),
  format: z.enum(['woff2', 'woff', 'ttf', 'otf']),
  size: z.number().int().nonnegative(),
  createdAt: z.number(),
  data: z.string().startsWith('data:'),
})

const resumeSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  groupId: z.string(),
  order: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  archivedAt: z.number(),
  /**
   * Validated with the same schema the database uses. A backup written by an
   * older build therefore fails here rather than half-restoring — the document
   * migrations run on read, and this is a write.
   */
  document: documentSchema,
})

const groupSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  order: z.number(),
  createdAt: z.number(),
})

export const backupSchema = z.object({
  kind: z.literal(BACKUP_KIND),
  version: z.number().int().positive(),
  /** When it was written. Shown before a restore, so the user can tell two
   * backups apart without opening them. */
  createdAt: z.number(),
  resumes: z.array(resumeSchema),
  groups: z.array(groupSchema),
  images: z.array(imageSchema),
  fonts: z.array(fontSchema),
})

export type Backup = z.infer<typeof backupSchema>
export type BackupResume = z.infer<typeof resumeSchema>
export type BackupImage = z.infer<typeof imageSchema>
export type BackupFont = z.infer<typeof fontSchema>

export class BackupRejected extends Error {}

/**
 * Parses and validates a backup file.
 *
 * Every failure is a sentence the user can act on, because the alternative — a
 * Zod path dumped on screen — tells someone restoring their only copy nothing
 * about what to do next.
 */
export const parseBackup = (text: string): Backup => {
  let raw: unknown

  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupRejected(
      'That file is not valid JSON, so it is not a Resivo backup.',
    )
  }

  const kind = (raw as { kind?: unknown } | null)?.kind

  if (kind !== BACKUP_KIND) {
    throw new BackupRejected(
      'That JSON file is not a Resivo backup. A backup starts with ' +
        `"kind": "${BACKUP_KIND}".`,
    )
  }

  const version = (raw as { version?: unknown }).version

  if (typeof version === 'number' && version > BACKUP_VERSION) {
    throw new BackupRejected(
      `That backup was written by a newer version of Resivo (format ${version}, ` +
        `this build reads ${BACKUP_VERSION}). Update before restoring it — ` +
        'restoring it here could lose part of it.',
    )
  }

  const result = backupSchema.safeParse(raw)

  if (!result.success) {
    const first = result.error.issues[0]

    throw new BackupRejected(
      'That backup could not be read' +
        (first === undefined
          ? '.'
          : `: ${first.message} (at ${first.path.join('.') || 'the top level'}).`) +
        ' Nothing was changed.',
    )
  }

  return result.data
}
