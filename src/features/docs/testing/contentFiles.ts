import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { parsePage } from "./pages";

import type { DocsMeta, DocsTree } from "./pages";

/**
 * Reads `content/docs/<lang>` from disk, for the tests only.
 *
 * Vitest loads no Vite plugins, so the collection (`features/docs/source.ts`)
 * cannot be imported here and content is read as plain files instead. That is
 * also the stricter reading: it sees every file in the folder, including one the
 * collection would silently skip.
 */

const ROOT = resolve(import.meta.dirname, "..", "..", "..", "..", "content");

export const DOCS_ROOT = join(ROOT, "docs");
export const PROMPTS_ROOT = join(ROOT, "prompts");

const walk = (dir: string): Array<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);

    return entry.isDirectory() ? walk(full) : [full];
  });

const posix = (path: string): string => path.replaceAll("\\", "/");

export const languagesOnDisk = (): Array<string> =>
  readdirSync(DOCS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

export const readDocsTree = (lang: string): DocsTree => {
  const base = join(DOCS_ROOT, lang);
  const pages = [];
  const metas: Array<DocsMeta> = [];

  for (const file of walk(base)) {
    const path = posix(relative(base, file));
    const raw = readFileSync(file, "utf8");

    if (/\.mdx?$/.test(path)) {
      pages.push(parsePage(lang, path, raw));
    } else if (path.endsWith("meta.json")) {
      metas.push({
        lang,
        path,
        folder: path === "meta.json" ? "" : path.replace(/\/meta\.json$/, ""),
        value: JSON.parse(raw) as unknown,
      });
    }
  }

  return { lang, pages, metas };
};
