import { isAppLanguage } from "@/lib/i18n/language";

import type { AppLanguage } from "@/lib/i18n/language";

/**
 * Where a docs page lives, in one place.
 *
 * Pure on purpose: the loader, the language switcher, the sitemap and the tests
 * all need to build and read these paths, and none of them should have to import
 * the collection (which only Vite can load) to do it.
 */

export type DocsLanguage = AppLanguage;

export const isDocsLanguage = (value: unknown): value is DocsLanguage =>
  isAppLanguage(value);

/** `/en/docs`, `/id/docs/format/overview`. No trailing slash, ever. */
export const docsHref = (
  lang: DocsLanguage,
  slugs: ReadonlyArray<string> = [],
): string => `/${lang}/docs${slugs.length === 0 ? "" : `/${slugs.join("/")}`}`;

const DOCS_PATH = /^\/([^/]+)\/docs(?:\/(.*?))?\/?$/;

/**
 * The language and slugs a docs path names, or null for a path that is not one.
 * A language that is not supported still parses, so the caller can tell "not a
 * docs path" from "a docs path in a language we do not have".
 */
export const parseDocsPath = (
  pathname: string,
): { lang: string; slugs: Array<string> } | null => {
  const match = DOCS_PATH.exec(pathname);

  if (match === null || match[1] === undefined) {
    return null;
  }

  return {
    lang: match[1],
    slugs: (match[2] ?? "").split("/").filter(Boolean),
  };
};

/**
 * The same page in another language.
 *
 * Slugs are identical across languages by rule (a test enforces it), so the
 * switch is a swap of the first segment and nothing has to be looked up. A path
 * that is not a docs path is returned as it was.
 */
export const switchLanguageHref = (
  pathname: string,
  to: DocsLanguage,
): string => {
  const parsed = parseDocsPath(pathname);

  return parsed === null ? pathname : docsHref(to, parsed.slugs);
};
