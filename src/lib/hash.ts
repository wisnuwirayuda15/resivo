/**
 * Content hashing for uploaded assets.
 *
 * Images and fonts are identified by content as well as by id, which is what
 * lets the gallery dedupe a re-upload of the same file and lets a backup import
 * recognise an asset it already has under a different id.
 */

/**
 * SHA-256 of a blob's bytes, as lowercase hex.
 *
 * `crypto.subtle` is browser-only and requires a secure context; the caller is
 * always inside a client-only boundary, so a missing implementation is a
 * programming error rather than something to degrade around.
 */
export const hashBlob = async (blob: Blob): Promise<string> => {
  // Read through a partial type: `crypto.subtle` is declared as always present,
  // but it is genuinely absent on insecure origins, so the check has to survive
  // TypeScript narrowing it away.
  const subtle = (typeof crypto === 'undefined' ? undefined : crypto)?.subtle

  if (subtle === undefined) {
    throw new Error(
      'Web Crypto is unavailable, so uploaded files cannot be hashed. ' +
        'This requires a secure context (https or localhost).',
    )
  }

  const digest = await subtle.digest('SHA-256', await blob.arrayBuffer())

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
