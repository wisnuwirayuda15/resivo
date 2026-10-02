import { defineConfig } from "fumadocs-mdx/config";

/**
 * Global MDX options for the docs.
 *
 * `rehypeCodeOptions: false` turns off the default highlighter, which is shiki.
 * The guide chose highlight.js for its palette (`src/styles/highlight.css`), and
 * shiki also knows nothing of the `resume` fences the format pages are full of,
 * so it throws on the first one. The highlighter this app does use is a rehype
 * plugin added to this list in the article-rendering phase.
 */
export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: false,
  },
});
