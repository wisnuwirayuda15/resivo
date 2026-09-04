import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end config.
 *
 * These tests exist for the part of Resivo the unit tests cannot reach. The
 * model, the codecs, the paginator and the sanitizer are pure and covered; what
 * was never covered is everything that only exists in a browser, a Mantine
 * modal, a Monaco editor laying itself out, the preview iframe, a drag on the
 * paper, IndexedDB surviving a reload.
 *
 * Chromium only, deliberately. The point here is the workflow, not browser
 * differences, and print-to-PDF (the one place where browsers genuinely differ
 * for this app) is the browser's own dialog and out of reach either way.
 *
 * The dev server is used rather than a production build: it is what the tests
 * are usually run against while working, and the difference between the two is
 * bundling, which these tests are not about.
 */
export default defineConfig({
  testDir: './e2e',
  // Serial. Every test shares one IndexedDB origin, so two of them writing
  // resumes at once would see each other's rows.
  workers: 1,
  fullyParallel: false,
  // Locally a failure is something to look at, not to paper over. In CI one
  // retry absorbs a genuinely flaky first paint without hiding a real break.
  retries: process.env.CI === undefined ? 0 : 1,
  reporter: process.env.CI === undefined ? 'list' : [['list'], ['html']],
  use: {
    baseURL: 'http://localhost:3000',
    // Kept only for a failure: a trace of every passing run is a lot of disk
    // for something nobody opens.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    // A dev server already running is reused, so a watch-mode session and a test
    // run do not fight over the port.
    reuseExistingServer: true,
    // Cold start compiles Monaco and the icon catalog.
    timeout: 120_000,
  },
})
