import { mkdirSync } from 'node:fs';
import { test, expect } from './fixtures';

/**
 * WariX Workstation 2026 — W0 forensic baseline.
 *
 * Measures the *rendered* geometry of the current terminal at the four
 * desktop widths in the audit brief plus one phone width, and captures a
 * screenshot of each for before/after comparison. Nothing here asserts a
 * target: this run records what exists today so the redesign can be judged
 * against a measurement rather than a memory.
 *
 * Not part of any gate — run explicitly:
 *   pnpm --filter @wariba/web exec playwright test tests/e2e/warix-w0-baseline.spec.ts --project=desktop
 */
const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '2560x1440', width: 2560, height: 1440 },
  { name: '390x844', width: 390, height: 844 },
] as const;

const OUT_DIR = 'test-results/warix-w0-baseline';

test.describe('WariX W0 baseline', { tag: ['@warix-baseline'] }, () => {
  test('records current terminal geometry and screenshots', async ({ page, tradeAccount }) => {
    // W1 §28 — the W0 baseline is a historical capture of the *pre-W1*
    // terminal. Re-running it after the shell landed would overwrite that
    // evidence with post-refactor numbers still labelled "current", which is
    // worse than having no files at all. The W0 measurements live in
    // docs/04-ux/WARIX_Workstation_2026_W0_Audit.md §3C; W1's own numbers are
    // captured separately by warix-w1-geometry.spec.ts.
    test.skip(
      process.env.WARIX_CAPTURE_W0_BASELINE !== '1',
      'Historical pre-W1 capture — set WARIX_CAPTURE_W0_BASELINE=1 against a pre-W1 checkout to re-record.',
    );
    mkdirSync(OUT_DIR, { recursive: true });

    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(tradeAccount.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(tradeAccount.password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/hub', { timeout: 30_000 });

    const measurements: Record<string, unknown>[] = [];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/trade');
      // The chart canvas is the last thing to settle; waiting on it means
      // the geometry below is the steady state, not first paint.
      await expect(page.getByRole('group', { name: /graphique|chart/i }).first()).toBeVisible({
        timeout: 30_000,
      });

      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
        };
        const root = document.querySelector('[data-wariba-section="trade"]');
        const header = root?.querySelector(':scope > div > div:nth-child(2)');
        const headerRect = header?.getBoundingClientRect();
        return {
          viewportHeight: window.innerHeight,
          documentScrollHeight: document.documentElement.scrollHeight,
          documentScrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          headerBlock: headerRect
            ? { h: Math.round(headerRect.height), bottom: Math.round(headerRect.bottom) }
            : null,
          watchlist: rect('aside'),
          chartCanvas: rect('canvas'),
          table: rect('table'),
        };
      });

      measurements.push({ viewport: viewport.name, ...geometry });
      await page.screenshot({
        path: `${OUT_DIR}/warix-current-${viewport.name}.png`,
        fullPage: false,
      });
    }

    // eslint-disable-next-line no-console
    console.log('WARIX_W0_GEOMETRY=' + JSON.stringify(measurements, null, 2));
    expect(measurements).toHaveLength(VIEWPORTS.length);
  });
});
