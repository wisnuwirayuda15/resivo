import { useEffect, useSyncExternalStore } from "react";

import { loadGlyphs, loadedGlyphs, onIconCatalogLoaded } from "./catalog";

import type { IconWeight } from "@/features/resume/model/document";

/**
 * The glyph for an icon that is not one of the curated components, in the weight
 * asked for.
 *
 * `useSyncExternalStore` rather than state and an effect, because the glyphs are
 * genuinely external and shared: dozens of icons across the paper and the picker
 * ask for them at once, each weight loads once, and every one of them has to
 * re-render when it arrives. Wiring that by hand would mean one subscription per
 * icon and a render pass per subscription.
 *
 * Returns `undefined` while the weight is in flight, and for a name no build
 * carries. The caller reserves the space in both cases, see `IconRenderer`.
 */
export const useCatalogGlyph = (
  name: string | undefined,
  weight: IconWeight,
): string | undefined => {
  useEffect(() => {
    if (name !== undefined) {
      void loadGlyphs(weight);
    }
  }, [name, weight]);

  return useSyncExternalStore(
    onIconCatalogLoaded,
    () => (name === undefined ? undefined : loadedGlyphs(weight)?.get(name)),
    // On the server no glyphs are ever loaded, so the markup rendered there is
    // the reserved box, which is what hydration then matches.
    () => undefined,
  );
};
