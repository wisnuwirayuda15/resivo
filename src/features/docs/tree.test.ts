import { describe, expect, it } from "vitest";

import {
  containsUrl,
  isFolderOpenByDefault,
  nodeKey,
  pageUrlsInOrder,
  pagerFor,
} from "./tree";

import type { Folder, Root } from "fumadocs-core/page-tree";

const tree: Root = {
  name: "Docs",
  children: [
    { type: "page", name: "Home", url: "/en/docs" },
    {
      type: "folder",
      name: "Format",
      children: [
        { type: "page", name: "Overview", url: "/en/docs/format/overview" },
        { type: "page", name: "Entries", url: "/en/docs/format/entries" },
      ],
    },
    {
      type: "folder",
      name: "Design",
      defaultOpen: true,
      index: { type: "page", name: "Design", url: "/en/docs/design" },
      children: [
        { type: "page", name: "Tokens", url: "/en/docs/design/tokens" },
      ],
    },
    { type: "separator", name: "Help" },
    { type: "page", name: "FAQ", url: "/en/docs/faq" },
  ],
};

const format = tree.children[1] as Folder;
const design = tree.children[2] as Folder;

describe("containsUrl", () => {
  it("finds a page directly and inside a folder", () => {
    expect(containsUrl(tree.children[0]!, "/en/docs")).toBe(true);
    expect(containsUrl(format, "/en/docs/format/entries")).toBe(true);
  });

  it("counts a folder's index page", () => {
    expect(containsUrl(design, "/en/docs/design")).toBe(true);
  });

  it("does not find a page elsewhere, and a separator contains nothing", () => {
    expect(containsUrl(format, "/en/docs/faq")).toBe(false);
    expect(containsUrl(tree.children[3]!, "/en/docs/faq")).toBe(false);
  });
});

describe("isFolderOpenByDefault", () => {
  it("opens the folder the current page is in", () => {
    expect(isFolderOpenByDefault(format, "/en/docs/format/overview")).toBe(
      true,
    );
  });

  it("leaves other folders closed unless the tree opens them", () => {
    expect(isFolderOpenByDefault(format, "/en/docs/faq")).toBe(false);
    expect(isFolderOpenByDefault(design, "/en/docs/faq")).toBe(true);
  });
});

describe("pagerFor", () => {
  it("returns the neighbours in tree order, across folders", () => {
    const { previous, next } = pagerFor(tree, "/en/docs/format/overview");

    expect(previous?.url).toBe("/en/docs");
    expect(next?.url).toBe("/en/docs/format/entries");
  });

  it("has no previous on the first page and no next on the last", () => {
    expect(pagerFor(tree, "/en/docs").previous).toBeUndefined();
    expect(pagerFor(tree, "/en/docs/faq").next).toBeUndefined();
  });
});

describe("nodeKey", () => {
  it("prefers the tree's id and falls back to type and place", () => {
    expect(nodeKey({ ...format, $id: "id:format" }, 1)).toBe("id:format");
    expect(nodeKey(format, 1)).toBe("folder-1");
  });
});

describe("pageUrlsInOrder", () => {
  it("lists pages as the sidebar does, a folder's own page first", () => {
    expect(pageUrlsInOrder(tree)).toEqual([
      "/en/docs",
      "/en/docs/format/overview",
      "/en/docs/format/entries",
      "/en/docs/design",
      "/en/docs/design/tokens",
      "/en/docs/faq",
    ]);
  });
});
