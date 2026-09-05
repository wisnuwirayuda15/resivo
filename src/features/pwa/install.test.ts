import { describe, expect, it } from "vitest";

import { cacheStateOf, installStateOf } from "./install";

/**
 * The two decisions behind the Settings panel, without a browser.
 *
 * Everything else about installing has to be checked somewhere else, and this
 * is the honest division rather than a convenient one. `beforeinstallprompt` is
 * never fired under automation, so no browser test can reach the button at all;
 * a worker actually taking control is checked against a real build in
 * `e2e-pwa/offline.spec.ts`. What is left is the branching, which is where a
 * status line goes from true to misleading, so it is pulled out and pinned
 * here.
 */
describe("what the install panel says", () => {
  it("offers an install only when the browser has", () => {
    expect(installStateOf({ standalone: false, offered: true })).toBe(
      "available",
    );
    expect(installStateOf({ standalone: false, offered: false })).toBe(
      "unavailable",
    );
  });

  it("reports the window it is in over any offer it is holding", () => {
    // Rarely both, since a browser stops offering once it has installed. Where
    // they are, the window the user is looking at is the true answer.
    expect(installStateOf({ standalone: true, offered: true })).toBe(
      "installed",
    );
    expect(installStateOf({ standalone: true, offered: false })).toBe(
      "installed",
    );
  });
});

describe("what the offline line says", () => {
  it("claims offline only once a worker is in charge of this page", () => {
    expect(
      cacheStateOf({ supported: true, controlled: true, activated: true }),
    ).toBe("ready");
  });

  it("says next time when the worker is installed but not controlling", () => {
    /**
     * The state a first visit ends in, and the reason this distinction exists.
     * The worker does not claim open pages by design, so it takes over on the
     * next navigation: "ready" here would be a promise this page cannot keep.
     */
    expect(
      cacheStateOf({ supported: true, controlled: false, activated: true }),
    ).toBe("pending");
  });

  it("says nothing is cached where there is no worker", () => {
    // A development build (the worker is registered only in production), and a
    // browser that refuses one.
    expect(
      cacheStateOf({ supported: true, controlled: false, activated: false }),
    ).toBe("absent");
    expect(
      cacheStateOf({ supported: false, controlled: false, activated: false }),
    ).toBe("absent");
  });

  it("never reads a controller as offline-ready without support", () => {
    // Defensive, and cheap: support is checked first, so a stray truthy
    // controller cannot promise offline on a browser that has no worker.
    expect(
      cacheStateOf({ supported: false, controlled: true, activated: true }),
    ).toBe("absent");
  });
});
