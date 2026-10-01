import { useSyncExternalStore } from "react";
import { useTranslation as useI18nextTranslation } from "react-i18next";

import i18n from "./index";
import { FALLBACK_LANGUAGE, isAppLanguage } from "./language";

import { LocalizedError } from "./LocalizedError";

import type { ErrorParams } from "./LocalizedError";
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

/**
 * The words for an error, in the interface language.
 *
 * A `LocalizedError` is worded from its key and parameters, so a refusal reads in
 * whichever language the screen is in even if it was raised in another. Anything
 * else is shown as its own message, because an error nobody planned for has no
 * key and paraphrasing it would be inventing what it meant.
 *
 * The one cast is here and not at each call: the key arrives as a runtime string
 * from an error, which the type system cannot check against the message tree.
 * Both languages having every key is the parity test's job.
 */
export const useErrorText = (): ((
  error: unknown,
  fallback: string,
) => string) => {
  const { t } = useTranslation();
  const lookup = t as unknown as (key: string, options?: ErrorParams) => string;

  return (error, fallback) => {
    if (error instanceof LocalizedError) {
      return lookup(error.key, error.params);
    }

    return error instanceof Error ? error.message : fallback;
  };
};

/**
 * `Trans`, re-exported so no file but this one imports from the library.
 *
 * Give it the `t` of `useTranslation` (`<Trans t={t} i18nKey=... />`), which is
 * the one pinned to the language this component should render in. Without it
 * `Trans` follows the global instance, which is the thing the wrapper above
 * exists to avoid.
 */
export { Trans } from "react-i18next";
