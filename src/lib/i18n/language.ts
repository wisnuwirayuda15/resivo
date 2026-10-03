import { en } from "@/locales/en";
import { id } from "@/locales/id";

import type { Widen } from "@/locales/widen";

/**
 * The languages the interface speaks, and how one is chosen.
 *
 * This is the interface only. A resume has its own language (`meta.locale`),
 * which decides how its dates are written and what "Present" is called, and the
 * two are independent on purpose: someone can run the app in English and write
 * an Indonesian resume, which is the usual case.
 */

export const SUPPORTED_LANGUAGES = ["en", "id"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * English, and not the Indonesian the reference project falls back to. The
 * app routes are always rendered by the server in this language and switch after
 * hydration (see `LanguageSync`), so what a search engine sees of them is stable.
 * The docs are the exception: their routes carry a language of their own, and the
 * server renders each in it, `html lang` included.
 */
export const FALLBACK_LANGUAGE: AppLanguage = "en";

/**
 * Each language written as itself, which is how a language picker has to name
 * them: someone who cannot read the current language must still find theirs.
 */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

/**
 * Every message, by language and then namespace.
 *
 * `satisfies` means Indonesian must have every namespace English has, and no
 * others. The keys inside each namespace are checked where each file is written.
 */
export const RESOURCES = { en, id } satisfies Record<
  AppLanguage,
  Widen<typeof en>
>;

export const DEFAULT_NS = "common";

export const NAMESPACES = Object.keys(en) as Array<keyof typeof en>;

export const LANGUAGE_STORAGE_KEY = "resivo.language";

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  typeof value === "string" &&
  (SUPPORTED_LANGUAGES as ReadonlyArray<string>).includes(value);

/**
 * What the person chose, if they did. `null` for no choice, and for a browser
 * that will not let this read storage at all, which is a real state (a private
 * window, blocked site data), so every read is guarded as the sidebar's is.
 */
export const readStoredLanguage = (): AppLanguage | null => {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    return isAppLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const storeLanguage = (language: AppLanguage): void => {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Not remembered, and still applied for this visit.
  }
};

/**
 * The language to use: the stored choice, then the browser's own list in its
 * order of preference, then English.
 *
 * Client only. The reference project hands this to a language-detector plugin
 * that runs while i18next initialises, and that is wrong here: the server
 * renders without a browser, so detecting at init makes the first client render
 * differ from the markup it is hydrating. This runs after hydration instead.
 */
export const detectLanguage = (): AppLanguage => {
  const stored = readStoredLanguage();

  if (stored !== null) {
    return stored;
  }

  const preferred = typeof navigator === "undefined" ? [] : navigator.languages;

  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];

    if (isAppLanguage(base)) {
      return base;
    }
  }

  return FALLBACK_LANGUAGE;
};
