/**
 * Stable identifiers for document nodes and database rows.
 *
 * Every node in the resume document carries one so drag-and-drop, undo/redo and
 * diffing can key off identity instead of array position.
 */

/**
 * `crypto.randomUUID` is available in every browser Resivo targets and in Node
 * 19+, but it is only exposed on secure origins. The fallback keeps
 * `createId()` usable on plain-HTTP dev servers and in test runners without
 * pulling in a dependency; collision risk at document scale is negligible.
 */
export const createId = (): string => {
  // Read through a partial type so TypeScript does not narrow `crypto` to
  // `never` on the fallback path: its lib type always declares `randomUUID`,
  // even though older and insecure-origin runtimes do not ship it.
  const source: Partial<Crypto> | undefined =
    typeof crypto === "undefined" ? undefined : crypto;

  if (typeof source?.randomUUID === "function") {
    return source.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof source?.getRandomValues === "function") {
    source.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes.set([Math.floor(Math.random() * 256)], i);
    }
  }

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  // RFC 4122 version 4 layout: the version nibble is pinned to 4 and the
  // variant nibble to 8-b. Patched on the hex string rather than the byte array
  // so no element is read back (`noUncheckedIndexedAccess`).
  const variant = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16);

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20),
  ].join("-");
};
