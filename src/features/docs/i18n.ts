import { defineI18n } from "fumadocs-core/i18n";

import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/i18n/language";

/**
 * The languages the docs are written in.
 *
 * Derived from the interface's own list rather than declared a second time, so
 * adding a language is one change in `lib/i18n/language.ts` plus a folder under
 * `content/docs`, and the parity tests fail until both exist. `hideLocale:
 * "never"` because the language is in the path on purpose: `/en/docs` and
 * `/id/docs` are separate documents a crawler can index, where one URL that
 * flips language after hydration would show a crawler English only.
 *
 * `parser: "dir"` reads `content/docs/<lang>/...`, which keeps a translated tree
 * side by side with the original instead of interleaving `page.id.mdx` files.
 */
export const docsI18n = defineI18n({
  defaultLanguage: FALLBACK_LANGUAGE,
  languages: [...SUPPORTED_LANGUAGES],
  parser: "dir",
  hideLocale: "never",
});
