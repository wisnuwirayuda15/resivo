import { isMarkdownPreferred } from "fumadocs-core/negotiation";

import { parseDocsPath } from "../paths";

import { parseMarkdownPath } from "./urls";

/**
 * Which docs page a request wants as Markdown, if it wants one.
 *
 * Two ways to ask: the `.md` address, which is for a person who pastes a link,
 * and the `Accept` header, which is for an agent that asks the normal address
 * for what it prefers. A browser sends `text/html` and never matches the
 * second, and `*` alone does not either, so a plain `curl` still gets the page.
 * Pure, so the rules are tested without a server.
 */
export const markdownRequestFor = (
  request: Request,
): { lang: string; slugs: Array<string> } | null => {
  const { pathname } = new URL(request.url);
  const explicit = parseMarkdownPath(pathname);

  if (explicit !== null) {
    return explicit;
  }

  return isMarkdownPreferred(request) ? parseDocsPath(pathname) : null;
};
