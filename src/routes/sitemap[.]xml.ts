import { createFileRoute } from "@tanstack/react-router";

import { parseDocsPath } from "@/features/docs/paths";
import { buildSitemap, languageAlternates } from "@/features/docs/sitemap";
import { source } from "@/features/docs/source";
import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/i18n/language";
import { requestOrigin } from "@/lib/siteOrigin";

import type { SitemapEntry } from "@/features/docs/sitemap";

/** The app's own public pages. The rest of the app renders one browser's data
 * and is not listed (see `robots.ts`). */
const PUBLIC_PATHS = ["/", "/templates", "/about"];

/**
 * `/sitemap.xml`: the three public pages and every documentation page, each
 * with its translations.
 *
 * Built from the same loader as the pages, so a page cannot exist without being
 * listed or be listed without existing. A page and its translations share their
 * slugs by rule, which is what lets the alternates be written without looking
 * each one up.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = requestOrigin(request);

        const docs: Array<SitemapEntry> = SUPPORTED_LANGUAGES.flatMap((lang) =>
          source.getPages(lang).map((page) => ({
            path: page.url,
            alternates: languageAlternates(
              parseDocsPath(page.url)?.slugs ?? [],
            ),
            defaultLang: FALLBACK_LANGUAGE,
          })),
        );

        return new Response(
          buildSitemap(origin, [
            ...PUBLIC_PATHS.map((path) => ({ path })),
            ...docs,
          ]),
          {
            headers: { "Content-Type": "application/xml; charset=utf-8" },
          },
        );
      },
    },
  },
});
