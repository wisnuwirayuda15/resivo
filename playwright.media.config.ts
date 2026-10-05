import { defineConfig, devices } from "@playwright/test";

/**
 * The clips in the docs, recorded from the app itself.
 *
 * Not part of `bun run test:e2e`, because nothing here asserts a behaviour that
 * is not already asserted there: these specs drive the app the way a person
 * would and keep what the screen did. They are run by hand, when a screen the
 * docs show has changed, with `bun run record:docs`.
 *
 * Against a production build, unlike the main suite. The dev server compiles on
 * demand, so a recording of it stutters exactly where a reader would look, and
 * its first paint is seconds of a loading screen. A build is also what a reader
 * of the docs will be using.
 */
export default defineConfig({
  testDir: "./e2e-media",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  // A clip is a minute or two of real typing and dragging, then an encode.
  timeout: 300_000,
  use: {
    baseURL: "http://localhost:3200",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Built every run, as in the PWA config: a stale `.output` would record the
    // previous commit's app.
    command: "bun run build && node .output/server/index.mjs",
    url: "http://localhost:3200",
    env: { PORT: "3200" },
    // A server already running is used when asked for, to record again without a
    // build; a stale one is the reason this is not the default.
    reuseExistingServer: process.env["REUSE_SERVER"] !== undefined,
    timeout: 300_000,
  },
});
