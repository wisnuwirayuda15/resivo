import { findNeighbour } from "fumadocs-core/page-tree";

import type { Folder, Item, Node, Root } from "fumadocs-core/page-tree";

/**
 * Questions the sidebar and the pager ask of a page tree, as pure functions so
 * they can be tested without a browser or the collection.
 */

/** Whether a node is, or contains, the page at `url`. */
export const containsUrl = (node: Node, url: string): boolean => {
  switch (node.type) {
    case "page":
      return node.url === url;
    case "folder":
      return (
        (node.index !== undefined && node.index.url === url) ||
        node.children.some((child) => containsUrl(child, url))
      );
    default:
      return false;
  }
};

/**
 * Whether a folder shows open when the reader has not touched it.
 *
 * Open if the current page is inside it, so the sidebar always shows where you
 * are, and otherwise as the tree says (`defaultOpen`), which is closed unless a
 * `meta.json` asks. A person's own toggle overrides both (see `SidebarTree`).
 */
export const isFolderOpenByDefault = (folder: Folder, url: string): boolean =>
  containsUrl(folder, url) || folder.defaultOpen === true;

/** The previous and next pages in reading order, which is the tree's order. */
export const pagerFor = (
  tree: Root,
  url: string,
): { previous?: Item; next?: Item } => findNeighbour(tree, url);

/** A stable key for a node: its tree id where it has one, its place otherwise. */
export const nodeKey = (node: Node, index: number): string =>
  node.$id ?? `${node.type}-${index}`;
