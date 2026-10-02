import { useRef, useState } from "react";
import { AnchorProvider, ScrollProvider, TOCItem } from "fumadocs-core/toc";
import { Box, Collapse, Text, UnstyledButton } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { cn } from "@/lib/utils";

import { useDocsTranslation } from "../useDocsTranslation";

import type { TOCItemType } from "fumadocs-core/toc";
import type { DocsLanguage } from "../paths";

const List: React.FC<{ toc: Array<TOCItemType> }> = ({ toc }) => (
  <Box className="flex flex-col">
    {toc.map((item) => (
      <TOCItem
        className={cn(
          "text-muted hover:text-body duration-fast ease-standard border-l py-1 text-[12.5px] leading-snug transition-colors",
          "data-[active=true]:border-accent data-[active=true]:text-accent border-line-soft",
        )}
        href={item.url}
        key={item.url}
      >
        <Box className="block" pl={Math.max(item.depth - 2, 0) * 12 + 12}>
          {item.title}
        </Box>
      </TOCItem>
    ))}
  </Box>
);

/**
 * "On this page".
 *
 * Two views of one list, so the scroll tracking is shared: a sticky column from
 * `lg` (1200px), where there is room beside the article, and below it a
 * collapsed block above the article, where a column would crush the text. The
 * fumadocs providers do the tracking (an intersection observer on the headings);
 * everything drawn is Mantine and the app's tokens.
 *
 * Renders nothing for a page with no headings, so a short page has no empty
 * column reserved beside it.
 */
export const DocsToc: React.FC<{
  lang: DocsLanguage;
  toc: Array<TOCItemType>;
  children: React.ReactNode;
}> = ({ lang, toc, children }) => {
  const { t } = useDocsTranslation(lang);
  const [open, setOpen] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);

  if (toc.length === 0) {
    return <Box className="min-w-0 flex-1">{children}</Box>;
  }

  return (
    <AnchorProvider toc={toc}>
      <Box className="flex min-w-0 flex-1 gap-10">
        <Box className="min-w-0 flex-1">
          <Box className="border-line-soft rounded-panel mb-6 border lg:hidden">
            <UnstyledButton
              aria-expanded={open}
              className="text-body flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium"
              onClick={() => setOpen(!open)}
            >
              {t("page.onThisPage")}
              <Icon name={open ? "caret-up" : "caret-down"} size={12} />
            </UnstyledButton>
            <Collapse expanded={open}>
              <Box className="px-3 pb-3">
                <List toc={toc} />
              </Box>
            </Collapse>
          </Box>

          {children}
        </Box>

        <Box
          aria-label={t("page.onThisPage")}
          className="hidden w-[220px] shrink-0 lg:block"
          component="aside"
        >
          <Box
            className="sticky top-[72px] max-h-[calc(100dvh-96px)] overflow-y-auto pb-6"
            ref={columnRef}
          >
            <Text className="text-title mb-2 text-[12px] font-medium">
              {t("page.onThisPage")}
            </Text>
            <ScrollProvider containerRef={columnRef}>
              <List toc={toc} />
            </ScrollProvider>
          </Box>
        </Box>
      </Box>
    </AnchorProvider>
  );
};
