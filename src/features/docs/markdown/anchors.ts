import GithubSlugger from "github-slugger";

import { mapOutsideFences } from "./fences";

const HEADING = /^#{1,6}\s+(.+?)(?:\s+\[#([\w-]+)\])?\s*$/;
const TARGET = /\]\(#([\w-]+)\)/g;

/**
 * Heading ids, turned into what a Markdown reader understands.
 *
 * Authors give a heading an explicit id (`## Try it [#try]`) so a link to it
 * survives the heading being reworded. A renderer outside this site has never
 * heard of that syntax: it would show `[#try]` as text, and it makes its own id
 * from the words, so a link written `](#try)` goes nowhere. This removes the
 * suffix and points each same-page link at the id a GitHub-style renderer makes
 * from the heading's text, which is the convention a model or a pasted copy
 * will meet. Links into other pages are not touched, because the page they name
 * is not loaded here.
 *
 * The slugger sees every heading, not only the ones with an id, so a repeated
 * title is numbered the way the renderer will number it.
 */
export const resolveHeadingIds = (markdown: string): string => {
  const slugger = new GithubSlugger();
  const slugs = new Map<string, string>();

  const stripped = mapOutsideFences(markdown, (line) => {
    const match = HEADING.exec(line);

    if (match === null || match[1] === undefined) {
      return line;
    }

    const slug = slugger.slug(match[1]);

    if (match[2] === undefined) {
      return line;
    }

    slugs.set(match[2], slug);

    return line.replace(/\s+\[#[\w-]+\]\s*$/, "");
  });

  return mapOutsideFences(stripped, (line) =>
    line.replace(TARGET, (whole, id: string) => {
      const slug = slugs.get(id);

      return slug === undefined ? whole : `](#${slug})`;
    }),
  );
};
