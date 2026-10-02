import { FALLBACK_LANGUAGE, isAppLanguage } from "@/lib/i18n/language";

import type { DocsLanguage } from "./paths";

/**
 * Which docs language an `Accept-Language` header asks for.
 *
 * Only the server uses this. A document request carries no `localStorage`, so
 * the browser's own ordered list is the best signal there is, and it is the same
 * list the browser sends to every site it visits, so reading it discloses
 * nothing new. A crawler sends none and gets English.
 *
 * Ranked by `q` and then by position, matched on the primary subtag (`id-ID`
 * counts as `id`), and anything unsupported is skipped rather than ending the
 * search, so `fr, id;q=0.8` finds Indonesian.
 */
export const negotiateLanguage = (
  header: string | null | undefined,
): DocsLanguage => {
  if (header === null || header === undefined || header.trim() === "") {
    return FALLBACK_LANGUAGE;
  }

  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params
        .map((param) => /^\s*q\s*=\s*([\d.]+)\s*$/i.exec(param)?.[1])
        .find((value) => value !== undefined);
      const quality = q === undefined ? 1 : Number(q);

      return {
        base: tag.trim().toLowerCase().split("-")[0] ?? "",
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const entry of ranked) {
    if (isAppLanguage(entry.base)) {
      return entry.base;
    }
  }

  return FALLBACK_LANGUAGE;
};
