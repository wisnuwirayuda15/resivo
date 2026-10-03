const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/**
 * Runs `rewrite` over every line of a Markdown text that is not inside fenced
 * code, and returns the text with the results.
 *
 * Two passes over a page's Markdown need this (link targets and heading ids),
 * and both must leave a resume sample alone, because anything may appear in
 * one, including text that looks exactly like what they rewrite. A fence closes
 * on a line of the same character that is at least as long as the one that
 * opened it, which is what lets a four-backtick fence hold a three-backtick one.
 */
export const mapOutsideFences = (
  markdown: string,
  rewrite: (line: string) => string,
): string => {
  let fence: string | null = null;

  return markdown
    .split("\n")
    .map((line) => {
      const marker = FENCE.exec(line)?.[1];

      if (marker !== undefined) {
        if (fence === null) {
          fence = marker;
        } else if (marker[0] === fence[0] && marker.length >= fence.length) {
          fence = null;
        }

        return line;
      }

      return fence === null ? rewrite(line) : line;
    })
    .join("\n");
};
