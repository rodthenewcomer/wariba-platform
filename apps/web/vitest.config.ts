import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: false,
    // tests/e2e is Playwright's tree, not vitest's — it has its own runner/config.
    exclude: ['node_modules/**', 'tests/e2e/**'],
  },
});
