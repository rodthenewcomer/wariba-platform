import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig.json's "jsx": "preserve" is correct for Next.js (its own SWC
  // compiler does the real transform) but esbuild — what Vite/Vitest uses —
  // falls back to the classic transform (React.createElement, requiring
  // `React` in scope) when it reads "preserve" from tsconfig. Every test
  // here was a plain .test.ts file until Prompt 7 Appendix 07-C's first
  // .test.tsx files, so nothing had exercised this path before. Automatic
  // runtime matches what Next.js's own compiler already does everywhere else.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: false,
    // tests/e2e is Playwright's tree, not vitest's — it has its own runner/config.
    exclude: ['node_modules/**', 'tests/e2e/**'],
  },
});
