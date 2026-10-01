/**
 * Turns the literal strings of an `as const` message tree into plain `string`.
 *
 * English is written `as const` so a key typed wrongly fails to compile. The
 * other languages are declared `satisfies Widen<typeof en...>`: the same keys,
 * with any text. That is what makes a missing or extra key in a translation a
 * type error, rather than something a reader of the other language finds.
 *
 * The reference project this layout follows uses the same widening to let two
 * languages share one type, but checks nothing else, and its Indonesian files
 * still carry English strings nobody was told about.
 */
export type Widen<T> = T extends string
  ? string
  : { [K in keyof T]: Widen<T[K]> };
