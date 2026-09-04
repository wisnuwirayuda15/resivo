/**
 * Object URLs for stored blobs, reference-counted.
 *
 * `URL.createObjectURL` allocates for the lifetime of the document, not of the
 * element pointing at it, an image gallery that made a URL per render would
 * hold every version of every blob it ever showed until the tab closed. So each
 * blob gets exactly one URL, shared by everything that asks, and revoked when the
 * last holder lets go.
 *
 * The count moves synchronously even though the blob is fetched asynchronously.
 * That matters: a React effect can be cleaned up before its load resolves, and a
 * release that only counted after the fetch would either leak the URL or throw
 * away one that a second caller is still using.
 */

import { fontRepo, imageRepo } from "@/database/index";

export interface ResolvedImage {
  url: string;
  /** Intrinsic pixel size, from the stored record rather than from the decoded
   * image, so a layout can reserve the right box before the bytes arrive. */
  width: number;
  height: number;
}

interface Entry<T> {
  refs: number;
  /** The in-flight or settled load. Kept so concurrent callers share one read
   * and one URL. */
  value: Promise<T | null>;
  /** Set once resolved, so releasing can revoke without awaiting. */
  resolved?: T | null;
}

type Kind = "image" | "font";

const cache = new Map<string, Entry<ResolvedImage | string>>();

const keyFor = (kind: Kind, id: string): string => `${kind}:${id}`;

const urlOf = (value: ResolvedImage | string | null): string | undefined => {
  if (value === null) {
    return undefined;
  }

  return typeof value === "string" ? value : value.url;
};

const load = async (
  kind: Kind,
  id: string,
): Promise<ResolvedImage | string | null> => {
  if (kind === "font") {
    const record = await fontRepo.getFont(id);

    return record === undefined ? null : URL.createObjectURL(record.blob);
  }

  const record = await imageRepo.getImage(id);

  return record === undefined
    ? null
    : {
        url: URL.createObjectURL(record.blob),
        width: record.width,
        height: record.height,
      };
};

const acquire = (
  kind: Kind,
  id: string,
): Promise<ResolvedImage | string | null> => {
  const key = keyFor(kind, id);
  const existing = cache.get(key);

  if (existing !== undefined) {
    existing.refs += 1;

    return existing.value;
  }

  const entry: Entry<ResolvedImage | string> = {
    refs: 1,
    value: load(kind, id).then((value) => {
      entry.resolved = value;

      // Released while the read was in flight: revoke now rather than keeping a
      // URL nobody holds.
      if (entry.refs === 0) {
        const url = urlOf(value);

        if (url !== undefined) {
          URL.revokeObjectURL(url);
        }

        cache.delete(key);
      }

      return value;
    }),
  };

  cache.set(key, entry);

  return entry.value;
};

const release = (kind: Kind, id: string): void => {
  const key = keyFor(kind, id);
  const entry = cache.get(key);

  if (entry === undefined) {
    return;
  }

  entry.refs -= 1;

  if (entry.refs > 0) {
    return;
  }

  // `resolved` absent means the load has not settled; its own handler will see
  // the zero count and clean up. Deleting the entry here instead would let a
  // later acquire start a second read for the same blob.
  if ("resolved" in entry) {
    const url = urlOf(entry.resolved ?? null);

    if (url !== undefined) {
      URL.revokeObjectURL(url);
    }

    cache.delete(key);
  }
};

export const acquireImageUrl = (id: string): Promise<ResolvedImage | null> =>
  acquire("image", id) as Promise<ResolvedImage | null>;

export const releaseImageUrl = (id: string): void => release("image", id);

export const acquireFontUrl = (id: string): Promise<string | null> =>
  acquire("font", id) as Promise<string | null>;

export const releaseFontUrl = (id: string): void => release("font", id);

/**
 * Drops a cached URL regardless of who holds it.
 *
 * For deletion and for replacing a blob under the same id: the row is gone, so
 * the URL now points at bytes that no longer exist, and a holder redrawing it
 * would show a broken image rather than re-reading.
 */
export const invalidateAsset = (kind: Kind, id: string): void => {
  const key = keyFor(kind, id);
  const entry = cache.get(key);

  if (entry === undefined) {
    return;
  }

  cache.delete(key);

  void entry.value.then((value) => {
    const url = urlOf(value);

    if (url !== undefined) {
      URL.revokeObjectURL(url);
    }
  });
};

/** Test seam: how many blobs currently hold a URL. */
export const __cachedAssetCount = (): number => cache.size;
