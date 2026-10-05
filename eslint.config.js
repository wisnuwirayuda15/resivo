//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config";
import i18next from "eslint-plugin-i18next";

export default [
  ...tanstackConfig,
  {
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
      "pnpm/json-enforce-catalog": "off",
    },
  },
  {
    /**
     * Components take `useTranslation` from `lib/i18n/useTranslation`, not from
     * the library. The two differ in one argument, the language the hook is
     * pinned to, and using the library's by habit renders the wrong language on
     * a component that has not hydrated yet and throws the subtree away. The
     * wrapper file itself, and the instance setup, are the only places that
     * import it.
     */
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/i18n/useTranslation.ts", "src/lib/i18n/index.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-i18next",
              message:
                "Import useTranslation from @/lib/i18n/useTranslation, which is safe across hydration.",
            },
          ],
        },
      ],
    },
  },
  {
    /**
     * Words a person reads go through `t()`. Text between JSX tags is what a
     * migration forgets, and the only kind of literal this can judge without
     * guessing: attributes also carry class names, ids and test hooks, which
     * made the stricter mode report hundreds of non-words. Attribute text is
     * covered by the parity tests instead, which fail on an untranslated
     * sentence in the Indonesian messages.
     */
    files: ["src/**/*.tsx"],
    ignores: ["src/**/*.test.tsx"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-text-only",
          // Replaces the plugin's own exclusions, so the symbol and number
          // patterns it ships with are repeated. The rest are text that is the
          // same in every language: the two file names on the code tabs, the
          // drag and scroll glyphs, and the specimen on a template's swatch.
          words: {
            exclude: [
              "[0-9!-/:-@[-`{-~]+",
              "[A-Z_-]+",
              "^resume\\.md$",
              "^style\\.css$",
              "^Aa$",
              "^[\\u00b7\\u00d7\\u2190-\\u21ff\\u2800-\\u28ff\\u2900-\\u297f]+$",
            ],
          },
        },
      ],
    },
  },
  {
    ignores: [
      "eslint.config.js",
      "prettier.config.js",
      // Build output and generated sources: not typed by tsconfig, so the
      // type-aware parser errors on them rather than linting them.
      ".output/**",
      ".tanstack/**",
      "dist/**",
      "src/routeTree.gen.ts",
      "src/features/icons/*.gen.ts",
      "scripts/**",
      // A separate package that bundles with webpack and is typed by its own
      // tsconfig, so the root's type-aware parser has no project for it.
      "video/**",
      // The service worker is served as it is written, from the origin root, so
      // it is outside the module graph and outside tsconfig with it. Prettier
      // still formats it and a Playwright spec still exercises it.
      "public/sw.js",
    ],
  },
];
