import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { parse as parseYaml } from "yaml";

import type { Code, Heading, Link, Root, Strong } from "mdast";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";

/**
 * A docs page as the content tests see it: parsed from text, with no compiler
 * and no browser.
 *
 * Everything here is pure and works on strings, so the checks can be run over
 * the real content and, separately, over deliberately broken fixtures to prove
 * they fail. Nothing imports the collection (`source.ts`), which only Vite can
 * load.
 */

export interface DocsPage {
  lang: string;
  /** `format/overview.mdx`, relative to the language folder. */
  path: string;
  /** `format/overview`; the docs home, `index.mdx`, is the empty string. */
  slug: string;
  frontmatter: unknown;
  body: string;
  tree: Root;
  /** Why the file could not be read, if it could not. A broken page is kept
   * and reported by the checks, because a parser that threw would stop the
   * whole run at the first one and hide every other problem. */
  error?: string;
}

export interface DocsMeta {
  lang: string;
  /** `format/meta.json`, relative to the language folder. */
  path: string;
  /** The folder it describes, `format`; the root's is the empty string. */
  folder: string;
  value: unknown;
}

export interface DocsTree {
  lang: string;
  pages: Array<DocsPage>;
  metas: Array<DocsMeta>;
}

export interface HeadingInfo {
  depth: number;
  /** The text, without the `[#id]` suffix. */
  text: string;
  /** What the author wrote, if they wrote one. */
  explicitId: string | undefined;
  /** What the page will use: the explicit id, or the generated slug. */
  id: string;
}

export interface FenceInfo {
  /** The language, or the empty string for a bare fence. */
  language: string;
  /** Everything after the language on the opening line. */
  meta: string;
  value: string;
}

export interface LinkInfo {
  url: string;
}

const processor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm);

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Splits front matter from the body. Throws on an unreadable block, so a file
 * with a broken header is reported as that and not as an empty page. */
export const splitFrontmatter = (
  raw: string,
): { frontmatter: unknown; body: string } => {
  const match = FRONTMATTER.exec(raw);

  if (match === null) {
    return { frontmatter: undefined, body: raw };
  }

  return {
    frontmatter: parseYaml(match[1] ?? "") as unknown,
    body: raw.slice(match[0].length),
  };
};

export const slugOf = (path: string): string => {
  const withoutExtension = path.replace(/\.mdx?$/, "");

  return withoutExtension === "index"
    ? ""
    : withoutExtension.replace(/\/index$/, "");
};

export const parsePage = (
  lang: string,
  path: string,
  raw: string,
): DocsPage => {
  const base = { lang, path, slug: slugOf(path) };

  try {
    const { frontmatter, body } = splitFrontmatter(raw);

    return { ...base, frontmatter, body, tree: processor.parse(body) };
  } catch (error) {
    return {
      ...base,
      frontmatter: undefined,
      body: raw,
      tree: { type: "root", children: [] },
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const EXPLICIT_ID = /\s*\[#([A-Za-z0-9_-]+)\]\s*$/;

export const headingsOf = (page: DocsPage): Array<HeadingInfo> => {
  const slugger = new GithubSlugger();
  const found: Array<HeadingInfo> = [];

  visit(page.tree, "heading", (node: Heading) => {
    const full = toString(node);
    const explicit = EXPLICIT_ID.exec(full)?.[1];
    const text = full.replace(EXPLICIT_ID, "");

    found.push({
      depth: node.depth,
      text,
      explicitId: explicit,
      id: explicit ?? slugger.slug(text),
    });
  });

  return found;
};

export const fencesOf = (page: DocsPage): Array<FenceInfo> => {
  const found: Array<FenceInfo> = [];

  visit(page.tree, "code", (node: Code) => {
    found.push({
      language: node.lang ?? "",
      meta: node.meta ?? "",
      value: node.value,
    });
  });

  return found;
};

const visitJsx = (
  page: DocsPage,
  visitor: (node: MdxJsxFlowElement | MdxJsxTextElement) => void,
): void => {
  visit(page.tree, (node) => {
    if (
      node.type === "mdxJsxFlowElement" ||
      node.type === "mdxJsxTextElement"
    ) {
      visitor(node);
    }
  });
};

/** Every address a page links to: Markdown links, and the `href` of a JSX
 * element such as a `Card`. */
export const linksOf = (page: DocsPage): Array<LinkInfo> => {
  const found: Array<LinkInfo> = [];

  visit(page.tree, "link", (node: Link) => {
    found.push({ url: node.url });
  });

  visitJsx(page, (node) => {
    for (const attribute of node.attributes) {
      if (
        attribute.type === "mdxJsxAttribute" &&
        attribute.name === "href" &&
        typeof attribute.value === "string"
      ) {
        found.push({ url: attribute.value });
      }
    }
  });

  return found;
};

/**
 * Every phrase a page sets in bold, as text.
 *
 * Bold is reserved for a label the app shows, written exactly as it is shown, so
 * a reader can find it on screen. That convention is what makes the labels
 * checkable (see `checkUiLabels`).
 */
export const strongsOf = (page: DocsPage): Array<string> => {
  const found: Array<string> = [];

  visit(page.tree, "strong", (node: Strong) => {
    // A phrase wrapped across two lines of source is one phrase on screen.
    found.push(toString(node).replace(/\s+/g, " "));
  });

  return found;
};

/** The file each `<include>` in a page points at, as written (relative to the
 * page). The path is the element's text. */
export const includesOf = (page: DocsPage): Array<string> => {
  const found: Array<string> = [];

  visitJsx(page, (node) => {
    if (node.name === "include") {
      found.push(toString({ type: "root", children: node.children }).trim());
    }
  });

  return found;
};

/** The names of the JSX components a page uses, in order. */
export const componentsOf = (page: DocsPage): Array<string> => {
  const found: Array<string> = [];

  visitJsx(page, (node) => {
    if (node.name !== null) {
      found.push(node.name);
    }
  });

  return found;
};

/**
 * The directives in a block of resume Markdown, in order, with their attributes
 * and without their labels.
 *
 * What a translation may change in an example is the prose: the name, a job
 * title, a summary. What it may not change is the format being shown: which
 * directives appear, in what order and with which attributes, because that is
 * what the page teaches. A label (`[...]`) is prose, so it is dropped here.
 */
export const directiveSkeleton = (value: string): Array<string> =>
  [
    ...value.matchAll(
      /(?<![\w:/])(:{1,3}[a-z][\w-]*)(?:\[[^\]]*\])?(\{[^}]*\})?/g,
    ),
  ].map((match) => `${match[1] ?? ""}${match[2] ?? ""}`);
