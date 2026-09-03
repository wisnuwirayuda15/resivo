import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createEmptyDocument, text } from '@/features/resume/model/index'
import { DOCUMENT_VERSION } from '@/features/resume/model/document'
import { createId } from '@/lib/id'

import { __setDbForTesting } from './db'
import { NOT_ARCHIVED, UNGROUPED } from './records'
import { migrateDocument } from './migrations/documents'
import * as resumeRepo from './repositories/resumes'
import * as groupRepo from './repositories/groups'
import * as imageRepo from './repositories/images'
import * as fontRepo from './repositories/fonts'
import * as settingsRepo from './repositories/settings'
import { SETTING_KEYS } from './repositories/settings'

import type { ResivoDB } from './db'

let db: ResivoDB

beforeEach(() => {
  // A fresh database per test, so ordering and counts are never inherited.
  db = __setDbForTesting(`resivo-test-${createId()}`)
})

afterEach(async () => {
  db.close()
  await db.delete()
})

const blob = (bytes: string, type = 'image/png') => new Blob([bytes], { type })

describe('resume repository', () => {
  it('round-trips a resume through IndexedDB', async () => {
    const created = await resumeRepo.createResume({ title: 'Staff Engineer' })
    const loaded = await resumeRepo.getResume(created.id)

    expect(loaded?.title).toBe('Staff Engineer')
    expect(loaded?.document.schemaVersion).toBe(DOCUMENT_VERSION)
    expect(loaded?.document.content.sections).toHaveLength(4)
  })

  it('defaults a new resume to ungrouped and unarchived', async () => {
    const created = await resumeRepo.createResume()

    expect(created.groupId).toBe(UNGROUPED)
    expect(created.archivedAt).toBe(NOT_ARCHIVED)
  })

  it('returns undefined for a resume that does not exist', async () => {
    expect(await resumeRepo.getResume('missing')).toBeUndefined()
  })

  it('lists newest edit first', async () => {
    const first = await resumeRepo.createResume({ title: 'First' })
    const second = await resumeRepo.createResume({ title: 'Second' })

    // Creation timestamps can collide inside one millisecond, so the ordering
    // is asserted after an explicit save rather than assumed from insert order.
    await resumeRepo.saveResumeDocument(first.id, first.document)

    const list = await resumeRepo.listResumes()

    expect(list.map((summary) => summary.title)).toEqual(['First', 'Second'])
    expect(list.map((summary) => summary.id)).toContain(second.id)
  })

  it('denormalizes the header into the summary', async () => {
    const document = createEmptyDocument()
    document.content.header.name = text('Avery Chen')
    document.content.header.headline = text('Staff Engineer')

    const created = await resumeRepo.createResume({ document })
    const [summary] = await resumeRepo.listResumes()

    expect(summary?.id).toBe(created.id)
    expect(summary?.fullName).toBe('Avery Chen')
    expect(summary?.headline).toBe('Staff Engineer')
  })

  it('does not ship the document in list summaries', async () => {
    await resumeRepo.createResume()
    const [summary] = await resumeRepo.listResumes()

    expect(summary).not.toHaveProperty('document')
  })

  it('refreshes denormalized metadata on save', async () => {
    const created = await resumeRepo.createResume()
    const edited = structuredClone(created.document)
    edited.content.header.name = text('Sam Rivera')

    await resumeRepo.saveResumeDocument(created.id, edited)

    const [summary] = await resumeRepo.listResumes()
    expect(summary?.fullName).toBe('Sam Rivera')
  })

  it('advances updatedAt on save', async () => {
    const created = await resumeRepo.createResume()

    await resumeRepo.saveResumeDocument(created.id, created.document)

    const loaded = await resumeRepo.getResume(created.id)
    expect(loaded?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)
  })

  it('refuses to save over a deleted resume', async () => {
    const created = await resumeRepo.createResume()
    await resumeRepo.deleteResume(created.id)

    await expect(
      resumeRepo.saveResumeDocument(created.id, created.document),
    ).rejects.toThrow(/no longer exists/)
  })

  it('hides archived resumes from the library and shows them in the archive', async () => {
    const kept = await resumeRepo.createResume({ title: 'Kept' })
    const shelved = await resumeRepo.createResume({ title: 'Shelved' })

    await resumeRepo.archiveResume(shelved.id)

    expect((await resumeRepo.listResumes()).map((r) => r.title)).toEqual([
      'Kept',
    ])
    expect(
      (await resumeRepo.listArchivedResumes()).map((r) => r.title),
    ).toEqual(['Shelved'])
    expect(kept.archivedAt).toBe(NOT_ARCHIVED)
  })

  it('restores an archived resume', async () => {
    const created = await resumeRepo.createResume({ title: 'Back' })

    await resumeRepo.archiveResume(created.id)
    await resumeRepo.restoreResume(created.id)

    expect((await resumeRepo.listResumes()).map((r) => r.title)).toEqual([
      'Back',
    ])
    expect(await resumeRepo.listArchivedResumes()).toEqual([])
  })

  it('duplicates a resume without sharing nested objects', async () => {
    const source = await resumeRepo.createResume({ title: 'Original' })
    const copy = await resumeRepo.duplicateResume(source.id)

    expect(copy?.title).toBe('Original copy')
    expect(copy?.id).not.toBe(source.id)

    // Mutating the copy must not reach the original's stored document.
    const edited = copy as NonNullable<typeof copy>
    edited.document.design.paper.margin.top = 1.5
    await resumeRepo.saveResumeDocument(edited.id, edited.document)

    const reloaded = await resumeRepo.getResume(source.id)
    expect(reloaded?.document.design.paper.margin.top).toBe(0.6)
  })

  it('appends new resumes after the last one in the same group', async () => {
    const group = await groupRepo.createGroup('Applications')

    const first = await resumeRepo.createResume({ groupId: group.id })
    const second = await resumeRepo.createResume({ groupId: group.id })
    const ungrouped = await resumeRepo.createResume()

    expect(first.order).toBe(0)
    expect(second.order).toBe(1)
    // Order is per-group, so an ungrouped resume starts again at zero.
    expect(ungrouped.order).toBe(0)
  })

  it('reads a group in manual order off the compound index', async () => {
    const group = await groupRepo.createGroup('Applications')
    const a = await resumeRepo.createResume({ groupId: group.id, title: 'A' })
    const b = await resumeRepo.createResume({ groupId: group.id, title: 'B' })
    const c = await resumeRepo.createResume({ groupId: group.id, title: 'C' })

    await resumeRepo.reorderResumes([c.id, a.id, b.id])

    const list = await resumeRepo.listResumesInGroup(group.id)
    expect(list.map((summary) => summary.title)).toEqual(['C', 'A', 'B'])
  })

  it('excludes archived resumes from a group listing', async () => {
    const group = await groupRepo.createGroup('Applications')
    await resumeRepo.createResume({ groupId: group.id, title: 'Active' })
    const shelved = await resumeRepo.createResume({
      groupId: group.id,
      title: 'Shelved',
    })

    await resumeRepo.archiveResume(shelved.id)

    expect(
      (await resumeRepo.listResumesInGroup(group.id)).map((r) => r.title),
    ).toEqual(['Active'])
  })
})

describe('group repository', () => {
  it('creates groups in insertion order', async () => {
    await groupRepo.createGroup('Applications')
    await groupRepo.createGroup('Drafts')

    const groups = await groupRepo.listGroups()

    expect(groups.map((group) => group.name)).toEqual([
      'Applications',
      'Drafts',
    ])
    expect(groups.map((group) => group.order)).toEqual([0, 1])
  })

  it('renames a group', async () => {
    const group = await groupRepo.createGroup('Old')

    await groupRepo.renameGroup(group.id, 'New')

    expect((await groupRepo.getGroup(group.id))?.name).toBe('New')
  })

  it('reorders groups', async () => {
    const a = await groupRepo.createGroup('A')
    const b = await groupRepo.createGroup('B')

    await groupRepo.reorderGroups([b.id, a.id])

    expect((await groupRepo.listGroups()).map((g) => g.name)).toEqual([
      'B',
      'A',
    ])
  })

  it('moves resumes out rather than deleting them with the group', async () => {
    const group = await groupRepo.createGroup('Applications')
    const resume = await resumeRepo.createResume({
      groupId: group.id,
      title: 'Kept',
    })

    const moved = await groupRepo.deleteGroup(group.id)

    expect(moved).toBe(1)
    expect(await groupRepo.getGroup(group.id)).toBeUndefined()

    const survivor = await resumeRepo.getResume(resume.id)
    expect(survivor?.groupId).toBe(UNGROUPED)
  })

  it('counts resumes per group, including ungrouped', async () => {
    const group = await groupRepo.createGroup('Applications')
    await resumeRepo.createResume({ groupId: group.id })
    await resumeRepo.createResume({ groupId: group.id })
    await resumeRepo.createResume()

    const counts = await groupRepo.countResumesByGroup()

    expect(counts.get(group.id)).toBe(2)
    expect(counts.get(UNGROUPED)).toBe(1)
  })
})

describe('image repository', () => {
  it('stores and reads back a blob', async () => {
    const added = await imageRepo.addImage({
      name: 'portrait.png',
      blob: blob('binary-bytes'),
      width: 400,
      height: 400,
    })

    const loaded = await imageRepo.getImage(added.id)

    expect(loaded?.name).toBe('portrait.png')
    expect(loaded?.mime).toBe('image/png')
    expect(loaded?.size).toBe(added.blob.size)
    expect(await loaded?.blob.text()).toBe('binary-bytes')
  })

  it('deduplicates identical bytes instead of storing them twice', async () => {
    const first = await imageRepo.addImage({
      name: 'a.png',
      blob: blob('same'),
      width: 10,
      height: 10,
    })
    const second = await imageRepo.addImage({
      name: 'b.png',
      blob: blob('same'),
      width: 10,
      height: 10,
    })

    expect(second.id).toBe(first.id)
    expect(await imageRepo.listImages()).toHaveLength(1)
  })

  it('treats different bytes as different images', async () => {
    await imageRepo.addImage({
      name: 'a.png',
      blob: blob('one'),
      width: 10,
      height: 10,
    })
    await imageRepo.addImage({
      name: 'b.png',
      blob: blob('two'),
      width: 10,
      height: 10,
    })

    expect(await imageRepo.listImages()).toHaveLength(2)
  })

  it('does not ship blobs in listings', async () => {
    await imageRepo.addImage({
      name: 'a.png',
      blob: blob('one'),
      width: 10,
      height: 10,
    })

    const [summary] = await imageRepo.listImages()

    expect(summary).not.toHaveProperty('blob')
  })

  it('identifies images no resume references', async () => {
    const used = await imageRepo.addImage({
      name: 'used.png',
      blob: blob('used'),
      width: 10,
      height: 10,
    })
    const spare = await imageRepo.addImage({
      name: 'spare.png',
      blob: blob('spare'),
      width: 10,
      height: 10,
    })

    const document = createEmptyDocument()
    document.content.header.avatarImageId = used.id
    await resumeRepo.createResume({ document })

    const unused = await imageRepo.listUnusedImages()

    expect(unused.map((image) => image.id)).toEqual([spare.id])
  })

  it('counts an image referenced by a block as used', async () => {
    const inline = await imageRepo.addImage({
      name: 'chart.png',
      blob: blob('chart'),
      width: 10,
      height: 10,
    })

    const document = createEmptyDocument()
    document.content.sections[0]?.blocks.push({
      id: 'block-1',
      kind: 'image',
      imageId: inline.id,
      alt: 'Chart',
    })
    await resumeRepo.createResume({ document })

    expect(await imageRepo.listUnusedImages()).toEqual([])
  })

  it('totals stored bytes', async () => {
    await imageRepo.addImage({
      name: 'a.png',
      blob: blob('12345'),
      width: 10,
      height: 10,
    })

    expect(await imageRepo.totalImageBytes()).toBe(5)
  })

  it('renames and deletes', async () => {
    const added = await imageRepo.addImage({
      name: 'before.png',
      blob: blob('x'),
      width: 1,
      height: 1,
    })

    await imageRepo.renameImage(added.id, 'after.png')
    expect((await imageRepo.getImage(added.id))?.name).toBe('after.png')

    await imageRepo.deleteImage(added.id)
    expect(await imageRepo.getImage(added.id)).toBeUndefined()
  })
})

describe('font repository', () => {
  it('stores a font with sensible defaults', async () => {
    const added = await fontRepo.addFont({
      family: 'Uploaded Sans',
      blob: blob('font-bytes', 'font/woff2'),
      format: 'woff2',
    })

    expect(added.weight).toBe(400)
    expect(added.style).toBe('normal')
    expect((await fontRepo.getFont(added.id))?.family).toBe('Uploaded Sans')
  })

  it('identifies fonts no resume references', async () => {
    const used = await fontRepo.addFont({
      family: 'Used Sans',
      blob: blob('a', 'font/woff2'),
      format: 'woff2',
    })
    const spare = await fontRepo.addFont({
      family: 'Spare Sans',
      blob: blob('b', 'font/woff2'),
      format: 'woff2',
    })

    const document = createEmptyDocument()
    document.design.typography.bodyFont = {
      family: 'Used Sans',
      source: 'custom',
      fontId: used.id,
    }
    await resumeRepo.createResume({ document })

    expect((await fontRepo.listUnusedFonts()).map((f) => f.id)).toEqual([
      spare.id,
    ])
  })

  it('does not count a builtin font as a referenced upload', async () => {
    const spare = await fontRepo.addFont({
      family: 'Spare Sans',
      blob: blob('b', 'font/woff2'),
      format: 'woff2',
    })

    // The default document uses builtin families, which have no font row.
    await resumeRepo.createResume()

    expect((await fontRepo.listUnusedFonts()).map((f) => f.id)).toEqual([
      spare.id,
    ])
  })
})

describe('settings repository', () => {
  it('returns the fallback for a key that was never set', async () => {
    expect(
      await settingsRepo.getSetting(SETTING_KEYS.lastTemplateId, 'classic'),
    ).toBe('classic')
  })

  it('round-trips a value', async () => {
    await settingsRepo.setSetting(SETTING_KEYS.lastTemplateId, 'editorial')

    expect(
      await settingsRepo.getSetting(SETTING_KEYS.lastTemplateId, 'classic'),
    ).toBe('editorial')
  })

  it('overwrites rather than duplicating a key', async () => {
    await settingsRepo.setSetting(SETTING_KEYS.lastTemplateId, 'modern')
    await settingsRepo.setSetting(SETTING_KEYS.lastTemplateId, 'technical')

    expect(await settingsRepo.listSettings()).toHaveLength(1)
    expect(
      await settingsRepo.getSetting(SETTING_KEYS.lastTemplateId, 'classic'),
    ).toBe('technical')
  })

  it('deletes a key', async () => {
    await settingsRepo.setSetting(SETTING_KEYS.lastTemplateId, 'modern')
    await settingsRepo.deleteSetting(SETTING_KEYS.lastTemplateId)

    expect(
      await settingsRepo.getSetting(SETTING_KEYS.lastTemplateId, 'classic'),
    ).toBe('classic')
  })
})

describe('document migration', () => {
  it('passes a current document through unchanged', () => {
    const document = createEmptyDocument()
    const result = migrateDocument(document)

    expect(result.migrated).toBe(false)
    expect(result.document.schemaVersion).toBe(DOCUMENT_VERSION)
  })

  it('rejects a document from a newer build with an actionable message', () => {
    const document = {
      ...createEmptyDocument(),
      schemaVersion: DOCUMENT_VERSION + 1,
    }

    expect(() => migrateDocument(document)).toThrow(/newer version of Resivo/)
  })

  it('rejects a document with no schema version', () => {
    const { schemaVersion: _schemaVersion, ...rest } = createEmptyDocument()

    expect(() => migrateDocument(rest)).toThrow(/no usable schema version/)
  })

  it('rejects a non-object', () => {
    expect(() => migrateDocument('not a document')).toThrow(/not an object/)
  })

  it('names the offending field when stored content is invalid', () => {
    const document = createEmptyDocument()
    document.design.colors.accent = 'red; } body { display: none'

    expect(() => migrateDocument(document)).toThrow(/design\.colors\.accent/)
  })
})
