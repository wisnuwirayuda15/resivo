/**
 * The paginator.
 *
 * Pagination is measurement-based rather than left to CSS fragmentation. CSS can
 * break a column, but it cannot tell the application *where* it broke, and the
 * editor needs that: page count, per-page content, and (most of all) the
 * guarantee that what the screen shows is what the printer will produce. So the
 * renderer measures every flow item once, and this function decides the breaks.
 *
 * Deliberately pure. It takes numbers and returns ids, which means the awkward
 * cases (an oversized block, a heading that lands last, a page that fits
 * exactly) are all testable without a browser.
 */

export interface FlowMetric {
  id: string;
  /**
   * Measured height in CSS pixels, INCLUDING the space above the item.
   *
   * Measured at zoom 1 and with fonts loaded; both matter, and both are the
   * caller's responsibility.
   */
  height: number;
  /**
   * The part of `height` contributed by the space above the item.
   *
   * Subtracted when the item lands first on a page, matching the stylesheet,
   * which drops that space at the top of a page. Leading whitespace at a page
   * break is not just ugly, it is content the reader paid a line for.
   */
  spaceBefore: number;
  /** Must not be the last item on a page. See `documentFlow`. */
  keepWithNext?: boolean;
  /** Must be the first item on a page. See `documentFlow`. */
  breakBefore?: boolean;
}

/**
 * Sub-pixel slack, in CSS pixels.
 *
 * Measured heights are fractional and page height is derived from physical units
 * (inches or millimetres), so a page that fits exactly can total a few
 * hundredths over. Without slack that rounding error would push the last line of
 * a full page onto a page of its own. Overshooting the content box by half a
 * pixel is invisible; a spurious page is not.
 */
const SLACK = 0.5;

/**
 * Distributes items across pages.
 *
 * Returns one array of item ids per page, always at least one page, an empty
 * resume is a blank sheet, not nothing at all.
 *
 * An item taller than the content area is placed on a page of its own and
 * allowed to overflow (the stylesheet clips it). Splitting it is not an option:
 * items are atomic by construction, which is exactly what gives entries their
 * `break-inside: avoid` behaviour for free.
 */
export const paginate = (
  items: ReadonlyArray<FlowMetric>,
  contentHeight: number,
): Array<Array<string>> => {
  const pages: Array<Array<string>> = [];
  let current: Array<string> = [];
  let used = 0;

  const heightOn = (item: FlowMetric, firstOnPage: boolean): number =>
    firstOnPage ? item.height - item.spaceBefore : item.height;

  for (const [index, item] of items.entries()) {
    /**
     * A forced break, honoured before anything is measured.
     *
     * It wins over every fitting decision below, because it is the one break
     * the user asked for by name. Two breaks in a row therefore produce a blank
     * page, which is what asking for two breaks means.
     */
    if (item.breakBefore === true && current.length > 0) {
      pages.push(current);
      current = [];
      used = 0;
    }

    let height = heightOn(item, current.length === 0);

    /**
     * A keep-with-next item reserves room for what follows it, so the pair
     * either travels together or breaks before the first of them. The next
     * item's height is used as measured, because on a fresh page it would no
     * longer be first, the heading would be.
     */
    const next = items[index + 1];
    let required = height;

    if (item.keepWithNext === true && next !== undefined) {
      /**
       * Only reserve the room if the pair could ever share a page.
       *
       * When the following item is too tall to fit even on a page of its own,
       * the two can never travel together, and reserving room for it would
       * break before the heading and then break again after it, leaving the
       * heading alone on a page. That is precisely the orphan this rule exists
       * to prevent, so the obligation is dropped rather than honoured into
       * absurdity.
       */
      const pairFits =
        heightOn(item, true) + next.height <= contentHeight + SLACK;

      if (pairFits) {
        required = height + next.height;
      }
    }

    if (current.length > 0 && used + required > contentHeight + SLACK) {
      pages.push(current);
      current = [];
      used = 0;
      // Now first on its page, so its leading space is dropped.
      height = heightOn(item, true);
    }

    current.push(item.id);
    used += height;
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages.length > 0 ? pages : [[]];
};
