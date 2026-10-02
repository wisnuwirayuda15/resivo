import { describe, expect, it } from "vitest";

import { SUPPORTED_LANGUAGES } from "@/lib/i18n/language";

import {
  checkBody,
  checkCompiles,
  checkFences,
  checkFrontmatter,
  checkLinks,
  checkMeta,
  checkParity,
  checkSlugs,
} from "./testing/checks";
import { languagesOnDisk, readDocsTree } from "./testing/contentFiles";

/**
 * The docs content has to be true, complete and the same in every language.
 *
 * Each rule lives in `testing/checks.ts` and returns a list of problems, and
 * this file only runs them over what is on disk and expects the list to be
 * empty. A failure therefore names the file and the rule, which is the whole
 * point of a content test: "something is wrong in the docs" is not actionable.
 * `testing/checks.test.ts` is what proves each rule can fail.
 */

const trees = new Map(
  SUPPORTED_LANGUAGES.map((lang) => [lang, readDocsTree(lang)] as const),
);

describe("the docs content", () => {
  it("has a folder for exactly the languages the app speaks", () => {
    expect(languagesOnDisk()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it("has pages in every language", () => {
    for (const [, tree] of trees) {
      expect(tree.pages.length).toBeGreaterThan(0);
    }
  });

  describe.each(SUPPORTED_LANGUAGES)("in %s", (lang) => {
    const tree = trees.get(lang);

    if (tree === undefined) {
      throw new Error(`no content for ${lang}`);
    }

    it("has valid front matter on every page", () => {
      expect(tree.pages.flatMap(checkFrontmatter)).toEqual([]);
    });

    it("uses ASCII slugs", () => {
      expect(checkSlugs(tree)).toEqual([]);
    });

    it("has no h1 and no repeated heading id", () => {
      expect(tree.pages.flatMap(checkBody)).toEqual([]);
    });

    it("lists every page in a meta.json, and only pages that exist", () => {
      expect(checkMeta(tree)).toEqual([]);
    });

    it("compiles every page as MDX", async () => {
      const problems = (
        await Promise.all(tree.pages.map(checkCompiles))
      ).flat();

      expect(problems).toEqual([]);
    });

    it("links only to places that exist", () => {
      expect(checkLinks(tree)).toEqual([]);
    });

    it("has code blocks that are true", () => {
      expect(tree.pages.flatMap(checkFences)).toEqual([]);
    });
  });

  it("is the same document in every language", () => {
    const [first, ...rest] = [...trees.values()];

    if (first === undefined) {
      throw new Error("no languages");
    }

    for (const other of rest) {
      expect(checkParity(first, other)).toEqual([]);
    }
  });
});
