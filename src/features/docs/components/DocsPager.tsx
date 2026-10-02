import { Box, Text } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";

import { pagerFor } from "../tree";
import { useDocsTranslation } from "../useDocsTranslation";

import { DocsLink } from "./DocsLink";

import type { Item, Root } from "fumadocs-core/page-tree";
import type { DocsLanguage } from "../paths";

const Neighbour: React.FC<{
  item: Item;
  label: string;
  direction: "previous" | "next";
}> = ({ item, label, direction }) => (
  <DocsLink
    className={
      "border-line-soft hover:border-line-strong hover:bg-hover rounded-panel duration-fast ease-standard flex flex-1 flex-col gap-1 border p-3 transition-colors " +
      (direction === "next" ? "items-end text-right" : "items-start")
    }
    href={item.url}
  >
    <Text
      className="text-subtle flex items-center gap-1 text-[11px]"
      component="span"
    >
      {direction === "previous" ? <Icon name="arrow-left" size={11} /> : null}
      {label}
      {direction === "next" ? <Icon name="arrow-right" size={11} /> : null}
    </Text>
    <Text className="text-title text-[14px] font-medium" component="span">
      {item.name}
    </Text>
  </DocsLink>
);

/** Previous and next, in the order the sidebar reads. Renders nothing for a
 * single page with no neighbours. */
export const DocsPager: React.FC<{
  lang: DocsLanguage;
  tree: Root;
  url: string;
}> = ({ lang, tree, url }) => {
  const { t } = useDocsTranslation(lang);
  const { previous, next } = pagerFor(tree, url);

  if (previous === undefined && next === undefined) {
    return null;
  }

  return (
    <Box
      aria-label={t("page.pager")}
      className="mt-12 flex gap-3"
      component="nav"
    >
      {previous === undefined ? (
        <Box className="flex-1" />
      ) : (
        <Neighbour
          direction="previous"
          item={previous}
          label={t("page.previous")}
        />
      )}
      {next === undefined ? (
        <Box className="flex-1" />
      ) : (
        <Neighbour direction="next" item={next} label={t("page.next")} />
      )}
    </Box>
  );
};
