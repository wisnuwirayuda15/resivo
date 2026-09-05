/**
 * The two things the document has to do about being an installable app, and
 * only in a production build.
 *
 * It registers `public/sw.js`, and it catches the browser's install offer.
 *
 * A worker in development would be the wrong kind of help. Vite serves every
 * module unbundled and unhashed, so the URLs it caches are the ones that change
 * on every edit, and the failure looks like the app ignoring a change that was
 * saved. There is nothing about the worker that a dev server is the place to
 * work on either: what it exists for is a build, served over a network that
 * then goes away. `playwright.pwa.config.ts` runs the offline spec against a
 * real build for that reason. The install offer is production-only for free,
 * since a browser will not make one without a worker.
 *
 * An inline script rather than an effect, matching the colour-scheme and
 * sidebar scripts beside it in the document, and here it is load-bearing twice
 * over.
 *
 * Registration is on `load` to keep it off the critical path: a worker that
 * installs while the app is still painting competes with the app for the
 * network it is trying to cache.
 *
 * The install offer has to be caught earlier than React exists.
 * `beforeinstallprompt` fires once, and on a repeat visit it fires before
 * hydration, so a listener attached in an effect would miss it on exactly the
 * visits where the browser was willing. It is held on `window` for
 * `features/pwa/install.ts` to pick up, and `preventDefault` is what stops
 * Chrome on Android from showing its own bar over the app; the address bar's
 * install icon is unaffected, so nothing is taken away from somebody who never
 * opens Settings.
 *
 * Failure is swallowed on purpose. Registration throws where a worker is not
 * allowed at all (an insecure origin, a private window in some browsers, a
 * disabled setting), and none of that is worth a console error on a page that
 * works fine without it.
 */
export const SERVICE_WORKER_SCRIPT = import.meta.env.PROD
  ? [
      `if("serviceWorker" in navigator){addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})}`,
      `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.resivoInstallPrompt=e;dispatchEvent(new Event("resivo:installable"))})`,
    ].join("")
  : null;
