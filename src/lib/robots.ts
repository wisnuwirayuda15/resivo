/**
 * The paths that render one browser's own data, which a crawler can only ever
 * see as an empty shell. Kept next to the text that uses them so the e2e spec
 * and the file cannot name different lists.
 */
export const APP_PATHS = [
  "/resumes",
  "/archive",
  "/images",
  "/fonts",
  "/settings",
] as const;

/**
 * `robots.txt`, built per request so it can name the sitemap by its absolute
 * address, which the format requires and a static file could not know.
 *
 * Three app pages and the documentation are worth indexing. Everything else
 * renders the contents of one browser's IndexedDB, so a crawler would only ever
 * see an empty shell of it, and an empty shell in a search index is worse than
 * no result at all. The same routes also carry a `noindex` meta tag. The two are
 * not redundant: this file stops the fetch, the meta tag stops the indexing of a
 * page that was reached by a link from somewhere else.
 *
 * Without an origin the `Sitemap` line is left out, since a relative one is
 * invalid and would be ignored.
 */
export const buildRobots = (origin: string | null): string =>
  [
    "# Resivo",
    "#",
    "# Indexable: the landing page, the templates gallery, the about page and the",
    "# documentation. The rest renders one browser's own data, so a crawler would",
    "# only see an empty shell of it.",
    "#",
    "# The same routes also carry a `noindex` meta tag. The two are not redundant:",
    "# this file stops the fetch, the meta tag stops the indexing of a page that",
    "# was reached by a link from somewhere else.",
    "#",
    "# The documentation is also written for models: /llms.txt lists it, and every",
    "# page has a Markdown form at its address with .md on the end.",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    ...APP_PATHS.map((path) => `Disallow: ${path}`),
    ...(origin === null ? [] : ["", `Sitemap: ${origin}/sitemap.xml`]),
    "",
  ].join("\n");
