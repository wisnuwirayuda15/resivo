import { createFileRoute } from "@tanstack/react-router";

import { buildRobots } from "@/lib/robots";
import { requestOrigin } from "@/lib/siteOrigin";

/**
 * `/robots.txt`, a route and not a file in `public/` so it can name the sitemap
 * by its absolute address (see `buildRobots`). A static file of the same name
 * would be served first and shadow this, so there must not be one.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(buildRobots(requestOrigin(request)), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
