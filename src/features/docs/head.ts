import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/i18n/language";
import { seo, seoLinks } from "@/lib/seo";

import { docsHref } from "./paths";

import type { DocsLanguage } from "./paths";

/**
 * What a docs page tells a crawler, built from the page and nothing else.
 *
 * Pure for the same reason `paths.ts` is: the route calls it, the tests call it,
 * and neither may import the collection.
 */

/** How each language is written in `og:locale`, which wants a region. */
const OG_LOCALE: Record<DocsLanguage, string> = {
  en: "en_US",
  id: "id_ID",
};

export interface DocsCrumb {
  name: string;
  /** Root-relative. A folder with no page of its own has none and is skipped,
   * because a breadcrumb that names no address is not one a crawler accepts. */
  url?: string;
}

interface DocsHeadInput {
  lang: DocsLanguage;
  slugs: ReadonlyArray<string>;
  title: string;
  description?: string;
  /** The deployment's origin, or null when it is not known. */
  origin: string | null;
  /** The home, each folder above the page, then the page itself. */
  crumbs: ReadonlyArray<DocsCrumb>;
}

/** JSON for a `<script>`: a `<` inside a string would let a title close the
 * tag, so it is written as an escape, which JSON allows and a parser reads
 * back as the same character. */
const jsonForScript = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, "\\u003c");

export const docsHead = ({
  lang,
  slugs,
  title,
  description,
  origin,
  crumbs,
}: DocsHeadInput) => {
  const path = docsHref(lang, slugs);
  const others = SUPPORTED_LANGUAGES.filter((other) => other !== lang);
  const named = crumbs.filter(
    (crumb): crumb is DocsCrumb & { url: string } => crumb.url !== undefined,
  );

  return {
    meta: seo({
      // The home page's title already says the name; every other page gets it
      // after its own, so a tab and a search result say whose docs they are.
      title: slugs.length === 0 ? title : `${title} | Resivo`,
      description,
      type: "article",
      origin,
      path,
      locale: OG_LOCALE[lang],
      alternateLocales: others.map((other) => OG_LOCALE[other]),
    }),
    links: seoLinks({
      origin,
      path,
      alternates: SUPPORTED_LANGUAGES.map((other) => ({
        lang: other,
        path: docsHref(other, slugs),
      })),
      defaultLang: FALLBACK_LANGUAGE,
    }),
    scripts:
      origin === null || named.length < 2
        ? []
        : [
            {
              type: "application/ld+json",
              children: jsonForScript({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: named.map((crumb, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: crumb.name,
                  item: `${origin}${crumb.url}`,
                })),
              }),
            },
          ],
  };
};
