import { createFileRoute } from "@tanstack/react-router";

import { requestOrigin } from "@/lib/siteOrigin";

import { renderRootIndex } from "@/features/docs/markdown/server";

/**
 * `/llms.txt`: the front door for a model, in the convention that name carries.
 * The default language's contents with a `.md` link per page, and a pointer to
 * each other language's own index, so an agent can start here and follow links
 * without guessing any address.
 */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(await renderRootIndex(requestOrigin(request)), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
