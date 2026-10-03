import { createContext } from "react";

/**
 * The address of the site, written into the docs where an example needs one.
 *
 * A page that says "add this server" has to name the server, and the right name
 * depends on where the reader is: the deployment, a preview, a copy on their own
 * machine. The text is written once with this token, and each surface swaps it
 * for the origin it knows: the page from the loader's origin, the Markdown from
 * the request that asked for it. It is only used inside code fences, where
 * `{{ }}` is literal text and the highlighter keeps it in one piece.
 */
export const ORIGIN_TOKEN = "{{origin}}";

/** What stands in when no origin can be found at all (no `SITE_URL`, no request
 * URL), which a reader can see is a placeholder and not a working address. */
const UNKNOWN_ORIGIN = "https://your-resivo-address";

export const withOrigin = (text: string, origin: string | null): string =>
  text.replaceAll(ORIGIN_TOKEN, origin ?? UNKNOWN_ORIGIN);

/** The origin for the page being drawn, provided by the page route. */
export const OriginContext = createContext<string | null>(null);
