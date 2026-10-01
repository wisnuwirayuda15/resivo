import { useEffect, useLayoutEffect } from "react";

import "dayjs/locale/id";

import { useUiLanguage } from "./useTranslation";

/**
 * Keeps `<html lang>` and the date locale in step with the interface language.
 *
 * It does not choose the language and does not change it. The language is
 * detected when the instance is created, and each component renders in it by way
 * of `useUiLanguage`, which is what keeps hydration safe (see that file for why a
 * single effect here could not).
 *
 * `<html lang>` is hard-coded to `en` in the root document, which is right for
 * the server and wrong for a reader in Indonesian whose screen reader picks its
 * voice from that attribute, so it is corrected here. The attribute sits outside
 * React's tree, so `suppressHydrationWarning` on `<html>` already covers it.
 */

/** A layout effect where there is a browser to lay out for, a plain effect on
 * the server, where React would warn about the layout one. */
const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export const LanguageSync: React.FC = () => {
  const language = useUiLanguage();

  useBrowserLayoutEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
};
