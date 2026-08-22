import { DOCUMENT_VERSION, documentSchema } from '@/features/resume/model/index'

import type { ResumeDocument } from '@/features/resume/model/document'

/**
 * Document content migrations — the second versioning axis.
 *
 * There are deliberately two:
 *
 *   1. Dexie `version(n).stores(...)` migrations, for table and index changes.
 *   2. These, for changes to the shape of a stored `ResumeDocument`.
 *
 * They are independent because they change at very different rates. The content
 * shape will move often as sections and block kinds are added; the table layout
 * will barely move at all. Coupling them would force a full database upgrade —
 * and a rewrite of every row — for what is really a per-document concern.
 *
 * So these run lazily, on read. A document is migrated when it is loaded, and
 * the upgraded shape is persisted on the next save. Nothing rewrites the whole
 * table at once.
 */

/** Migrates one version forward. Receives and returns loosely-typed data,
 * because an old document does not satisfy the current interface. */
type Migrator = (document: Record<string, unknown>) => Record<string, unknown>

/**
 * v1 to v2: a bullet list's items became objects.
 *
 * v1 stored each item as an `InlineText` — an array of inline nodes. v2 wraps
 * that in `{ text }` so an item can also carry a checkbox and a nested list.
 * The two are told apart by shape, which is safe because an item was never
 * anything but an array before and is never an array now.
 */
const listItemsToObjects = (items: unknown): unknown =>
  !Array.isArray(items)
    ? items
    : items.map((item) => (Array.isArray(item) ? { text: item } : item))

const v1ToV2: Migrator = (input) => {
  // Cloned rather than edited in place: the runner only shallow-copies, so
  // writing into the nested content would mutate the caller's record.
  const document = structuredClone(input)
  const content = document.content as
    | { sections?: Array<{ blocks?: Array<Record<string, unknown>> }> }
    | undefined

  for (const section of content?.sections ?? []) {
    for (const block of section.blocks ?? []) {
      if (block.kind === 'bulletList') {
        block.items = listItemsToObjects(block.items)
      }
    }
  }

  return document
}

/**
 * Keyed by the version being migrated FROM. To add a migration, bump
 * `DOCUMENT_VERSION` and add the entry for the previous version — the runner
 * then walks every step in order.
 */
const migrators: Record<number, Migrator> = { 1: v1ToV2 }

export interface MigrationResult {
  document: ResumeDocument
  /** True when the document was upgraded and should be written back. */
  migrated: boolean
}

/**
 * Brings a stored document up to the current version and validates it.
 *
 * Throws on anything it cannot honestly repair — a document from a newer build,
 * a missing migration step, or content that fails validation after migrating.
 * Guessing at an unknown shape risks silently mangling the user's resume, so the
 * caller is expected to surface the error instead.
 */
export const migrateDocument = (input: unknown): MigrationResult => {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Stored resume is not an object.')
  }

  let working = { ...(input as Record<string, unknown>) }
  const from = working.schemaVersion

  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) {
    throw new Error('Stored resume has no usable schema version.')
  }

  if (from > DOCUMENT_VERSION) {
    throw new Error(
      `This resume was saved by a newer version of Resivo ` +
        `(document format ${from}, this build reads ${DOCUMENT_VERSION}). ` +
        'Update Resivo to open it.',
    )
  }

  for (let version = from; version < DOCUMENT_VERSION; version++) {
    const migrator = migrators[version]

    if (migrator === undefined) {
      throw new Error(
        `No migration from document format ${version} to ${version + 1}.`,
      )
    }

    working = migrator(working)
    working.schemaVersion = version + 1
  }

  const parsed = documentSchema.safeParse(working)

  if (!parsed.success) {
    const [issue] = parsed.error.issues
    const path = issue?.path.join('.') ?? '(root)'

    throw new Error(
      `Stored resume is not valid at "${path}": ${issue?.message ?? 'unknown problem'}`,
    )
  }

  return { document: parsed.data, migrated: from !== DOCUMENT_VERSION }
}
