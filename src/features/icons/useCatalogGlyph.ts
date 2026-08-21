import { useEffect, useSyncExternalStore } from 'react'

import {
  loadIconCatalog,
  loadedIconCatalog,
  onIconCatalogLoaded,
} from './catalog'

/**
 * The glyph for an icon that is not one of the curated components.
 *
 * `useSyncExternalStore` rather than state and an effect, because the catalog is
 * genuinely external and shared: dozens of icons across the paper and the picker
 * ask for it at once, it loads once, and every one of them has to re-render when
 * it arrives. Wiring that by hand would mean one subscription per icon and a
 * render pass per subscription.
 *
 * Returns `undefined` while the catalog is in flight, and for a name no build
 * carries. The caller reserves the space in both cases — see `IconRenderer`.
 */
export const useCatalogGlyph = (
  name: string | undefined,
): string | undefined => {
  useEffect(() => {
    if (name !== undefined) {
      void loadIconCatalog()
    }
  }, [name])

  return useSyncExternalStore(
    onIconCatalogLoaded,
    () =>
      name === undefined
        ? undefined
        : loadedIconCatalog()?.byName.get(name)?.body,
    // On the server the catalog is never loaded, so the markup rendered there is
    // the reserved box — which is what hydration then matches.
    () => undefined,
  )
}
