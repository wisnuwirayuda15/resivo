import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { source } from "./source";

interface PageRequest {
  lang: string;
  slugs: Array<string>;
}

/**
 * One page, as the route needs it: which file to load on the client and the
 * serialised tree for the sidebar.
 *
 * A server function so `source` (and with it every page's front matter) stays
 * out of the browser's own bundle for anything but the tree it is handed.
 */
export const getDocsPage = createServerFn({ method: "GET" })
  .validator((input: PageRequest) => input)
  .handler(async ({ data }) => {
    const page = source.getPage(data.slugs, data.lang);

    if (!page) {
      throw notFound();
    }

    return {
      path: page.path,
      url: page.url,
      pageTree: await source.serializePageTree(source.getPageTree(data.lang)),
    };
  });
