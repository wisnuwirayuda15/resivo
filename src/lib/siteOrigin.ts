/**
 * The origin this deployment is served from, for the places that need an
 * absolute address: canonical and alternate links, the sitemap, and links in the
 * Markdown a model reads.
 *
 * `SITE_URL` wins when it is set, because only the person deploying knows the
 * address people reach the site by; behind a proxy the request's own host is the
 * internal one, and a `Host` header is chosen by whoever sends the request, so
 * it must never be what decides a canonical. The request's origin is the
 * fallback for a deployment that did not set one, which is right for local runs
 * and for a host that forwards the real one. A value that is not an http(s) URL
 * is ignored and not an error: a typo in an environment variable should degrade
 * to the fallback and not take the page down.
 *
 * Pure, so the rule is tested without a server; callers pass
 * `process.env.SITE_URL` from server code.
 */
export const resolveSiteOrigin = (
  siteUrl: string | undefined,
  requestUrl: string | undefined,
): string | null => {
  for (const candidate of [siteUrl, requestUrl]) {
    if (candidate === undefined || candidate.trim() === "") {
      continue;
    }

    try {
      const url = new URL(candidate.trim());

      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      // Not a URL; try the next source.
    }
  }

  return null;
};

/**
 * The origin for a server request: `SITE_URL` if the deployment set one, the
 * request's own otherwise. Server code only, because it reads the environment.
 * Always an origin: a request URL is always a valid one.
 */
export const requestOrigin = (request: Request): string =>
  resolveSiteOrigin(process.env.SITE_URL, request.url) ??
  new URL(request.url).origin;
