import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { detectLanguage } from "@/lib/i18n/language";

import { negotiateLanguage } from "./negotiate";

/**
 * The language a bare `/docs` should become.
 *
 * In the browser it is the app's own `detectLanguage()`: the stored choice, then
 * the browser's list, then English, which is exactly what the rest of the app
 * does and is read synchronously, so a client navigation redirects without a
 * flash. On the server there is no storage, so it is the `Accept-Language`
 * header; `languageScript.ts` corrects the one case that gets wrong.
 */
export const preferredDocsLanguage = createIsomorphicFn()
  .client(() => detectLanguage())
  .server(() => negotiateLanguage(getRequestHeader("accept-language")));
