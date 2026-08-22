/**
 * `postcss-safe-parser` ships no types of its own, and there is no
 * `@types/postcss-safe-parser`.
 *
 * The whole package is one function with the same shape as `postcss.parse`: CSS
 * in, a `Root` out, recovering from syntax errors instead of throwing. Declaring
 * that here is more honest than an `any` at the import, which would let a wrong
 * call through silently.
 */
declare module 'postcss-safe-parser' {
  import type { ProcessOptions, Root } from 'postcss'

  const safeParse: (css: string, options?: Pick<ProcessOptions, 'from'>) => Root

  export default safeParse
}
