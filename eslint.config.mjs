// @ts-check
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.config.*',
      '!eslint.config.mjs',
      '**/next-env.d.ts',
      // Generated from docs/05-design/tokens.json — see packages/design-tokens/scripts/build.mjs.
      '**/tokens.generated.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@next/next': nextPlugin,
    },
  },
  {
    files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // WARIBA uses App Router only; there is intentionally no pages/ tree.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    // Standalone Node scripts (e.g. packages/*/scripts/*.mjs) run outside any
    // tsconfig lib scope, so plain js.configs.recommended has no globals for
    // them — declare the handful actually used instead of pulling in a new
    // `globals` package dependency for this.
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    rules: {
      // Engineering Constitution §8.2 — no unjustified `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  prettier,
);
