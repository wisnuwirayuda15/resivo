import { getBreadcrumbItems } from "fumadocs-core/breadcrumb";
import { Box, Text } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";

import { docsHref } from "../paths";
import { useDocsTranslation } from "../useDocsTranslation";

import { DocsLink } from "./DocsLink";

import type { Root } from "fumadocs-core/page-tree";
import type { DocsLanguage } from "../paths";

/**
 * Where the page sits: the docs home, then each folder above it.
 *
 * Folders usually have no page of their own, so they are plain text and only
 * the home is a link. Nothing is rendered for the home page itself, which has no
 * trail, and the page's own title is the heading under this, not a last crumb.
 */
export const DocsBreadcrumbs: React.FC<{
  lang: DocsLanguage;
  tree: Root;
  url: string;
}> = ({ lang, tree, url }) => {
  const { t } = useDocsTranslation(lang);
  // The folders above the page. The library's own `includeRoot` only applies to
  // folders marked as roots, which this tree has none of, so the home is added
  // here. A page at the top level has no folders and so no trail.
  const folders = getBreadcrumbItems(url, tree);

  if (folders.length === 0) {
    return null;
  }

  const items = [{ name: tree.name, url: docsHref(lang) }, ...folders];

  return (
    <Box
      aria-label={t("page.breadcrumbs")}
      className="text-muted mb-3 flex flex-wrap items-center gap-1.5 text-[12px]"
      component="nav"
    >
      {items.map((item, index) => (
        <Box
          className="flex items-center gap-1.5"
          key={`${index}-${item.url ?? ""}`}
        >
          {index > 0 ? (
            <Icon className="text-subtle" name="caret-right" size={10} />
          ) : null}
          {item.url === undefined ? (
            <Text className="text-[12px]" component="span">
              {item.name}
            </Text>
          ) : (
            <DocsLink
              className="hover:text-body duration-fast ease-standard transition-colors"
              href={item.url}
            >
              {item.name}
            </DocsLink>
          )}
        </Box>
      ))}
    </Box>
  );
};
