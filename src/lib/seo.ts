/**
 * Page metadata, in one place.
 *
 * Every route's `head` goes through here so a title, a description and the
 * social tags cannot drift apart, and so the one decision that is easy to get
 * wrong is made once: which pages a crawler should index.
 *
 * Only three pages are worth indexing. The rest of the app renders the
 * contents of one browser's IndexedDB, which means a crawler sees an empty
 * shell no matter what the user has in it, and an empty shell in an index is
 * worse than no page at all. Those routes say `noindex` and `robots.txt`
 * repeats it, because the two are read by different things at different times:
 * `robots.txt` stops the fetch, the meta tag stops the indexing of a page
 * reached by a link.
 */

export const SITE_NAME = "Resivo";

/** The default, used where a route says nothing more specific. */
export const SITE_DESCRIPTION =
  "Write a resume in Markdown, style it with your own CSS, and export a PDF that matches the page. No account, no server, nothing leaves your browser.";

/**
 * The social card.
 *
 * Root-relative on purpose. An absolute URL needs an origin, this repo does not
 * know the domain it will be deployed to, and a wrong absolute URL is worse
 * than a relative one: crawlers that require absolute resolve it against the
 * page, and a hardcoded domain would break every deployment that is not that
 * domain. `bun run generate-og` rebuilds the file.
 */
export const OG_IMAGE = "/og.png";

/**
 * The two grounds the browser chrome is painted with, mirroring the design
 * system's `--bg-app` in each scheme.
 *
 * Here as literals because a `theme-color` meta tag cannot read a CSS custom
 * property, and in one place because there are three consumers now: the two
 * scheme-aware meta tags in the document head, and the web app manifest, which
 * has no way to follow a scheme and so has to pick one of them.
 */
export const THEME_COLOR = { light: "#fbfbfa", dark: "#121210" } as const;

interface MetaTag {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
}

interface SeoInput {
  /** The whole title, as it should appear in a tab and in a search result. */
  title: string;
  description?: string;
  /**
   * False for the app's own routes. They render one device's data, so there is
   * nothing on them a search result could usefully show.
   */
  indexable?: boolean;
}

export const seo = ({
  title,
  description = SITE_DESCRIPTION,
  indexable = true,
}: SeoInput): Array<MetaTag> => [
  { title },
  { name: "description", content: description },
  {
    name: "robots",
    content: indexable
      ? "index, follow"
      : // `noimageindex` as well, because the only images on these pages are
        // the user's own uploads.
        "noindex, nofollow, noimageindex",
  },

  { property: "og:title", content: title },
  { property: "og:description", content: description },
  { property: "og:type", content: "website" },
  { property: "og:site_name", content: SITE_NAME },
  { property: "og:image", content: OG_IMAGE },
  {
    property: "og:image:alt",
    content: "Resivo, a local-first resume builder",
  },

  // A large card, because the image is a wordmark and a sentence rather than a
  // thumbnail: at summary size neither is readable.
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: title },
  { name: "twitter:description", content: description },
  { name: "twitter:image", content: OG_IMAGE },
];
