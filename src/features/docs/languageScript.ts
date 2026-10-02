import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from "@/lib/i18n/language";

/**
 * Sends someone to the docs language they chose, when the server could not know.
 *
 * `/docs/...` is answered by the server with a redirect, and a server has the
 * browser's `Accept-Language` but not `localStorage`. So a person who picked
 * Indonesian in the app, on a browser that asks for English, is redirected to
 * `/en/docs/...` and would stay there. This runs in the head, before first
 * paint, and corrects that one case.
 *
 * It acts only when the document was itself reached through a redirect
 * (`redirectCount > 0`). That is the whole safeguard: a link someone shares to
 * `/en/docs/x` has no redirect in front of it, so it is never rewritten, and a
 * stored preference cannot override a URL that was asked for by name.
 *
 * A string and not a function, because it is inlined into the document and must
 * not depend on the bundle. A test evaluates it against stubs.
 */
export const DOCS_LANGUAGE_SCRIPT = `try{var n=performance.getEntriesByType('navigation')[0];if(n&&n.redirectCount>0){var m=/^\\/([^/]+)\\/docs(\\/.*)?$/.exec(location.pathname);var s=localStorage.getItem('${LANGUAGE_STORAGE_KEY}');if(m&&s&&s!==m[1]&&${JSON.stringify(SUPPORTED_LANGUAGES)}.indexOf(s)>-1)location.replace('/'+s+'/docs'+(m[2]||'')+location.search+location.hash)}}catch(e){}`;
