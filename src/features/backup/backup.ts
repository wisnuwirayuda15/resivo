import { getDb } from '@/database/db'
import { blobToDataUrl } from '@/features/export/inline'
import { createId } from '@/lib/id'

import { BACKUP_KIND, BACKUP_VERSION } from './format'

import type { Backup } from './format'

/**
 * Writing and reading the whole local database.
 *
 * Restore never overwrites. That is the single rule everything here follows, and
 * it is not timidity: this is the user's only copy, a backup is usually restored
 * when something has already gone wrong, and a restore that replaced the current
 * state could turn one lost resume into all of them. So a restored resume that
 * collides with an existing one arrives beside it under a new id, and the user
 * deletes whichever they do not want.
 */

export const createBackup = async (now: number): Promise<Backup> => {
  const db = getDb()

  const [resumes, groups, images, fonts, settings] = await Promise.all([
    db.resumes.toArray(),
    db.groups.toArray(),
    db.images.toArray(),
    db.fonts.toArray(),
    db.settings.toArray(),
  ])

  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    createdAt: now,
    resumes,
    groups,
    images: await Promise.all(
      images.map(async ({ blob, ...rest }) => ({
        ...rest,
        data: await blobToDataUrl(blob),
      })),
    ),
    fonts: await Promise.all(
      fonts.map(async ({ blob, ...rest }) => ({
        ...rest,
        data: await blobToDataUrl(blob),
      })),
    ),
    settings,
  }
}

/** What a restore did, so the result can be reported rather than assumed. */
export interface RestoreReport {
  resumesAdded: number
  /** Restored under a new id because something already had that id. */
  resumesRenumbered: number
  groupsAdded: number
  imagesAdded: number
  /** Skipped because the same bytes were already stored, matched on hash, so a
   * re-restore of the same backup does not double the space it takes. */
  imagesAlreadyPresent: number
  fontsAdded: number
  fontsAlreadyPresent: number
  /** Settings the device did not already have. An existing preference is never
   * replaced, see the restore rule above. */
  settingsAdded: number
}

const dataUrlToBlob = async (dataUrl: string, mime: string): Promise<Blob> => {
  /**
   * Through `fetch`, which decodes base64 natively. Doing it by hand with `atob`
   * means a byte-at-a-time loop over what can be several megabytes, on the main
   * thread, for no benefit.
   */
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  return blob.type === '' ? new Blob([blob], { type: mime }) : blob
}

/**
 * Restores a backup alongside whatever is already stored.
 *
 * Assets come first, and resumes last, so a resume is never visible in the
 * library before the image it references is readable.
 */
export const restoreBackup = async (
  backup: Backup,
  now: number,
): Promise<RestoreReport> => {
  const db = getDb()

  const report: RestoreReport = {
    resumesAdded: 0,
    resumesRenumbered: 0,
    groupsAdded: 0,
    imagesAdded: 0,
    imagesAlreadyPresent: 0,
    fontsAdded: 0,
    fontsAlreadyPresent: 0,
    settingsAdded: 0,
  }

  /**
   * Ids that had to change, so the documents that reference them can be
   * rewritten. An image restored under a new id would otherwise leave every
   * resume pointing at a row that is not there.
   */
  const imageIdMap = new Map<string, string>()
  const fontIdMap = new Map<string, string>()

  for (const image of backup.images) {
    // Content, not id: the same photograph restored twice is one row.
    const existingByHash = await db.images
      .where('hash')
      .equals(image.hash)
      .first()

    if (existingByHash !== undefined) {
      imageIdMap.set(image.id, existingByHash.id)
      report.imagesAlreadyPresent += 1
      continue
    }

    const clash = await db.images.get(image.id)
    const id = clash === undefined ? image.id : createId()

    if (id !== image.id) {
      imageIdMap.set(image.id, id)
    }

    const { data, ...rest } = image

    await db.images.add({
      ...rest,
      id,
      blob: await dataUrlToBlob(data, image.mime),
    })
    report.imagesAdded += 1
  }

  for (const font of backup.fonts) {
    /**
     * Fonts carry no content hash, so identity is the family, weight and style,
     * which is also what a `@font-face` rule keys on. Two rows differing only by
     * id would produce two identical faces and let the browser pick.
     */
    const existing = (
      await db.fonts.where('family').equals(font.family).toArray()
    ).find(
      (candidate) =>
        candidate.weight === font.weight && candidate.style === font.style,
    )

    if (existing !== undefined) {
      fontIdMap.set(font.id, existing.id)
      report.fontsAlreadyPresent += 1
      continue
    }

    const clash = await db.fonts.get(font.id)
    const id = clash === undefined ? font.id : createId()

    if (id !== font.id) {
      fontIdMap.set(font.id, id)
    }

    const { data, ...rest } = font

    await db.fonts.add({
      ...rest,
      id,
      blob: await dataUrlToBlob(data, `font/${font.format}`),
    })
    report.fontsAdded += 1
  }

  /**
   * Settings, and only the ones this device has no opinion about yet.
   *
   * Restore never overwrites, and a preference is exactly the kind of thing
   * where that matters: someone restoring one lost resume onto a working machine
   * did not ask for their own settings to be replaced by an older file's.
   *
   * Keys this build does not know are stored anyway. The table is a loose
   * key/value store by design, and dropping a key a newer build wrote would make
   * a backup from that build quietly lossy on the way through this one.
   */
  for (const setting of backup.settings ?? []) {
    if ((await db.settings.get(setting.key)) === undefined) {
      await db.settings.add({ key: setting.key, value: setting.value })
      report.settingsAdded += 1
    }
  }

  for (const group of backup.groups) {
    if ((await db.groups.get(group.id)) === undefined) {
      await db.groups.add(group)
      report.groupsAdded += 1
    }
  }

  for (const resume of backup.resumes) {
    const clash = await db.resumes.get(resume.id)
    const id = clash === undefined ? resume.id : createId()

    if (id !== resume.id) {
      report.resumesRenumbered += 1
    }

    /**
     * A group that is not in this backup and not on this device would leave the
     * resume filed under a group that does not exist, where the library cannot
     * show it. Ungrouped is recoverable; invisible is not.
     */
    const groupId =
      resume.groupId === '' ||
      (await db.groups.get(resume.groupId)) !== undefined
        ? resume.groupId
        : ''

    await db.resumes.add({
      ...resume,
      id,
      groupId,
      document: remapAssets(resume.document, imageIdMap, fontIdMap),
      // A restore is a change to this device, whatever the file says. Sorting the
      // library by "recently edited" would otherwise bury what was just restored.
      updatedAt: now,
      ...(id === resume.id ? {} : { title: `${resume.title} (restored)` }),
    })
    report.resumesAdded += 1
  }

  return report
}

/**
 * Rewrites the asset ids a document references.
 *
 * Only needed for the rows that had to change id, a deduplicated image, or one
 * whose id was taken. Structured-cloned first so the backup object is left
 * untouched and a failed restore cannot leave a half-rewritten document behind.
 */
const remapAssets = <T>(
  document: T,
  images: ReadonlyMap<string, string>,
  fonts: ReadonlyMap<string, string>,
): T => {
  if (images.size === 0 && fonts.size === 0) {
    return document
  }

  const copy = structuredClone(document) as {
    content: {
      header: { avatarImageId?: string }
      sections: Array<{
        blocks: Array<{ kind: string; imageId?: string }>
      }>
    }
    design: {
      typography: {
        bodyFont?: { fontId?: string }
        headingFont?: { fontId?: string }
      }
    }
  }

  const { header, sections } = copy.content

  if (header.avatarImageId !== undefined) {
    header.avatarImageId =
      images.get(header.avatarImageId) ?? header.avatarImageId
  }

  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.kind === 'image' && block.imageId !== undefined) {
        block.imageId = images.get(block.imageId) ?? block.imageId
      }
    }
  }

  for (const font of [
    copy.design.typography.bodyFont,
    copy.design.typography.headingFont,
  ]) {
    if (font?.fontId !== undefined) {
      font.fontId = fonts.get(font.fontId) ?? font.fontId
    }
  }

  return copy as T
}
