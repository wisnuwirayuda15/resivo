import { useState } from "react";
import { Box, Collapse, Text, UnstyledButton } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { cn } from "@/lib/utils";

import { isFolderOpenByDefault, nodeKey } from "../tree";

import { DocsLink } from "./DocsLink";

import type { Folder, Item, Node } from "fumadocs-core/page-tree";

interface SidebarTreeProps {
  nodes: Array<Node>;
  /** The address of the page being read, to mark it and open its folders. */
  current: string;
  /** Called when a link is followed, so a drawer holding this can close. */
  onNavigate?: () => void;
  depth?: number;
}

const ROW =
  "rounded-control duration-fast ease-standard flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[13px] transition-colors";

const PageRow: React.FC<{
  item: Item;
  current: string;
  depth: number;
  onNavigate?: () => void;
}> = ({ item, current, depth, onNavigate }) => {
  const active = item.url === current;

  return (
    <DocsLink
      aria-current={active ? "page" : undefined}
      className={cn(
        ROW,
        "text-muted hover:text-body hover:bg-hover aria-[current=page]:bg-accent-quiet aria-[current=page]:text-accent aria-[current=page]:font-medium",
      )}
      href={item.url}
      onClick={onNavigate}
    >
      <Box className="shrink-0" w={8 + depth * 12} />
      {item.name}
    </DocsLink>
  );
};

const FolderRow: React.FC<{
  folder: Folder;
  current: string;
  depth: number;
  onNavigate?: () => void;
}> = ({ folder, current, depth, onNavigate }) => {
  // `undefined` until the reader toggles it, so the default keeps following the
  // page they are on instead of freezing at whatever it was on first render.
  const [chosen, setChosen] = useState<boolean | undefined>(undefined);
  const open = chosen ?? isFolderOpenByDefault(folder, current);

  return (
    <Box>
      <UnstyledButton
        aria-expanded={open}
        className={cn(ROW, "text-body hover:bg-hover font-medium")}
        onClick={() => setChosen(!open)}
      >
        <Box className="shrink-0" w={depth * 12} />
        <Icon
          className="text-subtle shrink-0"
          name={open ? "caret-down" : "caret-right"}
          size={11}
        />
        {folder.name}
      </UnstyledButton>

      <Collapse expanded={open}>
        <SidebarTree
          depth={depth + 1}
          nodes={[
            ...(folder.index === undefined ? [] : [folder.index]),
            ...folder.children,
          ]}
          current={current}
          onNavigate={onNavigate}
        />
      </Collapse>
    </Box>
  );
};

/**
 * The sidebar's tree, the same component in the fixed column and the drawer.
 *
 * A folder is a button that opens and closes, a page is a link, a separator is a
 * quiet heading. Depth is indentation by a spacer rather than padding on the
 * row, so the highlight of the current page always spans the full width.
 */
export const SidebarTree: React.FC<SidebarTreeProps> = ({
  nodes,
  current,
  onNavigate,
  depth = 0,
}) => (
  <Box className="flex flex-col gap-px">
    {nodes.map((node, index) => {
      const key = nodeKey(node, index);

      switch (node.type) {
        case "page":
          return (
            <PageRow
              current={current}
              depth={depth}
              item={node}
              key={key}
              onNavigate={onNavigate}
            />
          );
        case "folder":
          return (
            <FolderRow
              current={current}
              depth={depth}
              folder={node}
              key={key}
              onNavigate={onNavigate}
            />
          );
        default:
          return node.name === undefined ? null : (
            <Text
              className="text-subtle mt-3 mb-1 px-2 text-[11px] font-medium tracking-wide uppercase"
              key={key}
            >
              {node.name}
            </Text>
          );
      }
    })}
  </Box>
);
