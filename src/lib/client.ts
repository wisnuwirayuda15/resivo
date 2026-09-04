/**
 * Browser-environment guards.
 *
 * Resivo keeps TanStack Start's SSR shell, but every byte of user data lives in
 * IndexedDB, which does not exist on the server. Anything that touches the
 * database, Monaco, the preview iframe or drag-and-drop must therefore be
 * reachable only from the client, and these guards are how that boundary is
 * enforced in code rather than by convention.
 */

/** True in the browser, false while rendering on the Nitro server. */
export const isBrowser = (): boolean => typeof window !== 'undefined'

/**
 * IndexedDB is absent on the server, and can also be unavailable in the browser
 * (Firefox blocks it in private windows, and some embedded webviews disable it),
 * so availability is checked rather than inferred from `isBrowser()`.
 */
export const hasIndexedDb = (): boolean => typeof indexedDB !== 'undefined'

/**
 * Fails loudly when browser-only code is reached on the server.
 *
 * Preferred over silently returning a default: a route loader that accidentally
 * runs server-side should break in development, not quietly render an empty
 * resume list.
 */
export const assertBrowser = (feature: string): void => {
  if (!isBrowser()) {
    throw new Error(
      `${feature} is browser-only and was reached during server rendering. ` +
        'Move it behind a client-only boundary (ssr: false, or an effect).',
    )
  }
}
