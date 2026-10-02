import { createFileRoute, redirect } from "@tanstack/react-router";

import { preferredDocsLanguage } from "@/features/docs/redirect";

/**
 * `/docs` and `/docs/...`, with no language, which exist only to be sent on.
 *
 * Every real docs URL carries its language so each one is its own crawlable
 * document, and this is the front door for a link that does not know which. A
 * 307 and not a 301: where it leads depends on who is asking, and a permanent
 * redirect would be cached by a browser or a crawler as if it did not.
 * `Vary: Accept-Language` says the same to a shared cache.
 */
export const Route = createFileRoute("/docs/$")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$lang/docs/$",
      params: { lang: preferredDocsLanguage(), _splat: params._splat ?? "" },
      statusCode: 307,
      headers: { Vary: "Accept-Language" },
      replace: true,
    });
  },
});
