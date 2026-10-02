import { getBreadcrumbItems } from "fumadocs-core/breadcrumb";
import { createSearchAPI } from "fumadocs-core/search/server";

import { source } from "../source";

import type { SearchAPI } from "fumadocs-core/search/server";

/**
 * One search index per language, built from the same loader as the pages.
 *
 * Per language and not one index for all of them (which `createFromSource`
 * would make) because the index is downloaded by the visitor's browser in full:
 * a reader of the Indonesian docs has no use for the English text, and it would
 * roughly double what they fetch before their first search. A page's breadcrumbs
 * are its folders, so a hit says where it lives.
 *
 * Built once per language per server process and kept, since the content is
 * fixed for the life of a build. Server only: it imports the collection.
 */
const servers = new Map<string, SearchAPI>();

export const searchServerFor = (lang: string): SearchAPI => {
  const existing = servers.get(lang);

  if (existing !== undefined) {
    return existing;
  }

  const tree = source.getPageTree(lang);
  const created = createSearchAPI("advanced", {
    // A function, because with async collections a page's text is a lazy chunk
    // and has to be awaited. The engine calls it once, when first asked.
    indexes: () =>
      Promise.all(
        source.getPages(lang).map(async (page) => ({
          id: page.url,
          url: page.url,
          title: page.data.title,
          description: page.data.description,
          breadcrumbs: getBreadcrumbItems(page.url, tree).map((item) =>
            String(item.name),
          ),
          structuredData: await page.data.structuredData(),
        })),
      ),
  });

  servers.set(lang, created);

  return created;
};
