import { describe, expect, it } from 'vitest'

import { UNGROUPED } from '@/database/index'

import { moveDestinations } from './groups'

import type { GroupRecord } from '@/database/index'

const group = (id: string, name: string, order: number): GroupRecord => ({
  id,
  name,
  order,
  createdAt: 0,
})

const groups = [group('g1', 'Applications', 0), group('g2', 'Drafts', 1)]

describe('moveDestinations', () => {
  it('offers every group and Ungrouped', () => {
    expect(moveDestinations(groups, 'other').map((d) => d.name)).toEqual([
      'Ungrouped',
      'Applications',
      'Drafts',
    ])
  })

  it('leaves out the group the resume is already in', () => {
    expect(moveDestinations(groups, 'g1').map((d) => d.id)).toEqual([
      UNGROUPED,
      'g2',
    ])
  })

  it('leaves out Ungrouped when the resume is already ungrouped', () => {
    expect(moveDestinations(groups, UNGROUPED).map((d) => d.id)).toEqual([
      'g1',
      'g2',
    ])
  })

  it('offers only Ungrouped when there are no groups', () => {
    expect(moveDestinations([], 'g1')).toEqual([
      { id: UNGROUPED, name: 'Ungrouped' },
    ])
  })

  /** A resume that is ungrouped and has nowhere else to go: the menu entry is
   * hidden rather than shown empty, and this is what the caller checks. */
  it('offers nothing when ungrouped with no groups', () => {
    expect(moveDestinations([], UNGROUPED)).toEqual([])
  })
})
