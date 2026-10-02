import { createFileRoute } from "@tanstack/react-router";
import { Box, Text, Title } from "@mantine/core";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { Suspense, use } from "react";

import { getDocsPage } from "@/features/docs/loaders";
import { docs } from "@/features/docs/source";

import type { MDXComponents } from "mdx/types";

/**
 * Phase 1 spike: one page, no chrome. It exists to prove the pipeline (the macro,
 * the async body, the processed Markdown, the SSR output) before anything is
 * built on top of it. The layout, the component map and the SEO arrive in the
 * phases after.
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

const Content: React.FC<{ path: string }> = ({ path }) => {
  const page = docs.getPage(path);

  if (!page) {
    throw new Error(`Unknown docs page: ${path}`);
  }

  use(page.load());

  const Body = page.body;

  return (
    <Box component="article" className="mx-auto max-w-[68ch] p-6">
      <Title order={1}>{page.title}</Title>
      <Text className="text-muted">{page.description}</Text>
      <Body components={components} />
    </Box>
  );
};

const DocsPageRoute: React.FC = () => {
  const data = useFumadocsLoader(Route.useLoaderData());

  return (
    <Suspense>
      <Content path={data.path} />
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
