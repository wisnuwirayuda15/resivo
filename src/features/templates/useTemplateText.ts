import { useTranslation } from "@/lib/i18n/useTranslation";

import type { TemplateId } from "@/features/resume/model/document";

/**
 * A template's words, in the interface language.
 *
 * Returns a function rather than one template's text, because the places that
 * need it list every template (the picker, the gallery, the landing page) and
 * a hook cannot be called once per item.
 */
export const useTemplateText = () => {
  const { t } = useTranslation("templates");

  return (id: TemplateId) => ({
    name: t(`${id}.name`),
    description: t(`${id}.description`),
    atsNotes: t(`${id}.atsNotes`),
  });
};
