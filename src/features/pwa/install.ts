import { useCallback, useEffect, useState } from "react";

/**
 * Whether this device can install Resivo, whether it already has, and whether
 * the app is cached well enough to open without a network.
 *
 * All three are questions only the browser can answer, and none of them has a
 * synchronous, reliable answer at first paint, so this is a hook rather than a
 * value.
 *
 * The install offer is the awkward one. `beforeinstallprompt` fires once, and
 * Chrome fires it as soon as its criteria are met, which on a repeat visit is
 * before React has hydrated. A listener attached in an effect would therefore
 * miss it on exactly the visits where the answer is yes. So the event is caught
 * by the inline script in the document head (see `lib/serviceWorker.ts`), which
 * stashes it on `window` and announces it; this hook reads whichever of the two
 * happened first.
 *
 * The two decisions are pure functions, and the hook is the glue that reads the
 * browser and calls them. Nothing here can be exercised in the Browser pane (a
 * service worker's own script fetch does not survive its request interception)
 * and `beforeinstallprompt` is never fired under automation at all, so the
 * branching is unit-tested and the worker end of it is checked in `e2e-pwa`.
 */

/**
 * Not in the DOM lib, because it is not in any specification: this is Chromium's
 * own event, and the type is written from its documented shape.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Set by the head script when the browser offers an install. */
    resivoInstallPrompt?: BeforeInstallPromptEvent;
  }
}

/** The custom event the head script fires, so a capture that happens after this
 * hook mounts is not missed either. */
export const INSTALLABLE_EVENT = "resivo:installable";

export type InstallState =
  /** Running as an installed app, so there is nothing to offer. */
  | "installed"
  /** The browser has offered, and the offer is being held. */
  | "available"
  /** No offer. Either the browser does not do this, or it has decided not to. */
  | "unavailable";

export type CacheState =
  /** A worker is controlling this page: it opens with no network. */
  | "ready"
  /** Installed and waiting. The next load is the one that is offline-capable. */
  | "pending"
  /** No worker. A development build, or a browser that refused one. */
  | "absent";

/**
 * Being installed wins over being installable.
 *
 * A browser that has already installed the app stops offering, so the two are
 * rarely both true, and where they are (a second profile, an offer held from
 * before the install completed) the honest thing to report is the window the
 * user is actually looking at.
 */
export const installStateOf = (browser: {
  standalone: boolean;
  offered: boolean;
}): InstallState =>
  browser.standalone
    ? "installed"
    : browser.offered
      ? "available"
      : "unavailable";

/**
 * Registered is not the same as in charge.
 *
 * A first visit ends with an installed worker that controls nothing, because
 * this app's worker deliberately does not claim open pages: an update that did
 * would purge the cache under a page still running. So it takes over on the
 * next navigation, and until then "ready" would be a promise this page cannot
 * keep. Saying so is the difference between a status line and a guess.
 */
export const cacheStateOf = (worker: {
  supported: boolean;
  controlled: boolean;
  activated: boolean;
}): CacheState => {
  if (!worker.supported) {
    return "absent";
  }

  if (worker.controlled) {
    return "ready";
  }

  return worker.activated ? "pending" : "absent";
};

/**
 * Running in its own window.
 *
 * Three checks because they cover different platforms: `display-mode:
 * standalone` is the standard one, `window-controls-overlay` is the same thing
 * with the title bar drawn into the page, and `navigator.standalone` is
 * Safari's, which is the only signal on an iPhone and is not in the DOM lib.
 */
const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: window-controls-overlay)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const readCacheState = async (): Promise<CacheState> => {
  const supported = "serviceWorker" in navigator;

  if (!supported) {
    return cacheStateOf({ supported, controlled: false, activated: false });
  }

  const registration = await navigator.serviceWorker.getRegistration();

  return cacheStateOf({
    supported,
    controlled: navigator.serviceWorker.controller !== null,
    activated: registration?.active !== undefined,
  });
};

export interface Installability {
  state: InstallState;
  cache: CacheState;
  /** Shows the browser's own install dialog. Resolves once it is answered. */
  install: () => Promise<void>;
}

export const useInstallability = (): Installability => {
  const [state, setState] = useState<InstallState>("unavailable");
  const [cache, setCache] = useState<CacheState>("absent");

  useEffect(() => {
    const sync = () => {
      setState(
        installStateOf({
          standalone: isStandalone(),
          offered: window.resivoInstallPrompt !== undefined,
        }),
      );
    };

    sync();

    const display = window.matchMedia("(display-mode: standalone)");

    window.addEventListener(INSTALLABLE_EVENT, sync);
    // Fired by the browser once an install completes, which is what turns the
    // button into the installed line without a reload.
    window.addEventListener("appinstalled", sync);
    display.addEventListener("change", sync);

    void readCacheState().then(setCache);

    return () => {
      window.removeEventListener(INSTALLABLE_EVENT, sync);
      window.removeEventListener("appinstalled", sync);
      display.removeEventListener("change", sync);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = window.resivoInstallPrompt;

    if (prompt === undefined) {
      return;
    }

    await prompt.prompt();
    await prompt.userChoice;

    /**
     * Cleared either way. The event may be used once, so a second press would
     * throw, and a dismissed prompt is the browser's cue to stop offering:
     * re-offering it from here would be this app talking over that decision.
     */
    window.resivoInstallPrompt = undefined;
    window.dispatchEvent(new Event(INSTALLABLE_EVENT));
  }, []);

  return { state, cache, install };
};
