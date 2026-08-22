import { mkdirSync } from 'node:fs';
import { expect, test } from './fixtures';

/**
 * WariX Workstation 2026 — W2 human-review visual evidence.
 *
 * Captures the states a reviewer asked to see, and nothing else: it changes no
 * product behaviour, asserts no pixels, and is **not** part of any gate. Run
 * explicitly:
 *
 *   pnpm --filter @wariba/web exec playwright test \
 *     tests/e2e/warix-w2-review-evidence.spec.ts --project=desktop
 *
 * Output goes to its own directory so the W0 baseline
 * (`test-results/warix-w0-baseline/`) and the W1 geometry evidence
 * (`test-results/warix-w1-geometry/`) are never overwritten.
 */
const OUT_DIR = 'test-results/warix-w2-review';

test.describe('WariX W2 review evidence', { tag: ['@warix-w2-evidence'] }, () => {
  test('captures the workstation states for human review', async ({ page, tradeAccount }) => {
    mkdirSync(OUT_DIR, { recursive: true });

    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(tradeAccount.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(tradeAccount.password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/hub', { timeout: 30_000 });

    /** Waits for the workstation to be genuinely settled before a shot. */
    const openWorkstation = async () => {
      await page.goto('/trade');
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      // A connected socket is not a populated workstation: the symbol specs
      // and the first snapshot arrive after it. Capturing before they land
      // produces evidence of an empty navigator and em-dash metrics, which
      // would misrepresent the milestone. The market trigger shows a real
      // quote only once ticks flow, and it is present at every width.
      await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —', {
        timeout: 30_000,
      });
      const canvas = page
        .getByRole('group', { name: /Graphique/ })
        .locator('canvas')
        .first();
      await expect(canvas).toBeVisible({ timeout: 30_000 });
      // The chart's ResizeObserver settles a frame after layout; wait for the
      // box to stop moving rather than for a fixed delay.
      await expect
        .poll(
          async () => {
            const first = (await canvas.boundingBox())?.height ?? 0;
            await page.evaluate(
              () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
            );
            const second = (await canvas.boundingBox())?.height ?? 0;
            return first > 0 && first === second ? first : 0;
          },
          { timeout: 10_000 },
        )
        .toBeGreaterThan(0);
    };

    const shot = async (name: string) => {
      await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
    };

    // ---- 1440×900 ------------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkstation();
    await expect(page.getByRole('heading', { name: 'Forex' })).toBeVisible();
    await shot('1440x900-default-workspace');

    await page.getByTestId('navigator-collapse').click();
    await expect(page.getByTestId('navigator-restore')).toBeVisible();
    await shot('1440x900-navigator-collapsed');

    await page.getByTestId('navigator-restore').click();
    await expect(page.getByTestId('market-navigator').first()).toBeVisible();
    await page.getByRole('tab', { name: /^Exécutions/ }).click();
    await expect(page.getByRole('columnheader', { name: 'PnL éligible' })).toBeVisible();
    await shot('1440x900-dock-expanded-trades');

    // ---- 1920×1080 -----------------------------------------------------
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openWorkstation();
    await shot('1920x1080-default-workstation');

    // ---- 390×844 -------------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkstation();
    await shot('390x844-chart-first-default');

    await page.getByTestId('mobile-market-trigger').click();
    await expect(page.getByRole('dialog').getByTestId('market-search')).toBeVisible();
    await shot('390x844-market-navigator-sheet');
    await page.keyboard.press('Escape');

    await page.getByTestId('mobile-dock-trigger').click();
    await expect(page.getByRole('tab', { name: /^Positions/ })).toBeVisible();
    await shot('390x844-trading-dock-sheet');

    // Evidence only — the assertion merely proves the run reached the end.
    expect(true).toBe(true);
  });
});
