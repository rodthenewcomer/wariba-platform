import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The VX1-D.1.1 closure harness — seven scenes, no more.
 *
 * Two of them (A and B) exist to push a protective level to the *extreme* of
 * the plot, because that is the only place §2's safe zones can be judged: a
 * take profit comfortably mid-chart proves nothing about what happens when one
 * lands under the legend or in the feedback lane. They are produced by zooming
 * the price scale in on a real position rather than by inventing a price.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-vx1d11-closure');

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
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

async function quote(page: Page): Promise<{ bid: number; ask: number }> {
  const bid = Number((await page.getByTestId('execution-bid').textContent())?.match(/[\d.]+/)?.[0]);
  const ask = Number((await page.getByTestId('execution-ask').textContent())?.match(/[\d.]+/)?.[0]);
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) throw new Error('no live quote');
  return { bid, ask };
}

/** Open a real position with real protective levels on their legal sides. */
async function openProtected(
  page: Page,
  side: 'buy' | 'sell',
  options: { mobile?: boolean; distance?: number } = {},
): Promise<void> {
  if (options.mobile) {
    await page.getByRole('button', { name: /^Trader/ }).click();
  } else {
    await page.getByTestId('utility-trade').click();
  }
  await expect(page.getByTestId('execution-center')).toBeVisible({ timeout: 15_000 });
  const { bid, ask } = await quote(page);
  const reference = side === 'buy' ? ask : bid;
  const distance = options.distance ?? 0.004;
  await page
    .getByTestId('stop-loss-input')
    .fill((side === 'buy' ? reference - distance : reference + distance).toFixed(5));
  await page
    .getByTestId('take-profit-input')
    .fill((side === 'buy' ? reference + distance : reference - distance).toFixed(5));
  await page.getByTestId(`execution-submit-${side}`).click();
  await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
  if (options.mobile) await page.keyboard.press('Escape');
  else await page.getByTestId('utility-drawer-trade-close').click();
  await page.waitForTimeout(1_500);
}

async function flatten(page: Page, options: { mobile?: boolean } = {}): Promise<void> {
  if ((await page.getByTestId('chart-position-chip').count()) === 0) return;
  if (options.mobile) await page.getByTestId('mobile-dock-trigger').click();
  else {
    const toggle = page.getByTestId('workstation-dock-collapse');
    if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  }
  await page.getByTestId('dock-close-all').click();
  const acknowledge = page.getByLabel(/Je confirme vouloir fermer/);
  if (await acknowledge.isVisible().catch(() => false)) await acknowledge.check();
  await page.getByRole('button', { name: 'Confirmer', exact: true }).last().click();
  await expect(page.getByTestId('chart-position-chip')).toHaveCount(0, { timeout: 30_000 });
  const result = page.getByRole('dialog', { name: /Tout fermer/i });
  if (await result.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await expect(result).toBeHidden({ timeout: 15_000 });
  }
  if (options.mobile) await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
}

/** Zoom the price scale in, which pushes distant levels to the plot's edges. */
async function compressPriceScale(page: Page, steps: number): Promise<void> {
  const plot = await page.getByTestId('chart-track').boundingBox();
  const x = plot ? plot.x + plot.width - 24 : 360;
  const y = plot ? plot.y + plot.height / 2 : 400;
  await page.mouse.move(x, y);
  for (let step = 0; step < steps; step += 1) {
    await page.mouse.wheel(0, -140);
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(900);
}

/**
 * The rule, and the safe zones, checked on the rendered boxes.
 *
 * A pinned chip is still required to be on the correct *side* of entry, because
 * the boundaries are ordered: the top boundary is above the bottom one, so a
 * long's take profit pinned to the top is still above its entry.
 */
async function assertGeometry(page: Page, side: 'buy' | 'sell'): Promise<void> {
  const entry = await centreY(page.getByTestId('chart-position-chip'));
  const stop = await centreY(page.getByTestId('chart-level-chip-stop_loss'));
  const target = await centreY(page.getByTestId('chart-level-chip-take_profit'));
  if (side === 'buy') {
    expect(target, 'long: take profit above entry').toBeLessThan(entry);
    expect(stop, 'long: stop loss below entry').toBeGreaterThan(entry);
  } else {
    expect(stop, 'short: stop loss above entry').toBeLessThan(entry);
    expect(target, 'short: take profit below entry').toBeGreaterThan(entry);
  }
}

/** Every chip fully inside the plot, and clear of the reserved lanes. */
async function assertSafeZones(page: Page): Promise<void> {
  const plot = await page.getByTestId('chart-track').boundingBox();
  if (!plot) throw new Error('expected a plot');
  for (const id of [
    'chart-position-chip',
    'chart-level-chip-stop_loss',
    'chart-level-chip-take_profit',
  ]) {
    const box = await page.getByTestId(id).boundingBox();
    if (!box) continue;
    expect(box.y, `${id} clipped at the top`).toBeGreaterThanOrEqual(plot.y - 1);
    expect(box.y + box.height, `${id} clipped at the bottom`).toBeLessThanOrEqual(
      plot.y + plot.height + 1,
    );
  }
}

test.describe('VX1-D.1.1 closure', { tag: ['@warix-vx1d11'] }, () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test('mobile — levels at the extremes, and invalid drags @mobile', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(420_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    // A — LONG, both levels pushed to the plot's edges by a compressed scale.
    await openProtected(page, 'buy', { mobile: true });
    await compressPriceScale(page, 7);
    await assertGeometry(page, 'buy');
    await assertSafeZones(page);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d11-390-A-long-extremes.png') });

    // C — the invalid LONG stop: dragged above entry, which is not a stop.
    const stopChip = page.getByTestId('chart-level-chip-stop_loss');
    const entryY = await centreY(page.getByTestId('chart-position-chip'));
    const box = await stopChip.boundingBox();
    if (box) {
      const x = box.x + box.width / 2;
      const from = box.y + box.height / 2;
      const to = Math.max(entryY - 70, 90);
      await page.mouse.move(x, from);
      await page.mouse.down();
      for (let step = 1; step <= 18; step += 1) {
        await page.mouse.move(x, from + ((to - from) * step) / 18);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(500);
      await expect(stopChip).toHaveAttribute('data-sync', 'invalid_zone');
      // §1 — an illegal level is given no economics at all, and above all no
      // profit figure sitting on a stop loss.
      const card = page.getByTestId('chart-drag-preview');
      await expect(card).toHaveAttribute('data-invalid', 'true');
      await expect(page.getByTestId('chart-drag-preview-reason')).toBeVisible();
      await expect(card).not.toContainText('USD');
      await expect(card).not.toContainText('risque/rendement');
      await expect(card).not.toContainText('PMJ');
      await page.screenshot({ path: resolve(OUT_DIR, 'vx1d11-390-C-invalid-long-sl.png') });
      await page.mouse.up();
      await page.waitForTimeout(1_200);
      await assertGeometry(page, 'buy');
    }
    await flatten(page, { mobile: true });

    // B — SHORT, inverted, at the same extremes.
    await openProtected(page, 'sell', { mobile: true });
    await compressPriceScale(page, 7);
    await assertGeometry(page, 'sell');
    await assertSafeZones(page);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d11-390-B-short-extremes.png') });

    // D — the invalid SHORT stop: dragged *below* entry.
    const shortStop = page.getByTestId('chart-level-chip-stop_loss');
    const shortEntryY = await centreY(page.getByTestId('chart-position-chip'));
    const shortBox = await shortStop.boundingBox();
    if (shortBox) {
      const x = shortBox.x + shortBox.width / 2;
      const from = shortBox.y + shortBox.height / 2;
      const to = shortEntryY + 70;
      await page.mouse.move(x, from);
      await page.mouse.down();
      for (let step = 1; step <= 18; step += 1) {
        await page.mouse.move(x, from + ((to - from) * step) / 18);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(500);
      await expect(shortStop).toHaveAttribute('data-sync', 'invalid_zone');
      await expect(page.getByTestId('chart-drag-preview')).toHaveAttribute('data-invalid', 'true');
      await page.screenshot({ path: resolve(OUT_DIR, 'vx1d11-390-D-invalid-short-sl.png') });
      await page.mouse.up();
      await page.waitForTimeout(1_200);
      await assertGeometry(page, 'sell');
    }
    await flatten(page, { mobile: true });
  });

  test('desktop — long and short, still correct after the revert', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(360_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    await openProtected(page, 'buy');
    await assertGeometry(page, 'buy');
    await assertSafeZones(page);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d11-1440-F-long-sl-tp.png') });
    await flatten(page);

    await openProtected(page, 'sell');
    await assertGeometry(page, 'sell');
    await assertSafeZones(page);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d11-1440-G-short-sl-tp.png') });
    await flatten(page);
  });

  /*
   * E — several open/close cycles, then one live position.
   *
   * The clutter case, and its own test because it is the only scene that has to
   * churn the book: every fill used to print its own price label at the live
   * edge, so a handful of round trips stacked eight of them over the entry line
   * and the current-price plate. Each cycle is settled before the next starts —
   * closing and opening in the same breath raced the dock's own confirmation.
   */
  test('mobile — execution history does not pile up @mobile', async ({ page, tradeAccount }) => {
    test.setTimeout(420_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    for (let cycle = 0; cycle < 4; cycle += 1) {
      await page.getByRole('button', { name: /^Trader/ }).click();
      await expect(page.getByTestId('execution-center')).toBeVisible({ timeout: 15_000 });
      await page.getByTestId(`execution-submit-${cycle % 2 === 0 ? 'buy' : 'sell'}`).click();
      await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1_200);
      await flatten(page, { mobile: true });
      await page.waitForTimeout(1_200);
    }

    await openProtected(page, 'buy', { mobile: true });
    await page.waitForTimeout(3_000);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d11-390-E-no-marker-clutter.png') });
    await flatten(page, { mobile: true });
  });
});
