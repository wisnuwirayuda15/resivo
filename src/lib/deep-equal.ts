/**
 * Structural equality for plain JSON-shaped values.
 *
 * Written rather than compared as serialised JSON because key order differs
 * between an object this build constructs and the same object after a round trip
 * through IndexedDB or a backup file, a string comparison would report those as
 * different when they are not, which for the style panel means offering to reset
 * customisations the user never made.
 *
 * Only handles what the document model contains: primitives, arrays and plain
 * objects. Dates, maps, sets and cycles are out of scope and would be a bug at
 * the call site rather than something to accommodate here.
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true
  }

  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false
    }

    return a.every((item, index) => deepEqual(item, b[index]))
  }

  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>

  // Own enumerable keys only, and `undefined` values count: a key present with
  // `undefined` and a key absent mean the same thing in this model (an optional
  // field left unset), so both sides are filtered the same way.
  const keys = (value: Record<string, unknown>) =>
    Object.keys(value).filter((key) => value[key] !== undefined)

  const leftKeys = keys(left)
  const rightKeys = keys(right)

  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key) => deepEqual(left[key], right[key]))
}
