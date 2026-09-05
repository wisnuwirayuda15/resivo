import { defineConfig, devices } from "@playwright/test";

/**
 * The one suite that has to run against a real build.
 *
 * `playwright.config.ts` uses the dev server on purpose, and says why: the
 * difference between the two is bundling, and those tests are not about
 * bundling. The service worker is the exception. It is registered only in a
 * production build (a worker caching Vite's unhashed dev modules would look
 * like the app ignoring a saved edit), and what it caches are hashed asset URLs
 * that exist only after a build. Run against `bun run dev` this spec would pass
 * by testing nothing.
 *
 * So: its own config, its own port, `bun run test:e2e:pwa`. Kept out of the
 * main suite because it costs a full build, and the main suite is run on every
 * change.
 */
export default defineConfig({
  testDir: "./e2e-pwa",
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI === undefined ? 0 : 1,
  reporter: process.env.CI === undefined ? "list" : [["list"], ["html"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Built every run rather than assumed. A stale `.output` would test the
    // previous commit's worker and report it as this one's.
    command: "bun run build && node .output/server/index.mjs",
    url: "http://localhost:3100",
    env: { PORT: "3100" },
    // Not reused: a server already on this port could be serving anything.
    reuseExistingServer: false,
    // A cold build compiles Monaco and the icon catalog before the server
    // starts listening.
    timeout: 300_000,
  },
});
