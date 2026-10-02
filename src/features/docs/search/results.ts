import type { SortedResult } from "fumadocs-core/search";

/**
 * A search result, shaped for the dialog.
 *
 * Pure, so the mapping is tested without a browser. The engine returns three
 * kinds of hit (the page itself, one of its headings, a passage of text) and
 * each wants a different line: a page is its title, a heading is the heading
 * with the page it is in underneath, a passage is the passage with the same.
 */

export interface ResultView {
  id: string;
  kind: SortedResult["type"];
  /** The line to read, with the engine's highlight markup removed. */
  label: string;
  /** Where it is: the page a heading or passage belongs to, or the section. */
  description: string | undefined;
  /** A docs path, possibly with a `#hash`. */
  href: string;
}

/** The engine marks matches with `<mark>`. Mantine highlights the query itself,
 * so the markup is removed rather than rendered, which also means an HTML
 * string never reaches the page. */
export const plainText = (value: string): string =>
  value
    .replace(/<\/?mark>/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const toView = (result: SortedResult): ResultView => ({
  id: result.id,
  kind: result.type,
  label: plainText(result.content),
  description:
    result.breadcrumbs === undefined || result.breadcrumbs.length === 0
      ? undefined
      : result.breadcrumbs.map(plainText).join(" / "),
  href: result.url,
});

/** Results as the dialog lists them. An empty answer is `[]`, and so is the
 * engine's own `"empty"` (no query yet), because to the dialog they are the
 * same: nothing to show. */
export const toViews = (
  data: Array<SortedResult> | "empty" | undefined,
): Array<ResultView> =>
  data === undefined || data === "empty" ? [] : data.map(toView);
