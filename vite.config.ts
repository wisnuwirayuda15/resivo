import { devtools } from "@tanstack/devtools-vite";
import { defineConfig } from "vite";

import type { Plugin } from "vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import mantineTheme from "tailwind-preset-mantine/vite";
import svgr from "vite-plugin-svgr";

/**
 * Keeps Vite from claiming a docs page's `.md` address in development.
 *
 * Vite treats any URL ending in `.md` as a module to transform and answers 404
 * when no such file exists, so the Markdown of a page (`/en/docs/x.md`) never
 * reached the app. A trailing slash makes the URL stop looking like a source
 * file, and the app's own parser accepts it. Production has no such middleware,
 * so this is development only and changes nothing about the public address.
 */
const docsMarkdownDev = (): Plugin => ({
  name: "resivo:docs-markdown-dev",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (
        req.url !== undefined &&
        /^\/[^/?]+\/docs\/[^?]*\.md(?:\?|$)/.test(req.url)
      ) {
        req.url = req.url.replace(/\.md(\?|$)/, ".md/$1");
      }

      next();
    });
  },
});

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // First, so the macro in `features/docs/source.ts` is rewritten before any
    // other plugin reads the module, and the MDX it points at is compiled.
    // `index: false` because the collections are declared with the macro, which
    // needs no generated `.source` folder; leaving it on writes three empty stubs.
    fumadocsMdx({ index: false }),
    docsMarkdownDev(),
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    svgr(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
    // Regenerates src/styles/theme.css from the Mantine theme (never hand-edit it).
    mantineTheme({ input: "./src/styles/theme.ts" }),
  ],
});

export default config;
