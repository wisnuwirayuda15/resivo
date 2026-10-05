/** Vite's `?raw` suffix, which the webpack config in `remotion.config.ts` maps. */
declare module "*?raw" {
  const text: string;
  export default text;
}
