import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { useFumadocsLoader } from "fumadocs-core/source/client";

import { DocsNotFound } from "@/features/docs/DocsNotFound";
import { DocsLayout } from "@/features/docs/components/DocsLayout";
import { DOCS_LANGUAGE_SCRIPT } from "@/features/docs/languageScript";
import { getDocsTree } from "@/features/docs/loaders";
import { isDocsLanguage } from "@/features/docs/paths";

/**
 * Everything under `/$lang/docs`.
 *
 * It owns the language check, so no page below has to: `/xx/docs/anything` is a
 * 404 before a page is looked for. It also loads the tree once for the whole
 * section, so moving between pages re-renders the article and not the sidebar,
 * and it carries the one script that fixes up a redirected visit (see
 * `languageScript.ts`), which is why that script is on the docs and not in the
 * root document where every route would pay for it.
 */
const DocsRoute: React.FC = () => {
  const { lang } = Route.useParams();
  const data = useFumadocsLoader(Route.useLoaderData());

  if (!isDocsLanguage(lang)) {
    throw notFound();
  }

  return (
    <DocsLayout lang={lang} tree={data.pageTree}>
      <Outlet />
    </DocsLayout>
  );
};

export const Route = createFileRoute("/$lang/docs")({
  beforeLoad: ({ params }) => {
    if (!isDocsLanguage(params.lang)) {
      throw notFound();
    }
  },
  loader: ({ params }) => getDocsTree({ data: { lang: params.lang } }),
  head: () => ({ scripts: [{ children: DOCS_LANGUAGE_SCRIPT }] }),
  component: DocsRoute,
  notFoundComponent: DocsNotFound,
});
