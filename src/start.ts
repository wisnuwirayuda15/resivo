import { createMiddleware, createStart } from "@tanstack/react-start";

/**
 * Answers a request for a docs page as Markdown before the router sees it.
 *
 * It is a request middleware and not a route because the Markdown shares its
 * address with the page: `/en/docs/x.md` has to coexist with the splat route
 * that draws `/en/docs/x`, and an agent that sends `Accept: text/markdown` to
 * the normal address expects Markdown back from it, not a redirect to another.
 * Everything else, and everything that is not the docs, goes straight through.
 *
 * The server code is imported inside the handler so it stays out of the client
 * bundle, which this file is part of.
 */
const markdown = createMiddleware().server(async ({ request, next }) => {
  const { pathname } = new URL(request.url);

  // Cheap test first: this runs on every request, including assets.
  if (!/^\/[^/]+\/docs(?:\/|$)/.test(pathname)) {
    return next();
  }

  const { markdownRequestFor } =
    await import("@/features/docs/markdown/request");
  const wanted = markdownRequestFor(request);

  if (wanted === null) {
    // The same address answers differently to a different `Accept`, which a shared
    // cache has to be told or it would hand an agent the HTML it stored for a
    // browser.
    const result = await next();

    result.response.headers.append("Vary", "Accept");

    return result;
  }

  const { markdownResponse } = await import("@/features/docs/markdown/server");
  const { requestOrigin } = await import("@/lib/siteOrigin");

  return markdownResponse(wanted.lang, wanted.slugs, requestOrigin(request));
});

export const startInstance = createStart(() => ({
  requestMiddleware: [markdown],
}));
