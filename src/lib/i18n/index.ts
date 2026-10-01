import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  DEFAULT_NS,
  FALLBACK_LANGUAGE,
  NAMESPACES,
  RESOURCES,
  SUPPORTED_LANGUAGES,
  detectLanguage,
  storeLanguage,
} from "./language";

import type { AppLanguage } from "./language";

/**
 * The i18next instance, created once.
 *
 * On the server it is English and never changes, so one shared instance is
 * safe. In the browser it starts in the language this device uses, already
 * detected, which is not the same as the language the first render uses:
 * `useTranslation` in `./useTranslation` reads English while a component
 * hydrates and the real language afterwards, so the instance can be ready
 * before React is without the markup disagreeing with the server's.
 *
 * Messages are bundled and initialisation is synchronous, so there is no moment
 * at which `t` returns a key instead of a sentence, and `useSuspense` is off
 * because there is nothing to suspend for.
 */
void i18n.use(initReactI18next).init({
  resources: RESOURCES,
  lng: typeof window === "undefined" ? FALLBACK_LANGUAGE : detectLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  ns: [...NAMESPACES],
  defaultNS: DEFAULT_NS,
  interpolation: {
    // React escapes what it renders. Escaping here as well would turn an
    // apostrophe in a resume title into an entity in the middle of a sentence.
    escapeValue: false,
  },
  react: { useSuspense: false },
  initAsync: false,
});

/**
 * Switches language and remembers the choice.
 *
 * No reload, unlike the reference project, which reloads because it reads the
 * language at module load in several places. Here `t` is called during render
 * and nowhere else, so every component that shows a message is re-rendered by
 * the language change itself.
 */
export const setLanguage = async (language: AppLanguage): Promise<void> => {
  storeLanguage(language);
  await i18n.changeLanguage(language);
};

export default i18n;
