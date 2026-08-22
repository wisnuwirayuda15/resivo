/**
 * The persistence layer.
 *
 * Everything above this line talks to repositories, never to Dexie directly —
 * that boundary is what keeps IndexedDB's constraints (no null in an index,
 * blob lifetimes, transaction scope) from leaking into feature code.
 */
export { DB_NAME, getDb, isDbAvailable } from './db'
export { NOT_ARCHIVED, UNGROUPED } from './records'
export type {
  FontRecord,
  GroupRecord,
  ImageRecord,
  ResumeRecord,
  SettingRecord,
} from './records'

export * as resumeRepo from './repositories/resumes'
export * as groupRepo from './repositories/groups'
export * as imageRepo from './repositories/images'
export * as fontRepo from './repositories/fonts'
export * as settingsRepo from './repositories/settings'

export type { ResumeSummary } from './repositories/resumes'
export type { ImageSummary } from './repositories/images'
export type { FontSummary } from './repositories/fonts'
