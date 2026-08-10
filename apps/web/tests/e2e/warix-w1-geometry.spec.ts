import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect } from './fixtures';

/**
 * WariX Workstation 2026 — W1 geometry evidence.
 *
 * The mirror of `warix-w0-baseline.spec.ts`: same viewports, same
 * measurements, written to a **separate** directory so the W0 baseline is
 * never overwritten. Screenshots are evidence for review, not a pixel-diff
 * gate; the assertions here are only the invariants W1 §15/§20 state.
 *
 * Not part of any gate — run explicitly:
 *   pnpm --filter @wariba/web exec playwright test tests/e2e/warix-w1-geometry.spec.ts --project=desktop
 */
const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '2560x1440', width: 2560, height: 1440 },
  { name: '390x844', width: 390, height: 844 },
] as const;

const OUT_DIR = 'test-results/warix-w1-geometry';

test.describe('WariX W1 geometry', { tag: ['@warix-w1-evidence'] }, () => {
  test('records workstation geometry and screenshots', async ({ page, tradeAccount }) => {
    mkdirSync(OUT_DIR, { recursive: true });

    await page.goto('/login');
    await page.getByLabel('Adresse email').fill(tradeAccount.email);
    await page.getByLabel('Mot de passe').fill(tradeAccount.password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/hub', { timeout: 30_000 });

    const measurements: Record<string, unknown>[] = [];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/trade');
      await expect(page.getByRole('group', { name: /Graphique/ }).first()).toBeVisible({
        timeout: 30_000,
      });
      // The ResizeObserver settles a frame after the grid lays out. Wait for
      // the canvas box to actually stop changing rather than for a fixed
      // delay — a sleep would either be flaky or slower than it needs to be,
      // and these numbers are the evidence this file exists to produce.
      await expect
        .poll(
          async () => {
            const first = await page.evaluate(
              () => document.querySelector('canvas')?.getBoundingClientRect().height ?? 0,
            );
            await page.evaluate(
              () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
            );
            const second = await page.evaluate(
              () => document.querySelector('canvas')?.getBoundingClientRect().height ?? 0,
            );
            return first > 0 && first === second ? first : 0;
          },
          { timeout: 10_000 },
        )
        .toBeGreaterThan(0);

      const geometry = await page.evaluate(() => {
        const box = (el: Element | null) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
        };
        return {
          viewportHeight: window.innerHeight,
          documentScrollHeight: document.documentElement.scrollHeight,
          documentScrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
          statusBar: box(document.querySelector('[data-testid="workstation-status-bar"]')),
          navRail: box(document.querySelector('[data-testid="workstation-nav-rail"]')),
          dock: box(document.querySelector('[data-testid="workstation-dock"]')),
          chartCanvas: box(document.querySelector('canvas')),
        };
      });

      measurements.push({ viewport: viewport.name, ...geometry });
      await page.screenshot({
        path: `${OUT_DIR}/warix-w1-${viewport.name}.png`,
        fullPage: false,
      });
    }

    writeFileSync(`${OUT_DIR}/geometry.json`, JSON.stringify(measurements, null, 2));
    // eslint-disable-next-line no-console
    console.log('WARIX_W1_GEOMETRY=' + JSON.stringify(measurements, null, 2));

    const desktop = measurements.filter((m) => m.viewport !== '390x844');
    const chartHeights = desktop.map((m) => (m.chartCanvas as { h: number } | null)?.h ?? 0);

    // W0: 332 at every desktop resolution. The invariant is that available
    // viewport height reaches the chart.
    expect(new Set(chartHeights).size).toBeGreaterThan(1);
    expect(Math.min(...chartHeights)).toBeGreaterThan(332);

    for (const measurement of measurements) {
      expect(
        measurement.documentScrollWidth,
        `horizontal overflow at ${measurement.viewport}`,
      ).toBe(measurement.clientWidth);
      const statusHeight = (measurement.statusBar as { h: number } | null)?.h ?? 0;
      expect(statusHeight, `status bar too tall at ${measurement.viewport}`).toBeLessThanOrEqual(
        56,
      );
    }
  });
});
