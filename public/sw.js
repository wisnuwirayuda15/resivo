/**
 * The service worker, which is what makes "local-first" true after a reload.
 *
 * Everything a user writes has always been on their own device, in IndexedDB.
 * The application itself was not: a reload with no network fetched the HTML and
 * the JavaScript from a server and failed without them, so somebody on a plane
 * could not open their own resumes. That is the one promise this app makes, and
 * this file is what keeps it.
 *
 * Plain JavaScript in `public/`, not a module in `src/`. A service worker is
 * served from the origin root so that its scope covers the whole app, and it
 * has no imports to bundle.
 *
 * ## Why nothing is precached in bulk
 *
 * The build is 21 MB of assets, most of it Monaco's language workers (the
 * TypeScript one alone is 6.6 MB) and the six Phosphor icon weights, none of
 * which a resume needs. So the shell is precached at install and everything
 * else is cached the first time it is actually used. In practice that is enough
 * for the editor too: to have a resume at all you have to have opened one.
 *
 * ## The strategies, and why each one
 *
 * Navigations are network-first. Online, the newest HTML always wins, which is
 * what stops a deploy from taking two visits to appear. Offline, the cached
 * copy of that URL is served instead.
 *
 * `/assets/*` is cache-first, because every filename in there carries a content
 * hash: the file at a given URL can never change, so revalidating it is a
 * request that can only ever return what is already held.
 *
 * The manifest and the icons are stale-while-revalidate. They are the only
 * files here whose names are stable, so a new one has to be able to replace an
 * old one, and none of them is on the critical path for a paint.
 *
 * The documentation's search index (`/api/search/<lang>`) and its server
 * functions (`/_serverFn/*`, which a client-side move between docs pages
 * calls for the page's data) are stale-while-revalidate for the same reason:
 * their URLs are stable and their content changes with a deploy. They are what
 * make a docs page that was read before readable again with no network, and
 * search work offline after its first use. The docs are the only server
 * functions this app has, so the one rule covers nothing else. Only what has been
 * visited is held: the docs are not precached, because which language to hold
 * is unknown at install and 46 pages in each would be megabytes nobody asked
 * for.
 *
 * ## Why it neither skips waiting nor claims clients
 *
 * An updated worker waits for every tab to close before activating, which is
 * the default and here the safe one. Activating early would purge the previous
 * cache under a page that is still running, and a lazily loaded chunk that page
 * asked for afterwards would be fetched from a server that has since been
 * deployed over and no longer has it. Waiting costs nothing, because a stale
 * worker still behaves correctly against a new deploy: it fetches the newest
 * HTML, sees hashes it does not hold, and caches those.
 *
 * Bump `VERSION` when the logic below changes. That is what drops the old cache
 * once the last tab is gone.
 */

const VERSION = "v2";
const CACHE = `resivo-${VERSION}`;

/**
 * The navigations worth having before they are asked for.
 *
 * Two, because they are the two ways in: the landing page, and the library that
 * the manifest's `start_url` points at. Precaching them at install is what
 * makes the first visit enough, rather than the first visit plus a reload.
 */
const SHELL = ["/", "/resumes"];

/** Named files, so they are also what stale-while-revalidate is applied to. */
const CHROME = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];

/**
 * Every `/assets/` URL the shell HTML mentions.
 *
 * The build's filenames carry content hashes, so they cannot be listed here and
 * are read out of the document instead: the entry is a `<script src>` and the
 * rest are `modulepreload` links, which between them are exactly the set the
 * first paint needs. Quoted on both sides so a partial match cannot produce a
 * URL that was never in the file.
 */
const ASSET_REFERENCE = /["']\/assets\/[^"']+["']/g;

/**
 * Worth storing.
 *
 * `basic` excludes an opaque cross-origin response, whose body cannot be read
 * and whose status is always 0, and excludes the opaque redirect a navigation
 * fetch returns. Storing either would cache something that can never be served.
 */
const storable = (response) => response.ok && response.type === "basic";

/**
 * A response that can be replayed to a navigation.
 *
 * A response the browser followed a redirect to carries that fact, and handing
 * one back to a navigation request is an error rather than a redirect. Rebuilt
 * from its own body so the copy in the cache is an ordinary response. Only the
 * precache needs this: the fetch handler never follows a redirect itself.
 */
const replayable = async (response) =>
  response.redirected
    ? new Response(await response.blob(), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    : response;

/** One failure is one missing file, not a failed install. */
const store = async (cache, request) => {
  try {
    const response = await fetch(request, { cache: "reload" });

    if (storable(response)) {
      await cache.put(request, await replayable(response));
    }
  } catch {
    // Offline while installing. The fetch handler stores it when it is used.
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const assets = new Set();

      for (const path of SHELL) {
        try {
          const response = await fetch(path, { cache: "reload" });

          if (!storable(response)) {
            continue;
          }

          const html = await response.clone().text();

          // Keyed by the path that was asked for, not the one the server
          // redirected to, so a navigation to `/resumes` finds it directly.
          await cache.put(path, await replayable(response));

          for (const quoted of html.match(ASSET_REFERENCE) ?? []) {
            assets.add(quoted.slice(1, -1));
          }
        } catch {
          // As above: installing offline is allowed to come up short.
        }
      }

      await Promise.all(
        [...CHROME, ...assets].map((path) => store(cache, path)),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("resivo-") && name !== CACHE) {
          await caches.delete(name);
        }
      }
    })(),
  );
});

/**
 * A redirect to the docs home of the language a docs URL is in, when that home
 * was opened and is held; undefined otherwise.
 *
 * A redirect and not the home's HTML under the page's own URL. The document is
 * hydrated against the address it was asked for, so the router would try to
 * render the page that was never opened, call its server function with no
 * network, and land on the error screen. Redirecting makes the address and the
 * document agree.
 *
 * `ignoreVary` because the docs answer with `Vary: Accept` (the same address
 * serves Markdown to a client that asks for it), and the cache honours that:
 * a lookup built from a bare path has no `Accept` and would never find the copy
 * a browser's navigation stored.
 */
const docsIndex = async (cache, request) => {
  const match = /^\/([^/]+)\/docs(?:\/|$)/.exec(new URL(request.url).pathname);

  if (
    match === null ||
    (await cache.match(`/${match[1]}/docs`, { ignoreVary: true })) === undefined
  ) {
    return undefined;
  }

  return Response.redirect(`/${match[1]}/docs`, 302);
};

/** Network first, and the cache only when there is no network. */
const navigation = async (event) => {
  const cache = await caches.open(CACHE);

  try {
    const response = await fetch(event.request);

    if (storable(response)) {
      event.waitUntil(cache.put(event.request, response.clone()));
    }

    return response;
  } catch {
    /**
     * `ignoreSearch`, because the library normalises its own URL: `/resumes`
     * redirects to `/resumes?sort=edited`, and the two have to find each
     * other's copy. The shell is the last resort for a URL that was never
     * visited, which for a resume is close to unreachable, since creating one
     * opens it.
     */
    return (
      (await cache.match(event.request, { ignoreSearch: true })) ??
      // A docs page that was never opened falls back to the docs index of its
      // own language, when that was opened, before the app: someone reading the
      // documentation offline should land in the documentation, not in a
      // library they did not ask for.
      (await docsIndex(cache, event.request)) ??
      (await cache.match("/resumes", { ignoreSearch: true })) ??
      Response.error()
    );
  }
};

/** Cache first. The URL carries a content hash, so what is held is correct. */
const immutable = async (event) => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request);

  if (cached !== undefined) {
    return cached;
  }

  const response = await fetch(event.request);

  if (storable(response)) {
    event.waitUntil(cache.put(event.request, response.clone()));
  }

  return response;
};

/** The held copy now, a fresh one for next time. */
const revalidating = async (event) => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request);

  const update = (async () => {
    const response = await fetch(event.request);

    if (storable(response)) {
      await cache.put(event.request, response.clone());
    }

    return response;
  })();

  if (cached === undefined) {
    return update;
  }

  // Kept alive past this response, and allowed to fail: being offline is not
  // a reason to withhold the copy that is already here.
  event.waitUntil(update.catch(() => undefined));

  return cached;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /**
   * Anything not answered here falls through to the browser untouched.
   *
   * Cross-origin is not this worker's business. A range request is a partial
   * response the Cache API cannot store or serve. Everything else outside the
   * cases below is safer fetched than guessed at: an export blob, `og.png`, a
   * URL a future route invents, and the documentation's machine-readable forms
   * (`.md`, `llms.txt`, `/api/mcp`), which exist for tools that are online.
   */
  if (url.origin !== self.location.origin || request.headers.has("range")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigation(event));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(immutable(event));
    return;
  }

  if (
    CHROME.includes(url.pathname) ||
    url.pathname.startsWith("/api/search/") ||
    url.pathname.startsWith("/_serverFn/")
  ) {
    event.respondWith(revalidating(event));
  }
});
