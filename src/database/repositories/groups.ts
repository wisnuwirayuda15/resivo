import { createId } from '@/lib/id'

import { getDb } from '../db'
import { UNGROUPED } from '../records'

import type { GroupRecord } from '../records'

/** Resume groups, the user's own folders. */

/** In manual order, straight off the `order` index. */
export const listGroups = async (): Promise<Array<GroupRecord>> =>
  getDb().groups.orderBy('order').toArray()

export const getGroup = async (id: string): Promise<GroupRecord | undefined> =>
  getDb().groups.get(id)

export const createGroup = async (name: string): Promise<GroupRecord> => {
  const last = await getDb().groups.orderBy('order').last()

  const record: GroupRecord = {
    id: createId(),
    name,
    order: last === undefined ? 0 : last.order + 1,
    createdAt: Date.now(),
  }

  await getDb().groups.add(record)

  return record
}

export const renameGroup = async (id: string, name: string): Promise<void> => {
  await getDb().groups.update(id, { name })
}

/**
 * Deletes a group and moves its resumes out, rather than deleting them.
 *
 * A group is an organisational convenience; the resumes inside it are the user's
 * actual work. Removing the folder must never remove the documents, so this is
 * one transaction: either the group goes and its resumes become ungrouped, or
 * nothing changes.
 */
export const deleteGroup = async (id: string): Promise<number> => {
  const db = getDb()

  return db.transaction('rw', db.groups, db.resumes, async () => {
    const moved = await db.resumes
      .where('groupId')
      .equals(id)
      .modify({ groupId: UNGROUPED })

    await db.groups.delete(id)

    return moved
  })
}

export const reorderGroups = async (
  orderedIds: Array<string>,
): Promise<void> => {
  const db = getDb()

  await db.transaction('rw', db.groups, async () => {
    await Promise.all(
      orderedIds.map((id, order) => db.groups.update(id, { order })),
    )
  })
}

/** Resume counts per group, plus `UNGROUPED`, for the sidebar. */
export const countResumesByGroup = async (): Promise<Map<string, number>> => {
  const counts = new Map<string, number>()

  await getDb().resumes.each((record) => {
    counts.set(record.groupId, (counts.get(record.groupId) ?? 0) + 1)
  })

  return counts
}
