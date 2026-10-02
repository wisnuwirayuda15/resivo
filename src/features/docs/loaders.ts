import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { source } from "./source";

interface TreeRequest {
  lang: string;
}

interface PageRequest extends TreeRequest {
  slugs: Array<string>;
}

/**
 * The sidebar's tree for one language, serialised.
 *
 * A server function so `source` (and with it every page's front matter) stays
 * out of the browser's own bundle for anything but the tree it is handed. It
 * is the layout's loader and runs once per language, not once per page.
 */
export const getDocsTree = createServerFn({ method: "GET" })
  .validator((input: TreeRequest) => input)
  .handler(async ({ data }) => ({
    pageTree: await source.serializePageTree(source.getPageTree(data.lang)),
  }));

/**
 * One page: which file to load on the client, and its address.
 *
 * A missing page is thrown as `notFound()`, so an unknown slug is a 404 with the
 * right status and not an empty article.
 */
export const getDocsPage = createServerFn({ method: "GET" })
  .validator((input: PageRequest) => input)
  .handler(({ data }) => {
    const page = source.getPage(data.slugs, data.lang);

    if (!page) {
      throw notFound();
    }

    return {
      path: page.path,
      url: page.url,
      title: page.data.title,
      description: page.data.description,
    };
  });
