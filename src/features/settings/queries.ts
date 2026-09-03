import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { SETTING_KEYS, settingsRepo } from '@/database/index'

import type { TemplateId } from '@/features/resume/model/document'

/**
 * Query bindings over the settings table.
 *
 * The table has existed since the first migration and nothing in the app wrote
 * to it: every one of its five repository functions was called only from a test.
 * These are the hooks that give it a caller.
 *
 * Like every other query here, they read IndexedDB and so are client-only.
 */

export const settingKeys = {
  all: ['settings'] as const,
  lastTemplate: ['settings', SETTING_KEYS.lastTemplateId] as const,
}

/**
 * The template the last resume was created with.
 *
 * A preference rather than a document field: someone who writes their resumes in
 * `editorial` should not have to pick it every time, and the alternative — the
 * dialog defaulting to `classic` for ever — is a small tax paid on every new
 * resume.
 */
export const useLastTemplate = () =>
  useQuery({
    queryKey: settingKeys.lastTemplate,
    queryFn: () =>
      settingsRepo.getSetting<TemplateId | null>(
        SETTING_KEYS.lastTemplateId,
        null,
      ),
  })

export const useRememberTemplate = () => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (templateId: TemplateId) =>
      settingsRepo.setSetting(SETTING_KEYS.lastTemplateId, templateId),
    onSuccess: () => client.invalidateQueries({ queryKey: settingKeys.all }),
  })
}
