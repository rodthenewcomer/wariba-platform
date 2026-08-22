import { mkdirSync, writeFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX WX3 — genuine provider history, proved in the mounted workstation.
 *
 * WX3 §66 is explicit that the phase is not done because an adapter unit test
 * passes. It is done when real market history reaches the chart a trader
 * actually looks at. That is what this spec measures, and every number it
 * writes into the manifest is read off the product's own surface rather than
 * asserted by the test.
 *
 * Nothing here seeds candles, injects OHLC or manipulates local state. If the
 * configured provider has no archive, these assertions fail — which is the
 * correct outcome, because a passing run is supposed to mean the archive is
 * genuinely there.
 */
// Relative to apps/web, which is where Playwright runs — the evidence itself
// belongs at the repository root alongside every other WariX review folder.
const OUT_DIR = '../../docs/04-ux/evidence/warix-wx3-production-history';

interface TimeframeEvidence {
  timeframe: string;
  candles: number;
  sourceEpoch: string;
  hasMoreOlder: string;
  oldestBar: string | null;
  newestBar: string | null;
  realtimeContinuation: string | null;
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 60_000 });
  // Login lands on the hub; the workstation lives at /trade.
  await page.goto('/trade');
}

/**
 * The lowest bar count that can honestly be called "meaningful history".
 *
 * Deliberately far above one. The failure WX3 exists to fix is a chart showing
 * a single giant candle because the cache held one observation, so a threshold
 * of "more than a handful" would pass on exactly the state being fixed.
 */
const MEANINGFUL_BARS = 100;

function chartOf(page: Page): Locator {
  return page.getByRole('group', { name: /Graphique/ });
}

async function readEvidence(page: Page, timeframe: string): Promise<TimeframeEvidence> {
  const status = page.getByTestId('chart-history-status');
  const chart = chartOf(page);
  const bars = await page.evaluate(() => {
    const element = document.querySelector('[data-testid="chart-history-status"]');
    return {
      oldest: element?.getAttribute('data-history-oldest') ?? null,
      newest: element?.getAttribute('data-history-newest') ?? null,
      continuation: element?.getAttribute('data-history-continuation') ?? null,
    };
  });
  return {
    timeframe,
    candles: Number((await status.getAttribute('data-history-candles')) ?? '0'),
    sourceEpoch: (await status.getAttribute('data-history-epoch')) ?? '',
    hasMoreOlder: (await chart.getAttribute('data-history-has-more-older')) ?? '',
    oldestBar: bars.oldest,
    newestBar: bars.newest,
    realtimeContinuation: bars.continuation,
  };
}

/**
 * Selects a timeframe on either shell, then waits for hydration to settle.
 *
 * At 390px the accepted WX1 toolbar exposes only the first few intervals as
 * radios and moves the rest behind an "Autres intervalles" overflow. The test
 * adapts to that design rather than asking for it to change — WX3 freezes the
 * mobile shell.
 */
async function selectTimeframe(page: Page, timeframe: string): Promise<void> {
  const radio = page.getByRole('radio', { name: timeframe, exact: true });
  if ((await radio.count()) === 0) {
    await page.getByRole('button', { name: /Autres intervalles/ }).click();
    const overflowOption = page
      .getByRole('menuitemradio', { name: timeframe, exact: true })
      .or(page.getByRole('radio', { name: timeframe, exact: true }))
      .or(page.getByRole('button', { name: timeframe, exact: true }));
    await overflowOption.first().click();
  } else {
    await radio.click();
  }
  await expect(page.getByRole('radio', { name: timeframe, exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect
    .poll(
      async () =>
        Number(
          (await page.getByTestId('chart-history-status').getAttribute('data-history-candles')) ??
            '0',
        ),
      { timeout: 90_000, message: `${timeframe} never hydrated with genuine bars` },
    )
    .toBeGreaterThan(MEANINGFUL_BARS);
  // Let any hydration-time older page settle so screenshots show a stable series.
  await page.waitForTimeout(1_500);
}

test.describe('WariX WX3 production history', { tag: ['@warix-wx3-evidence'] }, () => {
  test('every timeframe opens on genuine provider history', async ({ page, tradeAccount }) => {
    test.setTimeout(900_000);
    mkdirSync(OUT_DIR, { recursive: true });
    const manifest: TimeframeEvidence[] = [];

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(chartOf(page)).toBeVisible({ timeout: 60_000 });

    const shots: Record<string, string> = {
      '1m': '01-1440-1m-deep-history.png',
      '5m': '02-1440-5m-deep-history.png',
      '1D': '03-1440-1d-production-history.png',
      '1W': '04-1440-1w-production-history.png',
      '1M': '05-1440-1M-calendar-month-history.png',
    };

    for (const [timeframe, file] of Object.entries(shots)) {
      await selectTimeframe(page, timeframe);
      const evidence = await readEvidence(page, timeframe);
      manifest.push(evidence);
      // Move the pointer off the canvas so no crosshair is baked into evidence.
      await page.mouse.move(20, 20);
      await page.screenshot({ path: `${OUT_DIR}/${file}` });
      expect(evidence.candles).toBeGreaterThan(MEANINGFUL_BARS);
    }

    // §74 — the calendar intervals must show structure, not one giant candle.
    const weekly = manifest.find((entry) => entry.timeframe === '1W');
    const monthly = manifest.find((entry) => entry.timeframe === '1M');
    expect(weekly?.candles ?? 0).toBeGreaterThan(MEANINGFUL_BARS);
    expect(monthly?.candles ?? 0).toBeGreaterThan(MEANINGFUL_BARS);

    writeFileSync(
      `${OUT_DIR}/manifest-desktop.json`,
      `${JSON.stringify({ viewport: '1440x900', timeframes: manifest }, null, 2)}\n`,
    );
  });

  test('scrolling left loads genuinely older bars without moving the viewport', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(900_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectTimeframe(page, '1D');

    const chart = chartOf(page);
    const box = await chart.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) return;

    const before = await readEvidence(page, '1D');
    await page.mouse.move(20, 20);
    await page.screenshot({ path: `${OUT_DIR}/06-1440-before-left-pagination.png` });

    /**
     * The ruler is the chart's own visible logical range, written to the DOM by
     * the time-scale subscription. A correct prepend shifts that range by
     * exactly the number of bars added, so the *width* stays constant and the
     * window does not snap back to the live edge. Reading the chart's own
     * geometry avoids coupling this proof to whichever drawing tool happens to
     * exist in the rail.
     */
    const viewport = async (): Promise<{ from: number; to: number } | null> =>
      page.evaluate(() => {
        const node = document.querySelector('[data-visible-from]');
        const from = node?.getAttribute('data-visible-from');
        const to = node?.getAttribute('data-visible-to');
        return from === null || from === undefined || to === null || to === undefined
          ? null
          : { from: Number(from), to: Number(to) };
      });

    const pan = async (pixels: number): Promise<void> => {
      const startX = box.x + box.width * 0.35;
      const y = box.y + box.height * 0.5;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(startX + pixels, y, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(250);
    };

    const viewportBefore = await viewport();
    let candlesAfter = before.candles;
    for (let step = 0; step < 40 && candlesAfter <= before.candles; step += 1) {
      await pan(90);
      candlesAfter = Number(
        (await page.getByTestId('chart-history-status').getAttribute('data-history-candles')) ??
          '0',
      );
    }
    const viewportAfter = await viewport();
    const after = await readEvidence(page, '1D');
    await page.mouse.move(20, 20);
    await page.screenshot({ path: `${OUT_DIR}/07-1440-after-left-pagination.png` });

    // The left edge genuinely moved back into older market history.
    expect(after.candles).toBeGreaterThan(before.candles);
    expect(after.sourceEpoch).toBe(before.sourceEpoch);
    if (before.oldestBar !== null && after.oldestBar !== null) {
      expect(Number(after.oldestBar)).toBeLessThan(Number(before.oldestBar));
    }
    // §20 — the prepend must not yank the trader to the live edge. The window
    // keeps its width; only its position in the (now longer) series changes.
    if (viewportBefore !== null && viewportAfter !== null) {
      const widthBefore = viewportBefore.to - viewportBefore.from;
      const widthAfter = viewportAfter.to - viewportAfter.from;
      expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(widthBefore * 0.25);
    }

    writeFileSync(
      `${OUT_DIR}/manifest-pagination.json`,
      `${JSON.stringify(
        { before, after, viewportBefore, viewportAfter, screen: '1440x900' },
        null,
        2,
      )}\n`,
    );
  });

  test('opening the Market Navigator does not reset the chart', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectTimeframe(page, '1D');
    const before = await readEvidence(page, '1D');

    await page.getByRole('button', { name: /March/ }).first().click();
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: `${OUT_DIR}/10-1440-markets-drawer-history-preserved.png` });

    const after = await readEvidence(page, '1D');
    expect(after.sourceEpoch).toBe(before.sourceEpoch);
    expect(after.candles).toBeGreaterThanOrEqual(before.candles);
  });

  test('@mobile a 390px chart receives the same history', async ({ page, tradeAccount }) => {
    test.setTimeout(900_000);
    mkdirSync(OUT_DIR, { recursive: true });
    const manifest: TimeframeEvidence[] = [];

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await expect(chartOf(page)).toBeVisible({ timeout: 60_000 });

    await selectTimeframe(page, '5m');
    manifest.push(await readEvidence(page, '5m'));
    await page.screenshot({ path: `${OUT_DIR}/11-390-5m-deep-history.png` });

    await selectTimeframe(page, '1D');
    const beforeMobile = await readEvidence(page, '1D');
    manifest.push(beforeMobile);
    await page.screenshot({ path: `${OUT_DIR}/12-390-1d-history.png` });

    const chart = chartOf(page);
    const box = await chart.boundingBox();
    if (box !== null) {
      let candles = beforeMobile.candles;
      for (let step = 0; step < 40 && candles <= beforeMobile.candles; step += 1) {
        const startX = box.x + box.width * 0.3;
        const y = box.y + box.height * 0.5;
        await page.mouse.move(startX, y);
        await page.mouse.down();
        await page.mouse.move(startX + 70, y, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(250);
        candles = Number(
          (await page.getByTestId('chart-history-status').getAttribute('data-history-candles')) ??
            '0',
        );
      }
      const afterMobile = await readEvidence(page, '1D');
      manifest.push({ ...afterMobile, timeframe: '1D-after-pagination' });
      await page.screenshot({ path: `${OUT_DIR}/13-390-after-left-pagination.png` });
      expect(afterMobile.candles).toBeGreaterThan(beforeMobile.candles);
      expect(afterMobile.sourceEpoch).toBe(beforeMobile.sourceEpoch);
    }

    writeFileSync(
      `${OUT_DIR}/manifest-mobile.json`,
      `${JSON.stringify({ viewport: '390x844', timeframes: manifest }, null, 2)}\n`,
    );
  });
});
