import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX price plates — that they are drawn, and that they are true.
 *
 * ## Why this spec exists
 *
 * A tail of WariX specs failed for a week on "no price plate", and the reading
 * of that was a chart bug: `priceScaleWidth` starts at `0`, one effect sets it,
 * therefore it must be staying `0`. It was not. The scale measures 68 px on a
 * hydrated chart every time. The plate list was *empty*, because the harness
 * paired a mock realtime feed with a real vendor history archive; the service
 * refused to splice a ~700 bps gap, nothing was attached, and a chart with no
 * live price correctly plates nothing.
 *
 * Every symptom of that pointed at the renderer and none of it was the
 * renderer's doing. So this spec asserts the two things that were actually in
 * question, on the surface a trader sees: the plate appears once there is a
 * price, and the number on it is the price the product already published
 * elsewhere — never one derived from where the plate ended up sitting.
 *
 * It is deliberately cheap. The motion, collision and geometry behaviour is
 * proved by `warix-vx1d-motion`, `warix-vx1a1-polish` and
 * `warix-vx1d1-geometry`; this one exists so that "the plates are gone" is
 * reported as one legible failure instead of a dozen scattered ones.
 */
const PRICE_AT_INSTRUMENT_PRECISION = /^\d+\.\d{2,5}$/;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/hub/, { timeout: 60_000 });
}

async function openWorkstation(page: Page): Promise<void> {
  await page.goto('/trade');
  await expect(page.getByTestId('workstation-shell')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('chart-history-status')).toHaveAttribute(
    'data-history-status',
    'ready',
    { timeout: 60_000 },
  );
}

/** The strip, its measured width, and the live plate — the three things that were in doubt. */
async function expectPlatesDrawn(page: Page, where: string): Promise<void> {
  const strip = page.getByTestId('chart-price-scale-plates');
  await expect(strip, `${where}: the plate strip is drawn`).toBeVisible({ timeout: 60_000 });

  const width = await strip.evaluate((node) => node.getBoundingClientRect().width);
  expect(width, `${where}: the strip is measured from the real price scale`).toBeGreaterThan(0);

  await expect(
    page.getByTestId('chart-price-plate-current'),
    `${where}: the live price is plated`,
  ).toBeVisible({ timeout: 60_000 });
}

test.describe('WariX price plates', { tag: ['@warix-price-plates'] }, () => {
  test('are drawn on a hydrated chart, and survive a symbol switch and a resize', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(180_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkstation(page);

    await expectPlatesDrawn(page, 'hydration');

    /*
     * Price truth (§1.3). Both values are read in one evaluation, so they come
     * from the same committed render: the plate must carry the number the
     * legend is already showing, at the instrument's own precision. A plate
     * that derived its value from its pixel position — or that interpolated
     * one while animating — would disagree here.
     */
    const sample = await page.evaluate(() => {
      const plate = document.querySelector('[data-testid="chart-price-plate-current"]');
      const legend = document.querySelector('[data-testid="chart-ohlc-legend"]');
      const close = legend?.textContent?.trim().split(/\s+/).slice(-1)[0] ?? null;
      return { plate: plate?.textContent?.trim() ?? null, close };
    });
    expect(sample.plate).toMatch(PRICE_AT_INSTRUMENT_PRECISION);
    expect(sample.plate, 'the plate prints the published close, not a derived value').toBe(
      sample.close,
    );

    // A symbol switch rebuilds the series and the scale; the plates must come back.
    await page.getByTestId('chart-symbol-search-trigger').click();
    await expect(page.getByTestId('symbol-search-modal')).toBeVisible();
    await page.getByTestId('symbol-search-result-GBPUSD').click();
    await expect(page.getByTestId('symbol-search-modal')).toBeHidden();
    await expect(page.getByTestId('chart-history-status')).toHaveAttribute(
      'data-history-status',
      'ready',
      { timeout: 60_000 },
    );
    await expectPlatesDrawn(page, 'after a symbol switch');

    // A resize re-measures the scale. Narrower, then wider than it started.
    await page.setViewportSize({ width: 1100, height: 800 });
    await expectPlatesDrawn(page, 'after narrowing');
    await page.setViewportSize({ width: 1680, height: 1000 });
    await expectPlatesDrawn(page, 'after widening');
  });

  test('are drawn on a phone @mobile', async ({ page, tradeAccount }) => {
    test.setTimeout(180_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);
    await expectPlatesDrawn(page, 'mobile');
  });
});
