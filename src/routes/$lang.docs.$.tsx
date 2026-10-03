import { Suspense, use } from "react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { Box, Text, Title } from "@mantine/core";

import { DocsBreadcrumbs } from "@/features/docs/components/DocsBreadcrumbs";
import { DocsPager } from "@/features/docs/components/DocsPager";
import { PageActions } from "@/features/docs/components/PageActions";
import { DocsToc } from "@/features/docs/components/DocsToc";
import { docsHead } from "@/features/docs/head";
import { getDocsPage } from "@/features/docs/loaders";
import { OriginContext } from "@/features/docs/origin";
import { markdownHref } from "@/features/docs/markdown/urls";
import { isDocsLanguage, parseDocsPath } from "@/features/docs/paths";
import { docsComponents } from "@/features/docs/mdx/components";
import { docs } from "@/features/docs/source";

/** One docs page, inside the layout above it. */
const layoutApi = getRouteApi("/$lang/docs");

const Article: React.FC<{
  path: string;
  url: string;
  title: string;
  description?: string;
  origin: string | null;
}> = ({ path, url, title, description, origin }) => {
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
      <Box component="article">
        <DocsBreadcrumbs lang={lang} tree={pageTree} url={url} />
        <Title order={1}>{title}</Title>
        {description === undefined ? null : (
          <Text className="text-muted mt-2 text-[15px]">{description}</Text>
        )}
        <PageActions
          lang={lang}
          slugs={parseDocsPath(url)?.slugs ?? []}
          title={title}
        />
        <Box className="mt-6">
          <OriginContext value={origin}>
            <Body components={docsComponents} />
          </OriginContext>
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
  // Everything a crawler reads about the page (see `docsHead`), and the
  // Markdown form of it, advertised the way a feed is: an agent that reads the
  // head learns it exists without guessing the address.
  head: ({ params, loaderData }) => {
    if (!isDocsLanguage(params.lang) || loaderData === undefined) {
      return {};
    }

    const slugs = (params._splat ?? "").split("/").filter(Boolean);
    const base = docsHead({
      lang: params.lang,
      slugs,
      title: loaderData.title,
      description: loaderData.description,
      origin: loaderData.origin,
      crumbs: loaderData.crumbs,
    });

    return {
      ...base,
      links: [
        ...base.links,
        {
          rel: "alternate",
          type: "text/markdown",
          href: markdownHref(params.lang, slugs),
        },
      ],
    };
  },
  component: DocsPageRoute,
});
