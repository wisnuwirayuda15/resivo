import { createFileRoute } from "@tanstack/react-router";

import { isDocsLanguage } from "@/features/docs/paths";
import { searchServerFor } from "@/features/docs/search/server";

/**
 * `/api/search/en`, `/api/search/id`: the exported index for one language.
 *
 * Static search: the browser downloads this once, on its first query, and
 * searches it locally. There is no request per keystroke, nothing about what a
 * reader looked for leaves their browser, and the URL is stable, so the service
 * worker can keep a copy and search works offline after the first use.
 */
export const Route = createFileRoute("/api/search/$lang")({
  server: {
    handlers: {
      GET: ({ params }) =>
        isDocsLanguage(params.lang)
          ? searchServerFor(params.lang).staticGET()
          : new Response("Unknown language", { status: 404 }),
    },
  },
});
