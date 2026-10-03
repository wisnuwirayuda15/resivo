import { createFileRoute } from "@tanstack/react-router";

import { requestOrigin } from "@/lib/siteOrigin";

import { isDocsLanguage } from "@/features/docs/paths";
import { renderFull } from "@/features/docs/markdown/server";

/**
 * `/en/llms-full.txt`: every page of one language in a single file, for a model
 * that would rather load the whole documentation once than follow links. It is
 * the size of the documentation and nothing more, and per language so a reader
 * of one never pays for the other.
 */
export const Route = createFileRoute("/$lang/llms-full.txt")({
  server: {
    handlers: {
      GET: async ({ params, request }) =>
        isDocsLanguage(params.lang)
          ? new Response(
              await renderFull(params.lang, requestOrigin(request)),
              { headers: { "Content-Type": "text/plain; charset=utf-8" } },
            )
          : new Response("Unknown language", { status: 404 }),
    },
  },
});
