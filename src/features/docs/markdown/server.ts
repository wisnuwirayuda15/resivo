import { llms } from "fumadocs-core/source";

import {
  FALLBACK_LANGUAGE,
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n/language";

import { withOrigin } from "../origin";
import { isDocsLanguage } from "../paths";
import { pageUrlsInOrder } from "../tree";
import { source } from "../source";

import { resolveHeadingIds } from "./anchors";
import { localizeMarkdownLinks, parseMarkdownPath } from "./urls";

import type { DocsLanguage } from "../paths";

/**
 * Pages as Markdown, for the `.md` addresses, `llms.txt` and the copy button.
 * Server only: it imports the collection.
 */

type DocsPage = NonNullable<ReturnType<typeof source.getPage>>;

const docsLlms = llms(source);

/** One page: its title and description as a heading and a quote, then its body.
 * The body is the processed Markdown with its links made to point at the
 * language being read and at the Markdown of the page they name. */
export const renderPage = async (
  page: DocsPage,
  origin: string,
): Promise<string> => {
  const lang = isDocsLanguage(page.locale) ? page.locale : "en";
  const body = localizeMarkdownLinks(
    resolveHeadingIds(withOrigin(await page.data.getText("processed"), origin)),
    lang,
    origin,
  );
  const description = page.data.description?.trim();

  return [
    `# ${page.data.title}`,
    ...(description ? [`> ${description}`] : []),
    body.trim(),
  ].join("\n\n");
};

/** Every page of one language, in the order of the tree, one after another. */
export const renderFull = async (
  lang: DocsLanguage,
  origin: string,
): Promise<string> => {
  const byUrl = new Map(source.getPages(lang).map((page) => [page.url, page]));
  // Tree order and not file order, so the text reads as the sidebar does, with
  // the home first and each folder's pages together.
  const pages = pageUrlsInOrder(source.getPageTree(lang)).flatMap((url) => {
    const page = byUrl.get(url);

    return page === undefined ? [] : [page];
  });

  return (
    await Promise.all(pages.map((page) => renderPage(page, origin)))
  ).join("\n\n---\n\n");
};

/** The table of contents of one language: a list of links to the Markdown of
 * each page, with its description, in the order of the sidebar. */
export const renderIndex = async (
  lang: DocsLanguage,
  origin: string,
): Promise<string> =>
  localizeMarkdownLinks(await docsLlms.index(lang), lang, origin);

/** The index a crawler finds first: the default language in full, and a line
 * for each other one pointing at its own index. */
export const renderRootIndex = async (origin: string): Promise<string> => {
  const others = SUPPORTED_LANGUAGES.filter(
    (lang) => lang !== FALLBACK_LANGUAGE,
  );
  const pointers = others.map(
    (lang) =>
      `- [${LANGUAGE_NAMES[lang]}](${origin}/${lang}/llms.txt): the same documentation in ${LANGUAGE_NAMES[lang]}`,
  );

  return [
    await renderIndex(FALLBACK_LANGUAGE, origin),
    ...(pointers.length === 0
      ? []
      : ["## Other languages", pointers.join("\n")]),
  ].join("\n\n");
};

const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  Vary: "Accept",
} as const;

/** The Markdown of one page as a response, or a 404 for one that does not exist. */
export const markdownResponse = async (
  lang: string,
  slugs: Array<string>,
  origin: string,
): Promise<Response> => {
  const page = isDocsLanguage(lang) ? source.getPage(slugs, lang) : undefined;

  return page === undefined
    ? new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    : new Response(await renderPage(page, origin), {
        headers: MARKDOWN_HEADERS,
      });
};

/** `/en/docs/x.md` as a response, or null for a request that is not one. */
export const markdownForRequest = (
  request: Request,
): Promise<Response> | null => {
  const url = new URL(request.url);
  const parsed = parseMarkdownPath(url.pathname);

  return parsed === null
    ? null
    : markdownResponse(parsed.lang, parsed.slugs, url.origin);
};
