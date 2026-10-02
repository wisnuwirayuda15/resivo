import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { DocsNotFound } from "@/features/docs/DocsNotFound";
import { DOCS_LANGUAGE_SCRIPT } from "@/features/docs/languageScript";
import { isDocsLanguage } from "@/features/docs/paths";

/**
 * Everything under `/$lang/docs`.
 *
 * It owns the language check, so no page below has to: `/xx/docs/anything` is a
 * 404 before a page is looked for. It also carries the one script that fixes up
 * a redirected visit (see `languageScript.ts`), which is why that script is on
 * the docs and not in the root document where every route would pay for it.
 */
export const Route = createFileRoute("/$lang/docs")({
  beforeLoad: ({ params }) => {
    if (!isDocsLanguage(params.lang)) {
      throw notFound();
    }
  },
  head: () => ({ scripts: [{ children: DOCS_LANGUAGE_SCRIPT }] }),
  component: Outlet,
  notFoundComponent: DocsNotFound,
});
