import { devtools } from "@tanstack/devtools-vite";
import { defineConfig } from "vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import mantineTheme from "tailwind-preset-mantine/vite";
import svgr from "vite-plugin-svgr";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // First, so the macro in `features/docs/source.ts` is rewritten before any
    // other plugin reads the module, and the MDX it points at is compiled.
    // `index: false` because the collections are declared with the macro, which
    // needs no generated `.source` folder; leaving it on writes three empty stubs.
    fumadocsMdx({ index: false }),
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
