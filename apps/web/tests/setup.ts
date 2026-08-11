import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// vitest.config.ts runs with globals:false, so Testing Library's implicit
// afterEach(cleanup) never registers — do it explicitly or DOM accumulates
// across `it()` blocks in the same file.
afterEach(() => {
  cleanup();
});

// jsdom implements no CSS media queries, so `window.matchMedia` is absent.
// The workstation uses it to decide which dock presentation to mount (see
// use-viewport.ts), so without this every component test that renders the
// shell throws. Defaults to matching — the same desktop-first assumption the
// hook itself makes on the server.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
