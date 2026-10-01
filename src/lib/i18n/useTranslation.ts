import { useSyncExternalStore } from "react";
import { useTranslation as useI18nextTranslation } from "react-i18next";

import i18n from "./index";
import { FALLBACK_LANGUAGE, isAppLanguage } from "./language";

import type { AppLanguage } from "./language";

/**
 * The language this component should render in, safely across hydration.
 *
 * `useSyncExternalStore` with a server snapshot is what React offers for state
 * that exists only in the browser. While a component hydrates it reads the
 * server snapshot, English, which is what the server rendered, and once it has
 * hydrated React re-renders it with the real value if the two differ. That holds
 * per component, whenever each one happens to hydrate.
 *
 * The timing is the point. An earlier version changed the language in one
 * effect at the root, after the first commit, and that was wrong: React hydrates
 * the tree in pieces, the parts inside a Suspense boundary some time after the
 * part around them, so a language switched at the root had already changed by
 * the time the rest hydrated. The server markup said "Toggle navigation", the
 * client rendered "Buka atau tutup navigasi", and React threw the subtree away
 * and rebuilt it. Nothing a single root effect does can be right for every
 * piece, only a snapshot read inside each can.
 */

const subscribe = (onChange: () => void): (() => void) => {
  i18n.on("languageChanged", onChange);

  return () => i18n.off("languageChanged", onChange);
};

const getSnapshot = (): AppLanguage => {
  const language = i18n.resolvedLanguage ?? i18n.language;

  return isAppLanguage(language) ? language : FALLBACK_LANGUAGE;
};

const getServerSnapshot = (): AppLanguage => FALLBACK_LANGUAGE;

export const useUiLanguage = (): AppLanguage =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/**
 * `useTranslation`, pinned to `useUiLanguage()`.
 *
 * Every component imports this and not `react-i18next`'s own, and lint says so.
 * The only difference is the `lng` it passes: the library's hook follows the
 * global instance, which on the client already holds the stored language while
 * a component that has not hydrated yet is still owed English.
 */
export const useTranslation = ((
  ns?: Parameters<typeof useI18nextTranslation>[0],
  options?: Parameters<typeof useI18nextTranslation>[1],
) => {
  const lng = useUiLanguage();

  return useI18nextTranslation(ns, { ...options, lng });
}) as typeof useI18nextTranslation;
