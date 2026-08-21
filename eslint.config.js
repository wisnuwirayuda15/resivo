//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      // Build output and generated sources: not typed by tsconfig, so the
      // type-aware parser errors on them rather than linting them.
      '.output/**',
      '.tanstack/**',
      'dist/**',
      'src/routeTree.gen.ts',
      'src/features/icons/catalog.gen.ts',
      'scripts/**',
    ],
  },
]
