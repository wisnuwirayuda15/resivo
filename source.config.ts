import { defineConfig } from "fumadocs-mdx/config";

import { rehypeHighlight } from "./src/features/docs/highlight/rehypeHighlight";

/**
 * Global MDX options for the docs.
 *
 * `rehypeCodeOptions: false` turns off the default highlighter, which is shiki.
 * The guide chose highlight.js for its palette (`src/styles/highlight.css`), and
 * shiki also knows nothing of the `resume` fences the format pages are full of,
 * so it throws on the first one. `rehypeHighlight` is the replacement: the same
 * highlight.js, run at compile time, with a `resume` grammar and a header
 * (title, language) the block component reads. Added after the defaults, so the
 * heading ids and the table of contents they produce are untouched.
 *
 * Relative import, not `@/`: this file is loaded by Fumadocs' own config loader,
 * which does not read the app's path aliases.
 */
export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: false,
    rehypePlugins: (defaults) => [...defaults, rehypeHighlight],
  },
});
