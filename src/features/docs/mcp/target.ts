import { parseDocsPath } from "../paths";
import { parseMarkdownPath } from "../markdown/urls";

/**
 * The page a tool caller means by an address they were given.
 *
 * `list_pages` hands out `.md` addresses and a model will pass back whatever it
 * saw, so this accepts every spelling of one page: the `.md` address, the HTML
 * address, either with an origin in front, and either with a `#hash` after. It
 * returns null for anything that is not a docs address, which is the caller's
 * "not found", and never throws on a malformed one.
 */
export const docsTarget = (
  input: string,
): { lang: string; slugs: Array<string> } | null => {
  let pathname = input.trim();

  try {
    pathname = new URL(pathname, "https://docs.invalid").pathname;
  } catch {
    return null;
  }

  return parseMarkdownPath(pathname) ?? parseDocsPath(pathname);
};
