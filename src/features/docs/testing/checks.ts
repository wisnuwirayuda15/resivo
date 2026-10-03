import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { z } from "zod";

import { sanitizeCss } from "@/features/css/sanitize";
import { parseDocument } from "@/features/markdown/index";

import {
  componentsOf,
  directiveSkeleton,
  fencesOf,
  headingsOf,
  linksOf,
  parsePage,
  strongsOf,
} from "./pages";

import type { DocsPage, DocsTree, FenceInfo } from "./pages";

/**
 * The rules the docs content has to obey, each a function from content to a
 * list of problems.
 *
 * Returning problems and not asserting is the point: `content.test.ts` runs
 * these over the real content and expects none, and `checks.test.ts` runs them
 * over fixtures that are broken on purpose and expects the right problem. A rule
 * that has only ever been seen passing is a rule nobody knows can fail.
 *
 * A problem names the file, so a failure says where to look and not only what.
 */

export type Problems = Array<string>;

/** Matches `DESCRIPTION_MAX` in `e2e/seo.spec.ts`: the length a search engine
 * shows before it cuts a description. */
export const DESCRIPTION_MAX = 160;

const where = (page: DocsPage): string => `${page.lang}/${page.path}`;

const FrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).max(DESCRIPTION_MAX),
});

export const checkFrontmatter = (page: DocsPage): Problems => {
  const result = FrontmatterSchema.safeParse(page.frontmatter);

  return result.success
    ? []
    : result.error.issues.map(
        (issue) =>
          `${where(page)}: front matter ${issue.path.join(".")}: ${issue.message}`,
      );
};

/** Slugs and file names are ASCII and the same in every language: that is what
 * lets the language switcher swap one segment and nothing else, and it avoids
 * the non-ASCII 404 on TanStack Start. */
const SEGMENT = /^[a-z0-9-]+$/;

export const checkSlugs = (tree: DocsTree): Problems =>
  tree.pages.flatMap((page) =>
    page.slug
      .split("/")
      .filter((segment) => segment !== "" && !SEGMENT.test(segment))
      .map((segment) => `${where(page)}: "${segment}" is not a-z, 0-9 and -`),
  );

export const checkBody = (page: DocsPage): Problems => {
  const problems: Problems = [];
  const headings = headingsOf(page);

  for (const heading of headings) {
    if (heading.depth === 1) {
      problems.push(
        `${where(page)}: an h1 ("${heading.text}"), and the title is the front matter`,
      );
    }
  }

  const seen = new Set<string>();

  for (const heading of headings) {
    if (seen.has(heading.id)) {
      problems.push(
        `${where(page)}: two headings share the id "${heading.id}"`,
      );
    }

    seen.add(heading.id);
  }

  return problems;
};

/** MDX is stricter than Markdown: a stray `{` or `<` outside backticks is a
 * syntax error that only the compiler sees, and it would fail the build. */
export const checkCompiles = async (page: DocsPage): Promise<Problems> => {
  if (page.error !== undefined) {
    return [`${where(page)}: does not compile: ${page.error}`];
  }

  try {
    await compile(page.body, { remarkPlugins: [remarkGfm] });

    return [];
  } catch (error) {
    return [
      `${where(page)}: does not compile: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ];
  }
};

/**
 * `meta.json` is the sidebar's order. Every entry has to name a page or a folder
 * that exists, and every page has to be named, because an unlisted page is
 * simply missing from the sidebar and nobody notices.
 */
export const checkMeta = (tree: DocsTree): Problems => {
  const problems: Problems = [];
  const folders = new Set(tree.metas.map((meta) => meta.folder));

  for (const meta of tree.metas) {
    const label = `${tree.lang}/${meta.path}`;
    const parsed = z
      .object({ title: z.string().min(1), pages: z.array(z.string()) })
      .safeParse(meta.value);

    if (!parsed.success) {
      problems.push(`${label}: needs a title and a pages list`);
      continue;
    }

    const listed = new Set<string>();

    for (const entry of parsed.data.pages) {
      if (/^---.*---$/.test(entry) || entry === "...") {
        continue;
      }

      const target = meta.folder === "" ? entry : `${meta.folder}/${entry}`;

      listed.add(entry);

      // `index` is the folder's own page, which has the folder's slug.
      const isPage =
        tree.pages.some((page) => page.slug === target) ||
        (entry === "index" &&
          tree.pages.some((page) => page.slug === meta.folder));
      const isFolder = folders.has(target);

      if (!isPage && !isFolder) {
        problems.push(`${label}: "${entry}" is not a page or a folder here`);
      }
    }

    const prefix = meta.folder === "" ? "" : `${meta.folder}/`;
    const children = new Set<string>();

    for (const page of tree.pages) {
      if (prefix !== "" && !page.slug.startsWith(prefix)) {
        continue;
      }

      const rest = page.slug.slice(prefix.length);
      const first = rest.split("/")[0] ?? "";

      // The home page is the folder's own `index`, not a listed entry.
      children.add(first === "" ? "index" : first);
    }

    for (const child of children) {
      if (!listed.has(child) && child !== "index") {
        problems.push(`${label}: "${child}" exists but is not listed`);
      }
    }

    if (children.has("index") && !listed.has("index") && meta.folder === "") {
      problems.push(`${label}: the home page "index" is not listed`);
    }
  }

  return problems;
};

const sameList = (a: Array<unknown>, b: Array<unknown>): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * Two languages have to be the same document in different words.
 *
 * What can differ is prose. What cannot: which files exist, the sidebar order,
 * the shape of each page (the headings and their ids, the components, the
 * fences). A `css` fence is identical byte for byte, because code is not
 * translated. A `resume` fence may have its prose translated (a name, a job
 * title) but has to show the same directives with the same attributes in the
 * same order, because that is what the page is teaching.
 */
export const checkParity = (a: DocsTree, b: DocsTree): Problems => {
  const problems: Problems = [];
  const pair = `${a.lang} and ${b.lang}`;
  const pathsOf = (tree: DocsTree) =>
    tree.pages.map((page) => page.path).sort();
  const metaPathsOf = (tree: DocsTree) =>
    tree.metas.map((meta) => meta.path).sort();

  for (const path of pathsOf(a)) {
    if (!pathsOf(b).includes(path)) {
      problems.push(`${pair}: ${path} is in ${a.lang} and not in ${b.lang}`);
    }
  }

  for (const path of pathsOf(b)) {
    if (!pathsOf(a).includes(path)) {
      problems.push(`${pair}: ${path} is in ${b.lang} and not in ${a.lang}`);
    }
  }

  for (const path of metaPathsOf(a)) {
    const other = b.metas.find((meta) => meta.path === path);
    const mine = a.metas.find((meta) => meta.path === path);

    if (other === undefined) {
      problems.push(`${pair}: ${path} is in ${a.lang} and not in ${b.lang}`);
      continue;
    }

    const listOf = (value: unknown): Array<unknown> =>
      Array.isArray((value as { pages?: unknown } | undefined)?.pages)
        ? (value as { pages: Array<unknown> }).pages
        : [];

    if (!sameList(listOf(mine?.value), listOf(other.value))) {
      problems.push(`${pair}: ${path} lists its pages differently`);
    }
  }

  for (const path of metaPathsOf(b)) {
    if (!metaPathsOf(a).includes(path)) {
      problems.push(`${pair}: ${path} is in ${b.lang} and not in ${a.lang}`);
    }
  }

  for (const one of a.pages) {
    const two = b.pages.find((page) => page.path === one.path);

    if (two === undefined) {
      continue;
    }

    const label = `${pair}: ${one.path}`;
    const headings = (page: DocsPage) =>
      headingsOf(page).map(
        (heading) => `${heading.depth}:${heading.explicitId ?? ""}`,
      );

    if (!sameList(headings(one), headings(two))) {
      problems.push(`${label}: the headings differ in depth or id`);
    }

    if (!sameList(componentsOf(one), componentsOf(two))) {
      problems.push(`${label}: the components differ`);
    }

    const fenceKey = (fence: FenceInfo) =>
      `${fence.language}|${fence.meta.replace(/\btitle="[^"]*"/, "").trim()}`;
    const fencesOne = fencesOf(one);
    const fencesTwo = fencesOf(two);

    if (!sameList(fencesOne.map(fenceKey), fencesTwo.map(fenceKey))) {
      problems.push(`${label}: the code blocks differ in kind or order`);
    } else {
      fencesOne.forEach((fence, index) => {
        const other = fencesTwo[index];

        if (other === undefined) {
          return;
        }

        if (fence.language === "css" && fence.value !== other.value) {
          problems.push(
            `${label}: code block ${index + 1} (css) is not identical`,
          );
        }

        if (
          fence.language === "resume" &&
          !sameList(
            directiveSkeleton(fence.value),
            directiveSkeleton(other.value),
          )
        ) {
          problems.push(
            `${label}: code block ${index + 1} (resume) shows different directives`,
          );
        }
      });
    }
  }

  return problems;
};

/** App pages a docs page may link to. */
const APP_PATHS = new Set([
  "/",
  "/resumes",
  "/templates",
  "/about",
  "/settings",
  "/archive",
  "/images",
  "/fonts",
]);

const splitAddress = (
  url: string,
): { path: string; hash: string | undefined } => {
  const index = url.indexOf("#");

  return index === -1
    ? { path: url, hash: undefined }
    : { path: url.slice(0, index), hash: url.slice(index + 1) };
};

/**
 * Every internal link has to go somewhere.
 *
 * A link to another page has to name a page that exists, and a link to a heading
 * has to name one the author gave an explicit id (`## Title [#id]`). Only an
 * explicit id is allowed as a target because a generated one is made from the
 * words, so the same heading would have a different address in each language
 * and a link would work in one and break in the other.
 */
export const checkLinks = (tree: DocsTree): Problems => {
  const problems: Problems = [];

  for (const page of tree.pages) {
    for (const { url } of linksOf(page)) {
      if (/^[a-z][a-z\d+.-]*:/i.test(url)) {
        continue;
      }

      const { path, hash } = splitAddress(url);
      let target: DocsPage | undefined;

      if (path === "") {
        target = page;
      } else if (path === "/docs" || path.startsWith("/docs/")) {
        const slug = path.slice("/docs".length).replace(/^\/|\/$/g, "");

        target = tree.pages.find((candidate) => candidate.slug === slug);

        if (target === undefined) {
          problems.push(`${where(page)}: ${url} is not a docs page`);
          continue;
        }
      } else if (APP_PATHS.has(path)) {
        continue;
      } else {
        problems.push(
          `${where(page)}: ${url} is neither a docs page nor an app page`,
        );
        continue;
      }

      if (hash !== undefined) {
        const explicit = headingsOf(target)
          .map((heading) => heading.explicitId)
          .filter((id): id is string => id !== undefined);

        if (!explicit.includes(hash)) {
          problems.push(
            `${where(page)}: ${url} needs a heading with the explicit id [#${hash}] in ${target.path}`,
          );
        }
      }
    }
  }

  return problems;
};

const WORDS = (meta: string): Array<string> =>
  meta
    .replace(/\btitle="[^"]*"/, "")
    .split(/\s+/)
    .filter((word) => word !== "");

/** A document starts with its name, and an excerpt does not, so it is given one;
 * the first snippet on a page is often a whole file, and a second H1 would turn
 * it into a document with a heading in it. Same rule as the guide's. */
const asDocument = (code: string): string =>
  code.startsWith("# ") ? code : `# Ada Lovelace\n\n${code}\n`;

/**
 * The examples have to be true.
 *
 * A syntax reference's failure mode is documenting syntax the parser rejects,
 * and no amount of reading catches that. So every `resume` block goes through
 * the real codec and every `css` block through the real sanitizer, and a
 * warning is a failure, exactly as in the guide's own test.
 *
 * Each block says what it expects in its meta: `resume` is clean unless it says
 * `warns`; a `css` block must say `verify` (survives) or `refused` (the
 * sanitizer removes something). A `css` block with neither is an error, so
 * nobody ships an example whose status was never decided.
 */
export const checkFences = (page: DocsPage): Problems => {
  const problems: Problems = [];

  fencesOf(page).forEach((fence, index) => {
    const label = `${where(page)}: code block ${index + 1} (${fence.language || "no language"})`;
    const words = WORDS(fence.meta);

    if (fence.language === "resume") {
      const warns = words.includes("warns");

      for (const word of words) {
        if (word !== "warns") {
          problems.push(`${label}: unknown flag "${word}"`);
        }
      }

      const { warnings } = parseDocument(asDocument(fence.value));

      if (!warns && warnings.length > 0) {
        problems.push(
          `${label}: the parser warns (${warnings.map((w) => w.message).join("; ")})`,
        );
      }

      if (warns && warnings.length === 0) {
        problems.push(`${label}: says "warns" but the parser has no complaint`);
      }
    }

    if (fence.language === "css") {
      const verify = words.includes("verify");
      const refused = words.includes("refused");

      for (const word of words) {
        if (word !== "verify" && word !== "refused") {
          problems.push(`${label}: unknown flag "${word}"`);
        }
      }

      if (verify === refused) {
        problems.push(`${label}: needs exactly one of "verify" or "refused"`);
        return;
      }

      const result = sanitizeCss(fence.value);

      if (verify && (result.warnings.length > 0 || result.css === "")) {
        problems.push(`${label}: the sanitizer does not keep it as written`);
      }

      if (refused && result.warnings.length === 0) {
        problems.push(
          `${label}: says "refused" but the sanitizer keeps all of it`,
        );
      }
    }
  });

  return problems;
};

/** Parses a page from text, for tests that build their own content. */
export const pageFrom = (lang: string, path: string, raw: string): DocsPage =>
  parsePage(lang, path, raw);

/**
 * Bold text is a label the app shows, and it has to be one that exists.
 *
 * A page that says "choose **New resume**" is making a claim about the screen,
 * and the screen is in the locale files, so the claim can be checked against
 * them in the language the page is written in. A label that was renamed, or
 * quoted from memory, fails here instead of sending a reader looking for a
 * button that is not there. `labels` is every string the interface can show in
 * that language. A phrase that is bold for emphasis and not as a label is a
 * mistake to fix in the page and not an exception to list: use italics.
 */
export const checkUiLabels = (
  page: DocsPage,
  labels: ReadonlySet<string>,
): Problems =>
  strongsOf(page)
    .filter((text) => !labels.has(text.trim()))
    .map(
      (text) =>
        `${page.lang}/${page.path}: "${text}" is in bold but is not text the app shows`,
    );
