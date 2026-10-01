/**
 * The compile-time proof that a `switch` covered every member of a union.
 *
 * Reaching it at run time means a value arrived that the types said could not,
 * which for this app is a document stored by a newer version, so it throws with
 * the value rather than carrying on with a guess.
 */
export const assertNever = (value: never): never => {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
};
