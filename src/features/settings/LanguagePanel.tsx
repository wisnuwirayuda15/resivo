import { Select } from "@mantine/core";
import { useTranslation, useUiLanguage } from "@/lib/i18n/useTranslation";

import { setLanguage } from "@/lib/i18n";
import {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  isAppLanguage,
} from "@/lib/i18n/language";

/**
 * The interface language.
 *
 * The options are the languages written as themselves, so someone who has landed
 * in one they cannot read can still find their own. Choosing one applies at once
 * and is remembered on this device, in `localStorage` and not the Dexie settings
 * table: it has to be readable synchronously, before the first render that uses
 * it, and the sidebar and the pane sizes are kept there for the same reason.
 */
export const LanguagePanel: React.FC = () => {
  const { t } = useTranslation("settings");
  const language = useUiLanguage();

  return (
    <Select
      allowDeselect={false}
      aria-label={t("language.label")}
      className="max-w-[260px]"
      data={SUPPORTED_LANGUAGES.map((option) => ({
        value: option,
        label: LANGUAGE_NAMES[option],
      }))}
      onChange={(value) => {
        if (isAppLanguage(value)) {
          void setLanguage(value);
        }
      }}
      value={language}
    />
  );
};
