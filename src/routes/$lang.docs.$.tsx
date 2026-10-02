import { Suspense, use } from "react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { Box, Text, Title } from "@mantine/core";

import { DocsBreadcrumbs } from "@/features/docs/components/DocsBreadcrumbs";
import { DocsPager } from "@/features/docs/components/DocsPager";
import { DocsToc } from "@/features/docs/components/DocsToc";
import { getDocsPage } from "@/features/docs/loaders";
import { isDocsLanguage } from "@/features/docs/paths";
import { docs } from "@/features/docs/source";

import type { MDXComponents } from "mdx/types";

/**
 * One docs page, inside the layout above it.
 *
 * Still a minimal component map: the real one (headings, code, callouts, tabs)
 * is the article-rendering phase.
 */
const components: MDXComponents = {
  Callout: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title?: string;
  }) => <Box data-callout={title}>{children}</Box>,
};

const layoutApi = getRouteApi("/$lang/docs");

const Article: React.FC<{
  path: string;
  url: string;
  title: string;
  description?: string;
}> = ({ path, url, title, description }) => {
  const { lang } = Route.useParams();
  const { pageTree } = useFumadocsLoader(layoutApi.useLoaderData());
  const page = docs.getPage(path);

  if (!page || !isDocsLanguage(lang)) {
    throw new Error(`Unknown docs page: ${path}`);
  }

  const { toc } = use(page.load());
  const Body = page.body;

  return (
    <DocsToc lang={lang} toc={toc}>
      {/* Until the article phase brings a real code block: a long line scrolls
          inside its own box instead of pushing the page sideways on a phone. */}
      <Box className="[&_pre]:overflow-x-auto" component="article">
        <DocsBreadcrumbs lang={lang} tree={pageTree} url={url} />
        <Title order={1}>{title}</Title>
        {description === undefined ? null : (
          <Text className="text-muted mt-2 text-[15px]">{description}</Text>
        )}
        <Box className="mt-6">
          <Body components={components} />
        </Box>
        <DocsPager lang={lang} tree={pageTree} url={url} />
      </Box>
    </DocsToc>
  );
};

const DocsPageRoute: React.FC = () => {
  const data = Route.useLoaderData();

  return (
    <Suspense>
      <Article {...data} />
    </Suspense>
  );
};

export const Route = createFileRoute("/$lang/docs/$")({
  loader: async ({ params }) => {
    const slugs = (params._splat ?? "").split("/").filter(Boolean);
    const data = await getDocsPage({ data: { lang: params.lang, slugs } });

    await docs.getPage(data.path)?.preload();

    return data;
  },
  component: DocsPageRoute,
});
