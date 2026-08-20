import { getDb } from '../db'

import type { SettingRecord } from '../records'

/**
 * Application settings, as a key/value table.
 *
 * Deliberately loose: settings accrete, and a table-per-setting or a single
 * migrating blob would both be worse. Callers own the shape of their own value
 * and pass a fallback, so a missing or stale key degrades to a default instead
 * of throwing.
 */

/** Known keys, collected here so they cannot drift apart across the app. */
export const SETTING_KEYS = {
  /** Editor splitter sizes, as a three-element array of percentages. */
  editorPanelSizes: 'editor.panelSizes',
  /** Last template chosen in the new-resume dialog. */
  lastTemplateId: 'editor.lastTemplateId',
  /** Library view mode: grid or list. */
  libraryView: 'library.view',
  /** Library sort field. */
  librarySort: 'library.sort',
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

export const getSetting = async <T>(
  key: SettingKey,
  fallback: T,
): Promise<T> => {
  const record = await getDb().settings.get(key)

  return record === undefined ? fallback : (record.value as T)
}

export const setSetting = async (
  key: SettingKey,
  value: unknown,
): Promise<void> => {
  await getDb().settings.put({ key, value })
}

export const deleteSetting = async (key: SettingKey): Promise<void> => {
  await getDb().settings.delete(key)
}

/** Every setting, for backup export. */
export const listSettings = async (): Promise<Array<SettingRecord>> =>
  getDb().settings.toArray()
