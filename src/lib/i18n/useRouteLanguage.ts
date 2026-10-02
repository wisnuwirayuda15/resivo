import { useParams } from "@tanstack/react-router";

import { isAppLanguage } from "./language";

import type { AppLanguage } from "./language";

/**
 * The language the URL names, if it names one.
 *
 * Only the docs put a language in the path (`/en/docs`), so this is null
 * everywhere else and the stored interface language decides, as before. Where it
 * is set it wins for `<html lang>` and the date locale: the address is what a
 * reader and a crawler both see, and a shared `/id/docs` link has to read as
 * Indonesian whatever the visitor's own preference is.
 *
 * Works without a match, so it is safe in the root document, which renders
 * outside any one route.
 */
export const useRouteLanguage = (): AppLanguage | null => {
  const { lang } = useParams({ strict: false });

  return isAppLanguage(lang) ? lang : null;
};
