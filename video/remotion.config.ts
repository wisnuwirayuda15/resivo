import { resolve } from "node:path";

import { Config } from "@remotion/cli/config";

/**
 * The video reuses the app's own modules (the document model, the Markdown
 * codec, the template renderer, the ATS rules), so it resolves `@/` and `#/`
 * to `../src` exactly as the app does.
 *
 * Two things differ from Vite, which is what the app is built with:
 *
 * - `?raw` is a Vite suffix. The template registry and the preview stylesheet
 *   read their CSS that way, so the suffix is mapped to webpack's own
 *   `asset/source`. It sits in a `oneOf` ahead of Remotion's rules, because
 *   Remotion's CSS rule would otherwise also match `paper.css?raw` and hand the
 *   text to the CSS loader.
- Packages are looked up in `video/node_modules` first. A file under `../src`
 *   would otherwise find the app's copy of React, and two copies of React in
 *   one tree break hooks.
 */
const app = resolve(process.cwd(), "..", "src");

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setAudioCodec("aac");
Config.setAudioBitrate("192k");
Config.setOverwriteOutput(true);

Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    modules: [
      resolve(process.cwd(), "node_modules"),
      ...(config.resolve?.modules ?? ["node_modules"]),
    ],
    alias: {
      ...config.resolve?.alias,
      "@": app,
      "#": app,
    },
  },
  module: {
    ...config.module,
    rules: [
      {
        oneOf: [
          { resourceQuery: /raw/, type: "asset/source" },
          {
            rules: (config.module?.rules ?? []).filter(
              (rule) => rule !== "...",
            ),
          },
        ],
      },
    ],
  },
}));
