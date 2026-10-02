import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Box, Drawer, ScrollArea, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { ClientOnly } from "@/components/client-only";

import { useDocsTranslation } from "../useDocsTranslation";

import { DocsHeader } from "./DocsHeader";
import { DocsSearchDialog } from "./DocsSearch";
import { SidebarTree } from "./SidebarTree";

import type { Root } from "fumadocs-core/page-tree";
import type { DocsLanguage } from "../paths";

interface DocsLayoutProps {
  lang: DocsLanguage;
  tree: Root;
  children: React.ReactNode;
}

/**
 * The frame every docs page sits in: skip link, header, a sidebar and the page.
 *
 * Not `Shell`, which is the resume app's chrome (a library sidebar, a command
 * palette, a tour) and none of which a reader of documentation needs. The
 * sidebar is a fixed column from `md` (992px) and a drawer below it, the
 * same tree in both.
 *
 * `data-hydrated` is for the tests: a click on a server-rendered control before
 * React has taken over does nothing, so a spec waits for this instead of
 * guessing.
 */
export const DocsLayout: React.FC<DocsLayoutProps> = ({
  lang,
  tree,
  children,
}) => {
  const { t } = useDocsTranslation(lang);
  const { pathname } = useLocation();
  const [navOpened, { toggle, close }] = useDisclosure(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  return (
    <Box className="bg-app min-h-dvh" data-hydrated={hydrated}>
      <Text
        className="bg-surface text-title border-line rounded-control absolute top-2 left-2 z-20 -translate-y-20 border px-3 py-2 text-[13px] focus:not-sr-only focus:translate-y-0"
        component="a"
        href="#docs-main"
      >
        {t("nav.skip")}
      </Text>

      <DocsHeader lang={lang} navOpened={navOpened} onToggleNav={toggle} />

      <Box className="mx-auto flex w-full max-w-[1280px] gap-8 px-4 sm:px-6">
        <Box
          aria-label={t("nav.label")}
          className="sticky top-[56px] hidden h-[calc(100dvh-56px)] w-[248px] shrink-0 md:block"
          component="nav"
        >
          <ScrollArea className="h-full" type="auto">
            <Box className="py-6 pr-2">
              <SidebarTree current={pathname} nodes={tree.children} />
            </Box>
          </ScrollArea>
        </Box>

        <Box
          className="min-w-0 flex-1 py-8 outline-none md:py-10"
          component="main"
          id="docs-main"
          tabIndex={-1}
        >
          {children}
        </Box>
      </Box>

      <ClientOnly>
        <DocsSearchDialog lang={lang} />
      </ClientOnly>

      <Drawer
        hiddenFrom="md"
        onClose={close}
        opened={navOpened}
        position="left"
        size="xs"
        title={t("nav.label")}
      >
        <SidebarTree
          current={pathname}
          nodes={tree.children}
          onNavigate={close}
        />
      </Drawer>
    </Box>
  );
};
