import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BrowserContext, Locator, Page } from '@playwright/test';
import { devices } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The VX1-D.1 harness — trade geometry, and the live candle.
 *
 * **Why this one insists on a short.** A chart full of longs looks correct
 * whichever way the SL/TP rule is written, so an inversion can survive every
 * review that only ever renders a buy. Every geometry scene here is therefore
 * captured twice, once per side, and the ordering is *asserted* from the
 * rendered coordinates rather than left for a reviewer to eyeball:
 *
 *     LONG   →  TP above entry,  SL below entry
 *     SHORT  →  SL above entry,  TP below entry
 *
 * Nothing is fabricated (§41). The prices come from the local realtime
 * service's sandbox feed, the positions are real orders placed through the
 * ticket, and the protective levels are real values accepted by the server.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-vx1d1-geometry');

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

async function hideDevOverlay(page: Page): Promise<void> {
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
}

async function settle(page: Page): Promise<void> {
  await hideDevOverlay(page);
  await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
    'data-connection',
    'open',
    { timeout: 30_000 },
  );
  await expect(page.getByTestId('chart-history-status')).toHaveAttribute(
    'data-history-status',
    'ready',
    { timeout: 60_000 },
  );
  await page.waitForTimeout(1_200);
}

async function centreY(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('expected a rendered trade object');
  return box.y + box.height / 2;
}

/** Open the ticket and read the quote the order will actually reference. */
async function openTicket(page: Page): Promise<{ bid: number; ask: number }> {
  await page.getByTestId('utility-trade').click();
  await expect(page.getByTestId('execution-center')).toBeVisible();
  const bid = Number((await page.getByTestId('execution-bid').textContent())?.match(/[\d.]+/)?.[0]);
  const ask = Number((await page.getByTestId('execution-ask').textContent())?.match(/[\d.]+/)?.[0]);
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) throw new Error('no live quote');
  return { bid, ask };
}

/**
 * Place a real order with real protective levels on the correct sides.
 *
 * The offsets are wide (±40 pips) on purpose: a level a few ticks from the
 * market is legal but gets taken out by the sandbox feed within seconds, and an
 * evidence run that loses its position halfway through proves nothing.
 */
async function openPositionWithProtection(
  page: Page,
  side: 'buy' | 'sell',
): Promise<{ stopLoss: string; takeProfit: string }> {
  const { bid, ask } = await openTicket(page);
  const reference = side === 'buy' ? ask : bid;
  const stopLoss = (side === 'buy' ? reference - 0.004 : reference + 0.004).toFixed(5);
  const takeProfit = (side === 'buy' ? reference + 0.004 : reference - 0.004).toFixed(5);
  await page.getByTestId('stop-loss-input').fill(stopLoss);
  await page.getByTestId('take-profit-input').fill(takeProfit);
  await page.getByTestId(`execution-submit-${side}`).click();
  await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('utility-drawer-trade-close').click();
  await page.waitForTimeout(1_500);
  return { stopLoss, takeProfit };
}

/**
 * Close everything, so each scene starts from a clean book.
 *
 * Through the product's own Close All, including its confirmation — which on a
 * phone is gated behind an acknowledgement checkbox, and on desktop is not.
 * The dock has to be expanded for the control to exist at all, and the mobile
 * dock lives inside a sheet.
 */
async function flatten(page: Page, options: { mobile?: boolean } = {}): Promise<void> {
  if ((await page.getByTestId('chart-position-chip').count()) === 0) return;

  if (options.mobile) {
    await page.getByTestId('mobile-dock-trigger').click();
  } else {
    const toggle = page.getByTestId('workstation-dock-collapse');
    if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  }
  await page.getByTestId('dock-close-all').click();
  const acknowledge = page.getByLabel(/Je confirme vouloir fermer/);
  if (await acknowledge.isVisible().catch(() => false)) await acknowledge.check();
  await page.getByRole('button', { name: 'Confirmer', exact: true }).last().click();
  await expect(page.getByTestId('chart-position-chip')).toHaveCount(0, { timeout: 30_000 });
  /*
   * Close All reports what it did and waits to be dismissed — correctly, since
   * a bulk close is the one action a trader must be told the outcome of. The
   * first cut of this helper walked away and left the result dialog sitting
   * over the workstation, so the next scene's very first click hit a scrim.
   */
  const result = page.getByRole('dialog', { name: /Tout fermer/i });
  if (await result.isVisible().catch(() => false)) {
    // Escape rather than the button: the dialog carries a "Fermer" action *and*
    // a "×", and inside a result table whose rows read "FERMÉE" an accessible
    // name lookup has more than one honest answer.
    await page.keyboard.press('Escape');
    await expect(result).toBeHidden({ timeout: 15_000 });
  }
  if (options.mobile) await page.keyboard.press('Escape');
  await page.waitForTimeout(1_000);
}

/**
 * The rule, checked against the pixels the trader is looking at.
 *
 * Screen Y grows downward, so "above" is the smaller number. Asserting on the
 * rendered boxes rather than on the prices is the point: a correct price drawn
 * in the wrong place is exactly the defect this pass exists to close.
 */
async function assertGeometry(page: Page, side: 'buy' | 'sell'): Promise<void> {
  const entry = await centreY(page.getByTestId('chart-position-chip'));
  const stop = await centreY(page.getByTestId('chart-level-chip-stop_loss'));
  const target = await centreY(page.getByTestId('chart-level-chip-take_profit'));
  if (side === 'buy') {
    expect(target, 'long: take profit sits above entry').toBeLessThan(entry);
    expect(stop, 'long: stop loss sits below entry').toBeGreaterThan(entry);
  } else {
    expect(stop, 'short: stop loss sits above entry').toBeLessThan(entry);
    expect(target, 'short: take profit sits below entry').toBeGreaterThan(entry);
  }
  // And never in the same row — §5's superposition failure.
  expect(Math.abs(stop - target)).toBeGreaterThan(16);
  expect(Math.abs(stop - entry)).toBeGreaterThan(16);
  expect(Math.abs(target - entry)).toBeGreaterThan(16);
}

async function finishClip(context: BrowserContext, name: string): Promise<void> {
  await context.close();
  const dir = resolve(OUT_DIR, 'raw');
  const file = readdirSync(dir).find((entry) => entry.endsWith('.webm'));
  if (!file) throw new Error(`no recording produced for ${name}`);
  renameSync(resolve(dir, file), resolve(OUT_DIR, `${name}.webm`));
}

test.describe('VX1-D.1 trade geometry', { tag: ['@warix-vx1d1'] }, () => {
  test.beforeAll(() => {
    mkdirSync(resolve(OUT_DIR, 'raw'), { recursive: true });
  });

  test('desktop — long and short geometry, both proven', async ({ page, tradeAccount }) => {
    test.setTimeout(420_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    // 01 — the resting terminal, and 12 — a header with no recovery text left.
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-1440-01-hero.png') });
    await expect(page.getByTestId('workstation-connection')).toHaveText('');
    await page.screenshot({
      path: resolve(OUT_DIR, 'vx1d1-1440-12-header-clean.png'),
      clip: { x: 0, y: 0, width: 1440, height: 44 },
    });

    // 10 — the rail at its new optical weight.
    await page.getByTestId('workstation-dock-collapse').click();
    await page.waitForTimeout(400);
    const rail = await page.getByTestId('right-utility-rail').boundingBox();
    if (rail) {
      await page.screenshot({
        path: resolve(OUT_DIR, 'vx1d1-1440-10-rail-idle.png'),
        clip: { x: rail.x - 14, y: rail.y, width: rail.width + 16, height: rail.height },
      });
    }

    // 03 — a position with no protection yet: one action cluster, not two
    // stacked pseudo-levels.
    await openTicket(page);
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('utility-drawer-trade-close').click();
    await page.waitForTimeout(1_200);
    await expect(page.getByTestId('chart-protection-controls')).toBeVisible();
    await expect(page.getByTestId('chart-add-level-stop_loss')).toBeVisible();
    await expect(page.getByTestId('chart-add-level-take_profit')).toBeVisible();
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-1440-03-long-unprotected.png') });
    await flatten(page);

    // 04 — LONG with both levels. The rule is asserted, then photographed.
    await openPositionWithProtection(page, 'buy');
    await assertGeometry(page, 'buy');
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-1440-04-long-sl-tp.png') });
    await flatten(page);

    // 05 — SHORT with both levels, inverted exactly as the rule requires.
    await openPositionWithProtection(page, 'sell');
    await assertGeometry(page, 'sell');
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-1440-05-short-sl-tp.png') });

    // 06 — the plates under pressure: entry and the market a few ticks apart,
    // reached by zooming the price scale rather than by moving any price.
    await page.mouse.move(1_360, 400);
    for (let step = 0; step < 6; step += 1) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-1440-06-plate-collision.png') });

    // 09 — the ticket beside a live position.
    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-1440-09-trade-drawer.png') });
    await page.getByTestId('utility-drawer-trade-close').click();
    await flatten(page);
  });

  test('desktop — an illegal drag is refused, not silently swapped', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(360_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    const levels = await openPositionWithProtection(page, 'buy');
    const stopChip = page.getByTestId('chart-level-chip-stop_loss');
    const entryY = await centreY(page.getByTestId('chart-position-chip'));
    const stopY = await centreY(stopChip);

    /*
     * Drag the long's stop *above* its entry — a place a stop loss cannot be.
     * The chip must say so while the pointer is there (§8), and releasing must
     * leave the authoritative level exactly where the server last confirmed it.
     */
    const box = await stopChip.boundingBox();
    if (!box) throw new Error('expected a stop chip');
    const x = box.x + box.width / 2;
    await page.mouse.move(x, stopY);
    await page.mouse.down();
    const target = entryY - 60;
    for (let step = 1; step <= 20; step += 1) {
      await page.mouse.move(x, stopY + ((target - stopY) * step) / 20);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(400);
    await expect(stopChip).toHaveAttribute('data-sync', 'invalid_zone');
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-1440-07-sl-drag-invalid.png') });
    await page.mouse.up();
    await page.waitForTimeout(1_500);

    /*
     * Nothing was sent, and nothing moved: the stop is still the server's.
     *
     * Read from the dock's positions row rather than from the chip or the axis
     * plate. The chip's accepted grammar is money-first, so it carries no
     * price; the plate only exists while the level is inside the visible band,
     * and a stop 40 pips away often is not. The dock always states the
     * authoritative value, which is the number this assertion is about.
     */
    await expect(page.getByRole('row', { name: /EURUSD/ }).first()).toContainText(levels.stopLoss);
    await assertGeometry(page, 'buy');
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-1440-08-sl-drag-restored.png') });
    await flatten(page);
  });

  test('mobile — long and short geometry @mobile', async ({ page, tradeAccount }) => {
    test.setTimeout(420_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-390-01-resting.png') });

    // 03 — the ticket, sized to its content rather than to 90dvh.
    await page.getByRole('button', { name: /^Trader/ }).click();
    await expect(page.getByTestId('execution-center')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-390-03-trade-sheet.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);

    for (const side of ['buy', 'sell'] as const) {
      const { bid, ask } = await (async () => {
        await page.getByRole('button', { name: /^Trader/ }).click();
        await expect(page.getByTestId('execution-center')).toBeVisible({ timeout: 15_000 });
        const b = Number(
          (await page.getByTestId('execution-bid').textContent())?.match(/[\d.]+/)?.[0],
        );
        const a = Number(
          (await page.getByTestId('execution-ask').textContent())?.match(/[\d.]+/)?.[0],
        );
        return { bid: b, ask: a };
      })();
      const reference = side === 'buy' ? ask : bid;
      await page
        .getByTestId('stop-loss-input')
        .fill((side === 'buy' ? reference - 0.004 : reference + 0.004).toFixed(5));
      await page
        .getByTestId('take-profit-input')
        .fill((side === 'buy' ? reference + 0.004 : reference - 0.004).toFixed(5));
      await page.getByTestId(`execution-submit-${side}`).click();
      await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1_500);

      await assertGeometry(page, side);
      await page.screenshot({
        path: resolve(OUT_DIR, `vx1d1-390-0${side === 'buy' ? '5' : '6'}-${side}-sl-tp.png`),
      });

      if (side === 'buy') {
        // 07/08 — the chip resting, then engaged in place.
        await page.getByTestId('chart-position-chip').click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: resolve(OUT_DIR, 'vx1d1-390-07-chip-engaged.png') });
      }
      await flatten(page, { mobile: true });
    }
  });

  /*
   * Motion — short clips, one property each. The live candle and the price
   * plate are judged together (§13): they answer the same tick, and the failure
   * mode worth recording is one visibly chasing the other.
   */
  test('motion — live candle and plate', async ({ browser, tradeAccount }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      baseURL: 'http://localhost:3000',
      recordVideo: { dir: resolve(OUT_DIR, 'raw'), size: { width: 1440, height: 900 } },
    });
    const page = await context.newPage();
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await settle(page);
    await page.waitForTimeout(12_000);
    await finishClip(context, 'vx1d1-A-live-candle');
  });

  test('motion — protection cluster to real levels', async ({ browser, tradeAccount }) => {
    test.setTimeout(360_000);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      baseURL: 'http://localhost:3000',
      recordVideo: { dir: resolve(OUT_DIR, 'raw'), size: { width: 1440, height: 900 } },
    });
    const page = await context.newPage();
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await settle(page);
    await openTicket(page);
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('utility-drawer-trade-close').click();
    await page.waitForTimeout(2_000);

    // Drag a stop out of the cluster: the action becomes a level, at a price.
    const addStop = page.getByTestId('chart-add-level-stop_loss');
    const box = await addStop.boundingBox();
    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let step = 1; step <= 24; step += 1) {
        await page.mouse.move(x, y + (70 * step) / 24);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(400);
      await page.mouse.up();
    }
    await page.waitForTimeout(6_000);
    await flatten(page).catch(() => undefined);
    await finishClip(context, 'vx1d1-B-protection-drag');
  });

  test('motion — mobile chip @mobile', async ({ browser, tradeAccount }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({
      ...devices['Pixel 7'],
      baseURL: 'http://localhost:3000',
      recordVideo: { dir: resolve(OUT_DIR, 'raw'), size: { width: 390, height: 844 } },
    });
    const page = await context.newPage();
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await settle(page);
    await page.getByRole('button', { name: /^Trader/ }).click();
    await expect(page.getByTestId('execution-center')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1_500);
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2_000);
    await page.getByTestId('chart-position-chip').click();
    await page.waitForTimeout(2_500);
    await page.getByTestId('chart-position-chip').click();
    await page.waitForTimeout(4_000);
    // `{ mobile: true }` is not optional here: the desktop path reaches for the
    // dock's collapse toggle, which a phone does not render, and
    // `locator.getAttribute` on a missing element never settles — so the
    // `.catch()` below can never fire and the clip runs out its timeout.
    await flatten(page, { mobile: true }).catch(() => undefined);
    await finishClip(context, 'vx1d1-C-mobile-chip');
  });
});
