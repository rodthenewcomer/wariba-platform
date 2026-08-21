import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// vitest.config.ts runs with globals:false, so Testing Library's implicit
// afterEach(cleanup) never registers — do it explicitly or DOM accumulates
// across `it()` blocks in the same file.
afterEach(() => {
  cleanup();
});

/**
 * jsdom implements no CSS media queries, so `window.matchMedia` is absent and
 * every component test that renders the workstation shell would throw.
 *
 * This stub answers from `window.innerWidth` rather than returning `true` to
 * everything. The blanket-true version was adequate while `use-viewport.ts`
 * asked exactly one question ("is this desktop?"), but the visual closure added
 * a second with the opposite intent — "is this the 1024–1279 hybrid band?" —
 * and a stub that agrees with both at once put the workstation in two states
 * simultaneously: desktop *and* hybrid, so the Market Navigator rendered
 * collapsed in tests that were reading its rows.
 *
 * Parsing the width bounds is what makes a test's declared viewport
 * (`window.innerWidth = 1440`) actually mean something. Queries without a width
 * bound keep the previous desktop-first default.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  const matchesQuery = (query: string): boolean => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /max-width:\s*(\d+)px/.exec(query);
    if (!min && !max) return true;
    const width = window.innerWidth;
    if (min && width < Number(min[1])) return false;
    if (max && width > Number(max[1])) return false;
    return true;
  };

  window.matchMedia = (query: string): MediaQueryList =>
    ({
      get matches() {
        return matchesQuery(query);
      },
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
