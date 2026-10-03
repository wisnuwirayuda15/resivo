import { SUPPORTED_LANGUAGES } from "@/lib/i18n/language";

import {
  docsHref,
  isDocsLanguage,
  localizeInternalHref,
  parseDocsPath,
  splitHash,
} from "../paths";

import { mapOutsideFences } from "./fences";

import type { DocsLanguage } from "../paths";

/**
 * Where a page's Markdown lives, and how links inside it are rewritten.
 *
 * Pure for the same reason `paths.ts` is: the route, the middleware, the copy
 * button and the tests all need these, and none of them may import the
 * collection to get them.
 */

/** `/en/docs/format/overview.md`. The docs home is `/en/docs/index.md`, because
 * `/en/docs.md` would be a second spelling of a folder and a page has to end in a
 * name. */
export const markdownHref = (
  lang: DocsLanguage,
  slugs: ReadonlyArray<string> = [],
): string => `${docsHref(lang, slugs.length === 0 ? ["index"] : slugs)}.md`;

/**
 * The language and slugs a `.md` address names, or null for any other path.
 *
 * A trailing `index` is dropped, so `/en/docs/index.md` is the home page and
 * `/en/docs/format/index.md` is the format folder's own page, which is how every
 * static site spells it. An unsupported language still parses, so the caller can
 * tell it from a path that is not Markdown at all.
 */
export const parseMarkdownPath = (
  pathname: string,
): { lang: string; slugs: Array<string> } | null => {
  // A trailing slash is tolerated: the dev server's workaround adds one (see
  // `docsMarkdownDev` in the Vite config).
  const path = pathname.replace(/\/$/, "");

  if (!path.endsWith(".md")) {
    return null;
  }

  const parsed = parseDocsPath(path.slice(0, -".md".length));

  if (parsed === null) {
    return null;
  }

  const last = parsed.slugs.at(-1);

  return {
    lang: parsed.lang,
    slugs: last === "index" ? parsed.slugs.slice(0, -1) : parsed.slugs,
  };
};

const LANGUAGE_PATTERN = SUPPORTED_LANGUAGES.join("|");

/** A Markdown link target that points into the docs, with or without a language:
 * `](/docs/x)`, `](/en/docs/x#y)`. The target stops at the closing bracket. */
const DOCS_LINK = new RegExp(
  String.raw`\]\((/(?:(?:${LANGUAGE_PATTERN})/)?docs(?:[/?#][^)\s]*)?)\)`,
  "g",
);

const rewriteTarget = (
  target: string,
  lang: DocsLanguage,
  origin: string,
): string => {
  const { path, hash } = splitHash(target);
  const parsed = parseDocsPath(path.split("?")[0] ?? path);

  // A link that names no language is given the page's before it is parsed.
  const localized =
    parsed === null || !isDocsLanguage(parsed.lang)
      ? parseDocsPath(localizeInternalHref(path.split("?")[0] ?? path, lang))
      : parsed;

  if (localized === null || !isDocsLanguage(localized.lang)) {
    return target;
  }

  return `${origin}${markdownHref(localized.lang, localized.slugs)}${hash === undefined ? "" : `#${hash}`}`;
};

/**
 * Every link into the docs in a page's Markdown, pointed at the language being
 * read and at the Markdown of the page it names.
 *
 * Authors write `/docs/format/overview` with no language, and the same text is
 * served in every translation, so the language is filled in here. The target is
 * the `.md` address because the reader of this text is a model or a pasted copy,
 * and the next thing it wants is the Markdown of that page, not its HTML.
 * `origin` makes the address absolute, which a copy pasted somewhere else needs.
 *
 * Fenced code is left alone: a resume sample may contain anything.
 */
export const localizeMarkdownLinks = (
  markdown: string,
  lang: DocsLanguage,
  origin = "",
): string =>
  mapOutsideFences(markdown, (line) =>
    line.replace(
      DOCS_LINK,
      (_match, target: string) => `](${rewriteTarget(target, lang, origin)})`,
    ),
  );
