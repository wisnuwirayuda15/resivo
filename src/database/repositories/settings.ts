import { getDb } from "../db";

import type { SettingRecord } from "../records";

/**
 * Application settings, as a key/value table.
 *
 * Deliberately loose: settings accrete, and a table-per-setting or a single
 * migrating blob would both be worse. Callers own the shape of their own value
 * and pass a fallback, so a missing or stale key degrades to a default instead
 * of throwing.
 */

/**
 * Known keys, collected here so they cannot drift apart across the app.
 *
 * Deliberately short, and it used to be longer. Three keys were declared for
 * state that ended up living somewhere better, and a key nothing reads is worse
 * than no key: it reads as a feature that exists.
 *
 * Pane sizes are in `localStorage` (`features/editor/panels.ts`) because the
 * editor reads them synchronously as it mounts, and an async read would cost a
 * frame of the panes at the wrong width every time the editor opens. The
 * library's sort is in the URL (`routes/resumes.index.tsx`) so a filtered view
 * is linkable and survives a reload. A grid/list toggle was declared and never
 * built.
 *
 * What belongs here is a preference that is device-wide, outlives a session, and
 * has no better home.
 */
export const SETTING_KEYS = {
  /** Last template chosen in the new-resume dialog. */
  lastTemplateId: "editor.lastTemplateId",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const getSetting = async <T>(
  key: SettingKey,
  fallback: T,
): Promise<T> => {
  const record = await getDb().settings.get(key);

  return record === undefined ? fallback : (record.value as T);
};

export const setSetting = async (
  key: SettingKey,
  value: unknown,
): Promise<void> => {
  await getDb().settings.put({ key, value });
};

export const deleteSetting = async (key: SettingKey): Promise<void> => {
  await getDb().settings.delete(key);
};

/** Every setting, for backup export. */
export const listSettings = async (): Promise<Array<SettingRecord>> =>
  getDb().settings.toArray();
