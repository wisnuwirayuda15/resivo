import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

import { resolveSiteOrigin } from "./siteOrigin";

/**
 * The origin of this deployment, for a route's `head`.
 *
 * Only the server can answer it (`SITE_URL`, then the request), and a route's
 * head runs on the client too, on a client navigation, so it is a loader's
 * answer and not a call made in `head`. The three public pages use it for the
 * absolute card image, the canonical address and the structured data's `url`.
 */
export const getSiteOrigin = createServerFn({ method: "GET" }).handler(
  (): string | null =>
    resolveSiteOrigin(process.env.SITE_URL, getRequestUrl().href),
);
