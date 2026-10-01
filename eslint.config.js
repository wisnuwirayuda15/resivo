//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config";

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
      // The service worker is served as it is written, from the origin root, so
      // it is outside the module graph and outside tsconfig with it. Prettier
      // still formats it and a Playwright spec still exercises it.
      "public/sw.js",
    ],
  },
];
