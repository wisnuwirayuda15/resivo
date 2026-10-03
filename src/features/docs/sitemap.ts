import { SUPPORTED_LANGUAGES } from "@/lib/i18n/language";

import { docsHref } from "./paths";

/**
 * The sitemap, from a list of pages and the languages each exists in.
 *
 * Pure, so the escaping and the alternate links are tested without the
 * collection. Every entry lists all of its languages including itself, which is
 * how a sitemap carries `hreflang`, and no `lastmod`: the build knows no true
 * modification date, and a wrong one teaches a crawler to distrust the rest.
 */

export interface SitemapEntry {
  path: string;
  /** Every language this page exists in, with its address. */
  alternates?: ReadonlyArray<{ lang: string; path: string }>;
  defaultLang?: string;
}

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const buildSitemap = (
  origin: string,
  entries: ReadonlyArray<SitemapEntry>,
): string => {
  const link = (lang: string, path: string) =>
    `    <xhtml:link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(origin + path)}"/>`;

  const urls = entries.map((entry) => {
    const alternates = entry.alternates ?? [];
    const fallback = alternates.find(
      (alternate) => alternate.lang === entry.defaultLang,
    );

    return [
      "  <url>",
      `    <loc>${escapeXml(origin + entry.path)}</loc>`,
      ...alternates.map((alternate) => link(alternate.lang, alternate.path)),
      ...(fallback === undefined ? [] : [link("x-default", fallback.path)]),
      "  </url>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
};

/** The same page in every language: slugs are identical across them by rule. */
export const languageAlternates = (
  slugs: ReadonlyArray<string>,
): Array<{ lang: string; path: string }> =>
  SUPPORTED_LANGUAGES.map((lang) => ({ lang, path: docsHref(lang, slugs) }));
