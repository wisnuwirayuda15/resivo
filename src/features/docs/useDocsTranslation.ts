import i18n from "@/lib/i18n";

import type { DocsLanguage } from "./paths";

/**
 * `t` for the docs chrome, fixed to the language in the URL.
 *
 * Not the app's `useTranslation`, which follows the stored interface language: a
 * reader on `/id/docs` with English stored would otherwise get an Indonesian
 * article inside English chrome. `getFixedT` is stateless, so it is safe on the
 * server, where the one i18next instance is shared by every request, and it
 * never touches the global language, so opening a docs link does not change the
 * preference the rest of the app uses.
 */
export const useDocsTranslation = (lang: DocsLanguage) => ({
  t: i18n.getFixedT(lang, "docs"),
});
