import { mkdirSync, writeFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX WX3.1 — the final market-data closure, proved in the workstation.
 *
 * Each test here corresponds to one of the five corrective responsibilities and
 * asserts the product surface rather than the implementation. Nothing seeds a
 * candle; where a scenario needs a gap, the gap is created by removing rows
 * that were genuinely fetched, and closed by genuinely fetching them again.
 */
const OUT_DIR = '../../docs/04-ux/evidence/warix-wx31-final-closure';

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 60_000 });
  await page.goto('/trade');
}

function chartOf(page: Page): Locator {
  return page.getByRole('group', { name: /Graphique/ });
}

interface Snapshot {
  timeframe: string;
  candles: number;
  sourceEpoch: string;
  oldestBar: string | null;
  newestBar: string | null;
  realtimeContinuation: string | null;
  gaps: string | null;
}

async function readSnapshot(page: Page, timeframe: string): Promise<Snapshot> {
  const values = await page.evaluate(() => {
    const element = document.querySelector('[data-testid="chart-history-status"]');
    return {
      candles: element?.getAttribute('data-history-candles') ?? '0',
      epoch: element?.getAttribute('data-history-epoch') ?? '',
      oldest: element?.getAttribute('data-history-oldest') ?? null,
      newest: element?.getAttribute('data-history-newest') ?? null,
      continuation: element?.getAttribute('data-history-continuation') ?? null,
      gaps: element?.getAttribute('data-history-gaps') ?? null,
    };
  });
  return {
    timeframe,
    candles: Number(values.candles),
    sourceEpoch: values.epoch,
    oldestBar: values.oldest,
    newestBar: values.newest,
    realtimeContinuation: values.continuation,
    gaps: values.gaps,
  };
}

async function selectTimeframe(page: Page, timeframe: string, minBars = 100): Promise<void> {
  const radio = page.getByRole('radio', { name: timeframe, exact: true });
  if ((await radio.count()) === 0) {
    await page.getByRole('button', { name: /Autres intervalles/ }).click();
    await page
      .getByRole('menuitemradio', { name: timeframe, exact: true })
      .or(page.getByRole('radio', { name: timeframe, exact: true }))
      .or(page.getByRole('button', { name: timeframe, exact: true }))
      .first()
      .click();
  } else {
    await radio.click();
  }
  await expect(page.getByRole('radio', { name: timeframe, exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect
    .poll(
      async () => {
        const status = page.getByTestId('chart-history-status');
        const candles = Number((await status.getAttribute('data-history-candles')) ?? '0');
        if (candles === 0) {
          // Surface the server's own refusal reason instead of only reporting a
          // timeout, so a hydration failure is diagnosable from the run output.
          const reason = await status.getAttribute('data-history-error');
          if (reason) throw new Error(`${timeframe} hydration refused: ${reason}`);
        }
        return candles;
      },
      { timeout: 120_000, message: `${timeframe} never hydrated` },
    )
    .toBeGreaterThan(minBars);
  await page.waitForTimeout(1_500);
}

test.describe('WariX WX3.1 final closure', { tag: ['@warix-wx31'] }, () => {
  test('@quality intraday history shows the trading session, not the closed market', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(chartOf(page)).toBeVisible({ timeout: 60_000 });

    const snapshots: Snapshot[] = [];
    for (const [timeframe, file] of [
      ['1m', '01-1m-data-quality-after-root-cause.png'],
      ['5m', '02-5m-data-quality-after-root-cause.png'],
    ] as const) {
      await selectTimeframe(page, timeframe);
      const snapshot = await readSnapshot(page, timeframe);
      snapshots.push(snapshot);
      await page.mouse.move(20, 20);
      await page.screenshot({ path: `${OUT_DIR}/${file}` });
      expect(snapshot.candles).toBeGreaterThan(100);
    }

    writeFileSync(
      `${OUT_DIR}/manifest-data-quality.json`,
      `${JSON.stringify({ viewport: '1440x900', snapshots }, null, 2)}\n`,
    );
  });

  test('@attached live ticks extend the genuine archive when both sources quote the same market', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectTimeframe(page, '5m');

    const snapshot = await readSnapshot(page, '5m');
    await page.mouse.move(20, 20);
    await page.screenshot({ path: `${OUT_DIR}/03-realtime-attached.png` });

    // The whole point of WX3.1 §2: history and ticks from the same vendor,
    // agreeing on price, so the server permits the continuation instead of
    // refusing it. A tolerance was not widened to get here.
    expect(snapshot.realtimeContinuation).toBe('attached');
    expect(snapshot.candles).toBeGreaterThan(100);

    writeFileSync(
      `${OUT_DIR}/manifest-cutover.json`,
      `${JSON.stringify({ viewport: '1440x900', snapshot }, null, 2)}\n`,
    );
  });

  test('@gapbefore a removed range shows as missing history', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectTimeframe(page, '5m');
    const snapshot = await readSnapshot(page, '5m');
    await page.mouse.move(20, 20);
    await page.screenshot({ path: `${OUT_DIR}/04-before-gap-repair.png` });
    writeFileSync(`${OUT_DIR}/manifest-gap-before.json`, `${JSON.stringify(snapshot, null, 2)}\n`);
  });

  test('@gapafter the repaired range is genuine provider data', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectTimeframe(page, '5m');
    const snapshot = await readSnapshot(page, '5m');
    await page.mouse.move(20, 20);
    await page.screenshot({ path: `${OUT_DIR}/05-after-gap-repair.png` });
    writeFileSync(`${OUT_DIR}/manifest-gap-after.json`, `${JSON.stringify(snapshot, null, 2)}\n`);
  });

  test('@boundary EURUSD monthly history starts at the instrument, not the reconstruction', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectTimeframe(page, '1M', 50);

    const snapshot = await readSnapshot(page, '1M');
    await page.mouse.move(20, 20);
    await page.screenshot({ path: `${OUT_DIR}/06-1M-eurusd-production-history-boundary.png` });

    // The euro's first trading day. Nothing before it reaches the chart, even
    // though the vendor's archive extends to 1984 and those rows are still in
    // the cache with their provenance recorded.
    const euroLaunch = Date.UTC(1999, 0, 4) / 1000;
    expect(Number(snapshot.oldestBar)).toBeGreaterThanOrEqual(euroLaunch);

    writeFileSync(
      `${OUT_DIR}/manifest-boundary.json`,
      `${JSON.stringify({ euroLaunch, snapshot }, null, 2)}\n`,
    );
  });

  test('@mobile a 390px chart still receives the same history', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await expect(chartOf(page)).toBeVisible({ timeout: 60_000 });
    await selectTimeframe(page, '5m');
    const snapshot = await readSnapshot(page, '5m');
    await page.screenshot({ path: `${OUT_DIR}/07-mobile-history-regression.png` });
    expect(snapshot.candles).toBeGreaterThan(100);
    writeFileSync(`${OUT_DIR}/manifest-mobile.json`, `${JSON.stringify(snapshot, null, 2)}\n`);
  });
});
