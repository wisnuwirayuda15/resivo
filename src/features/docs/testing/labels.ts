import { exportAdapters } from "@/features/export/adapters";
import { RESOURCES } from "@/lib/i18n/language";

import type { AppLanguage } from "@/lib/i18n/language";

/**
 * Every string the interface can show in one language.
 *
 * Collected by walking the message modules, so a label added to the app is
 * available to the docs without a list to keep in step. The export formats are
 * the one set of labels that are not messages: they are written into the
 * adapters and are the same in every language, which is also why a page in
 * Indonesian quotes them in English.
 */
export const uiLabelsFor = (lang: AppLanguage): Set<string> => {
  const labels = new Set<string>(
    exportAdapters.map((adapter) => adapter.label),
  );

  const walk = (value: unknown): void => {
    if (typeof value === "string") {
      labels.add(value.trim());
    } else if (typeof value === "object" && value !== null) {
      Object.values(value).forEach(walk);
    }
  };

  walk(RESOURCES[lang]);

  return labels;
};
