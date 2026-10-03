import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { getBreadcrumbItems } from "fumadocs-core/breadcrumb";

import { resolveSiteOrigin } from "@/lib/siteOrigin";

import { docsHref } from "./paths";
import { source } from "./source";

import type { DocsLanguage } from "./paths";

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
 * One page: which file to load on the client, its address, and what its head
 * needs to say about it.
 *
 * A missing page is thrown as `notFound()`, so an unknown slug is a 404 with the
 * right status and not an empty article. The origin and the breadcrumb trail are
 * here because only the server knows them: the origin comes from the deployment
 * (`SITE_URL`, see `resolveSiteOrigin`) and the trail from the page tree.
 */
export const getDocsPage = createServerFn({ method: "GET" })
  .validator((input: PageRequest) => input)
  .handler(({ data }) => {
    const page = source.getPage(data.slugs, data.lang);

    if (!page) {
      throw notFound();
    }

    const tree = source.getPageTree(data.lang);

    return {
      path: page.path,
      url: page.url,
      title: page.data.title,
      description: page.data.description,
      origin: resolveSiteOrigin(process.env.SITE_URL, getRequestUrl().href),
      crumbs: [
        { name: String(tree.name), url: docsHref(data.lang as DocsLanguage) },
        ...getBreadcrumbItems(page.url, tree).map((item) => ({
          name: String(item.name),
          url: item.url,
        })),
        { name: page.data.title, url: page.url },
      ],
    };
  });
