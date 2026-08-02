import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// vitest.config.ts runs with globals:false, so Testing Library's implicit
// afterEach(cleanup) never registers — do it explicitly or DOM accumulates
// across `it()` blocks in the same file.
afterEach(() => {
  cleanup();
});
