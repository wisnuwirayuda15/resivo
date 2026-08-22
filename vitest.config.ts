import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

// `fileURLToPath` rather than `URL.pathname`, which yields a leading-slash
// "/C:/..." path on Windows that Vite cannot resolve.
const src = fileURLToPath(new URL('./src', import.meta.url))

/**
 * Test config, kept separate from `vite.config.ts`.
 *
 * The app's Vite config loads TanStack Start, Nitro, Tailwind and the React
 * Compiler — none of which the unit tests need, and Nitro in particular fights
 * the test runner. The model, codecs, paginator and export adapters are all
 * pure, so they run against plain esbuild transforms.
 *
 * Repository tests that need IndexedDB import `fake-indexeddb/auto` themselves
 * rather than having it installed globally here, so a test that accidentally
 * touches the database is obvious.
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: '@/', replacement: `${src}/` },
      { find: '#/', replacement: `${src}/` },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    /**
     * Vitest stubs CSS imports to an empty module by default, and that stubbing
     * catches `?raw` too. The preview engine injects its stylesheets into the
     * iframe as text, so an empty stub would let a broken import pass every test
     * while leaving the rendered paper unstyled.
     */
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/features/**', 'src/database/**', 'src/lib/**'],
    },
  },
})
