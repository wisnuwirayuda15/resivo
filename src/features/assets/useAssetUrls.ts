import { useEffect, useState } from 'react'

import {
  acquireFontUrl,
  acquireImageUrl,
  releaseFontUrl,
  releaseImageUrl,
} from './objectUrl'

import type { ResolvedImage } from './objectUrl'

/**
 * Object URLs for a set of stored assets, held for exactly as long as the
 * component that asked.
 *
 * Written as "a set" rather than "one" on purpose. The paper needs every image
 * it references at once, and one hook per image would mean the number of hooks a
 * component calls depends on the document — which React does not allow.
 *
 * The identity of the returned map changes only when its contents do, because the
 * paginator compares it by reference: a new map on every render would re-measure
 * the whole document on every keystroke.
 */

/** `null` for an id whose row is gone — see `ImageMap`. */
export type ImageMap = ReadonlyMap<string, ResolvedImage | null>

const EMPTY_IMAGES: ImageMap = new Map()
const EMPTY_URLS: ReadonlyMap<string, string> = new Map()

/**
 * A stable dependency for a set of ids: sorted, so order does not matter, and
 * joined, because an effect can only depend on a primitive. Ids are generated,
 * so the separator cannot appear inside one.
 */
const idsKey = (ids: ReadonlyArray<string>): string => [...ids].sort().join(',')

export const useImageUrls = (ids: ReadonlyArray<string>): ImageMap => {
  const [resolved, setResolved] = useState<ImageMap>(EMPTY_IMAGES)
  const key = idsKey(ids)

  useEffect(() => {
    const wanted = key === '' ? [] : key.split(',')

    if (wanted.length === 0) {
      setResolved(EMPTY_IMAGES)

      return
    }

    let cancelled = false

    // Acquired synchronously, so the release below always balances even if this
    // effect is cleaned up before the reads finish.
    const loads = wanted.map(
      async (id) => [id, await acquireImageUrl(id)] as const,
    )

    void Promise.all(loads).then((entries) => {
      if (cancelled) {
        return
      }

      // Nulls are kept, not filtered: an id mapped to `null` is a row that is
      // gone, an id that is absent is one still being read, and the paper draws
      // those two differently.
      setResolved(new Map(entries))
    })

    return () => {
      cancelled = true

      for (const id of wanted) {
        releaseImageUrl(id)
      }
    }
  }, [key])

  return resolved
}

export const useFontUrls = (
  ids: ReadonlyArray<string>,
): ReadonlyMap<string, string> => {
  const [resolved, setResolved] =
    useState<ReadonlyMap<string, string>>(EMPTY_URLS)
  const key = idsKey(ids)

  useEffect(() => {
    const wanted = key === '' ? [] : key.split(',')

    if (wanted.length === 0) {
      setResolved(EMPTY_URLS)

      return
    }

    let cancelled = false

    const loads = wanted.map(
      async (id) => [id, await acquireFontUrl(id)] as const,
    )

    void Promise.all(loads).then((entries) => {
      if (cancelled) {
        return
      }

      setResolved(
        new Map(
          entries.filter(
            (entry): entry is [string, string] => entry[1] !== null,
          ),
        ),
      )
    })

    return () => {
      cancelled = true

      for (const id of wanted) {
        releaseFontUrl(id)
      }
    }
  }, [key])

  return resolved
}

/** One image, for the gallery's thumbnails. */
export const useImageUrl = (
  id: string | undefined,
): ResolvedImage | undefined => {
  const [resolved, setResolved] = useState<ResolvedImage | undefined>(undefined)

  useEffect(() => {
    if (id === undefined) {
      setResolved(undefined)

      return
    }

    let cancelled = false

    void acquireImageUrl(id).then((value) => {
      if (!cancelled) {
        setResolved(value ?? undefined)
      }
    })

    return () => {
      cancelled = true
      releaseImageUrl(id)
    }
  }, [id])

  return resolved
}
