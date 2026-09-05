/**
 * Registers `public/sw.js`, and only in a production build.
 *
 * A worker in development would be the wrong kind of help. Vite serves every
 * module unbundled and unhashed, so the URLs it caches are the ones that change
 * on every edit, and the failure looks like the app ignoring a change that was
 * saved. There is nothing about the worker that a dev server is the place to
 * work on either: what it exists for is a build, served over a network that
 * then goes away. `playwright.pwa.config.ts` runs the offline spec against a
 * real build for that reason.
 *
 * An inline script rather than an effect, matching the colour-scheme and
 * sidebar scripts beside it in the document. Registration is not React's
 * business, and doing it on `load` keeps it off the critical path: a worker
 * that installs while the app is still painting competes with the app for the
 * network it is trying to cache.
 *
 * Failure is swallowed on purpose. Registration throws where a worker is not
 * allowed at all (an insecure origin, a private window in some browsers, a
 * disabled setting), and none of that is worth a console error on a page that
 * works fine without it.
 */
export const SERVICE_WORKER_SCRIPT = import.meta.env.PROD
  ? `if("serviceWorker" in navigator){addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})}`
  : null;
