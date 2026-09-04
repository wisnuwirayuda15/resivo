/**
 * Whether the user has been shown a tour.
 *
 * In `localStorage`, following `features/editor/panels.ts` rather than the
 * settings table, and for the same reason that file gives: this has to be
 * readable synchronously. The tour decides whether to start on the first paint
 * of a route, and an async read would either flash an overlay onto someone who
 * has already dismissed it or delay it for someone who has not.
 *
 * A missing or unreadable value means "not seen", which is the safe direction:
 * a private window shows the tour again, which is right, it is a new device as
 * far as this app is concerned.
 */

const STORAGE_PREFIX = 'resivo.onboarding'

export type TourName = 'library' | 'editor'

const storageKey = (name: TourName): string => `${STORAGE_PREFIX}.${name}`

export const hasSeenTour = (name: TourName): boolean => {
  // Guarded rather than assumed: this is called during render, and a browser
  // set to block site data throws on access rather than returning null.
  try {
    return localStorage.getItem(storageKey(name)) !== null
  } catch {
    return false
  }
}

export const markTourSeen = (name: TourName): void => {
  try {
    localStorage.setItem(storageKey(name), String(Date.now()))
  } catch {
    // A full or blocked store is not worth interrupting anything for. The cost
    // is that the tour offers itself again next time.
  }
}
