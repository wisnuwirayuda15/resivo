import { createFileRoute } from "@tanstack/react-router";

import { requestOrigin } from "@/lib/siteOrigin";

import { isDocsLanguage } from "@/features/docs/paths";
import { renderIndex } from "@/features/docs/markdown/server";

/** `/en/llms.txt`, `/id/llms.txt`: one language's contents, a link per page. */
export const Route = createFileRoute("/$lang/llms.txt")({
  server: {
    handlers: {
      GET: async ({ params, request }) =>
        isDocsLanguage(params.lang)
          ? new Response(
              await renderIndex(params.lang, requestOrigin(request)),
              { headers: { "Content-Type": "text/plain; charset=utf-8" } },
            )
          : new Response("Unknown language", { status: 404 }),
    },
  },
});
