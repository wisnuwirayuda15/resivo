import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SETTING_KEYS, settingsRepo } from "@/database/index";

import { RESUME_STARTS } from "@/features/resume/sample";

import type { ResumeStart } from "@/features/resume/sample";
import type { TemplateId } from "@/features/resume/model/document";

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
  all: ["settings"] as const,
  lastTemplate: ["settings", SETTING_KEYS.lastTemplateId] as const,
  resumeStart: ["settings", SETTING_KEYS.newResumeStart] as const,
};

/**
 * The template the last resume was created with.
 *
 * A preference rather than a document field: someone who writes their resumes in
 * `editorial` should not have to pick it every time, and the alternative (the
 * dialog defaulting to `classic` for ever) is a small tax paid on every new
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
  });

export const useRememberTemplate = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (templateId: TemplateId) =>
      settingsRepo.setSetting(SETTING_KEYS.lastTemplateId, templateId),
    onSuccess: () => client.invalidateQueries({ queryKey: settingKeys.all }),
  });
};

/**
 * Whether the last new resume started from the example or a blank page.
 *
 * The fallback is the example, and only for a device that has never answered:
 * the empty page was what the app used to do unconditionally, and its failure
 * mode is that nothing on it says what an entry or a tag list is. Someone who
 * picks blank once is never shown the example again.
 *
 * Validated on the way out rather than trusted. The value is whatever a restored
 * backup put in the table, and a document built from an unrecognised string
 * would be neither of the two things the dialog offered.
 */
export const useLastResumeStart = () =>
  useQuery({
    queryKey: settingKeys.resumeStart,
    queryFn: async () => {
      const stored = await settingsRepo.getSetting<unknown>(
        SETTING_KEYS.newResumeStart,
        null,
      );

      return RESUME_STARTS.find((start) => start === stored) ?? "sample";
    },
  });

export const useRememberResumeStart = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (start: ResumeStart) =>
      settingsRepo.setSetting(SETTING_KEYS.newResumeStart, start),
    onSuccess: () => client.invalidateQueries({ queryKey: settingKeys.all }),
  });
};
