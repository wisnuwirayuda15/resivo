import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";

import { docsI18n } from "./i18n";
import { docsMarkdownOptions } from "./markdown/stringify";

/**
 * The docs collection and the loader that turns it into pages and a tree.
 *
 * `async: true` keeps the compiled MDX out of the route's own chunk: the front
 * matter is bundled up front (the tree and search need it), and a page's body is
 * a lazy chunk fetched when that page is opened. Without it every page of every
 * language would ship with the first one.
 *
 * `includeProcessedMarkdown` is what lets a page be read back as plain Markdown
 * (`page.data.getText("processed")`), which is the whole of the copy-as-Markdown
 * button and the `.md` and `llms.txt` routes. It is a compile-time flag, not
 * something a route can ask for later, and its options say how each component
 * is written without its tags (see `markdown/stringify.ts`).
 *
 * Server and Vite only. The macro is rewritten by `fumadocsMdx()` in the Vite
 * config, so Vitest, which loads no Vite plugins, can never import this file.
 * Anything a test needs lives in a pure module beside it.
 */
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    async: true,
    postprocess: { includeProcessedMarkdown: docsMarkdownOptions },
  },
});

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: "/docs",
  i18n: docsI18n,
});
