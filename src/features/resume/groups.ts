import { UNGROUPED } from '@/database/index'

import type { GroupRecord } from '@/database/index'

/** A place a resume can be moved to. `UNGROUPED` has no record, so this is not
 * a `GroupRecord`. */
export interface MoveDestination {
  id: string
  name: string
}

/**
 * Where a resume in `currentGroupId` can be moved.
 *
 * "Ungrouped" is a destination like any other rather than a separate action:
 * taking a resume out of a folder is the same gesture as putting it in one. It
 * is prepended here because it is not a row in the groups table, `UNGROUPED` is
 * the empty string.
 *
 * The group the resume is already in is left out, so the menu never offers a
 * move that would do nothing.
 */
export const moveDestinations = (
  groups: ReadonlyArray<GroupRecord>,
  currentGroupId: string,
): Array<MoveDestination> =>
  [{ id: UNGROUPED, name: 'Ungrouped' }, ...groups]
    .filter((group) => group.id !== currentGroupId)
    .map((group) => ({ id: group.id, name: group.name }))
