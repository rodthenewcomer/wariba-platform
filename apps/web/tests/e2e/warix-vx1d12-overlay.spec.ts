import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The VX1-D.1.2 overlay harness — four scenes.
 *
 * The two that matter assert *non-overlap*, not appearance: a validation card
 * that merely looks clear in one screenshot is the defect this pass is fixing.
 * Each drag scene reads the card's rendered box and every trade object's
 * rendered box and requires them to be disjoint.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-vx1d12-overlay');

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

/** Rectangles, in viewport coordinates, of everything the card must not cover. */
async function tradeObjectBoxes(page: Page) {
  const boxes: { id: string; box: { x: number; y: number; width: number; height: number } }[] = [];
  for (const id of [
    'chart-position-chip',
    'chart-level-chip-stop_loss',
    'chart-level-chip-take_profit',
    'chart-price-plate-current',
    'chart-price-plate-entry',
  ]) {
    const box = await page
      .getByTestId(id)
      .boundingBox()
      .catch(() => null);
    if (box) boxes.push({ id, box });
  }
  return boxes;
}

/** §1 — the card is disjoint from every trade object on screen. */
async function assertCardClear(page: Page): Promise<void> {
  const card = await page.getByTestId('chart-drag-preview').boundingBox();
  if (!card) throw new Error('expected a validation card');
  for (const { id, box } of await tradeObjectBoxes(page)) {
    const disjoint =
      card.x + card.width <= box.x ||
      box.x + box.width <= card.x ||
      card.y + card.height <= box.y ||
      box.y + box.height <= card.y;
    expect(disjoint, `validation card overlaps ${id}`).toBe(true);
  }
}

/** Drag a level to the wrong side of entry and hold there. */
async function dragToInvalid(page: Page, side: 'buy' | 'sell'): Promise<void> {
  const chip = page.getByTestId('chart-level-chip-stop_loss');
  const entryY = await centreY(page.getByTestId('chart-position-chip'));
  const box = await chip.boundingBox();
  if (!box) throw new Error('expected a stop chip');
  const x = box.x + box.width / 2;
  const from = box.y + box.height / 2;
  // A long's stop is below entry, so an illegal drag goes up; a short's is
  // above, so it goes down. Both cross the entry, which is the point.
  const to = side === 'buy' ? Math.max(entryY - 80, 100) : entryY + 80;
  await page.mouse.move(x, from);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(x, from + ((to - from) * step) / 20);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(600);
}

test.describe('VX1-D.1.2 overlay cleanup', { tag: ['@warix-vx1d12'] }, () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test('mobile — the validation card clears every trade object @mobile', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(420_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    // A — a long, with both levels pinned to the boundaries so the card has the
    // least room it will ever have, and an illegal upward drag on the stop.
    await openProtected(page, 'buy', { mobile: true });
    await compressPriceScale(page, 7);
    await dragToInvalid(page, 'buy');
    await expect(page.getByTestId('chart-drag-preview')).toHaveAttribute('data-invalid', 'true');
    await assertCardClear(page);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d12-390-A-invalid-long-drag.png') });
    await page.mouse.up();
    await page.waitForTimeout(1_200);
    await assertGeometry(page, 'buy');
    await flatten(page, { mobile: true });
  });

  /*
   * B — the same proof on a short, and its own test.
   *
   * Sharing a page with A meant closing a position immediately after releasing
   * a drag, and the two raced: the dock's confirmation and the drag's settle
   * were competing for the same moment. A scene that has to churn the book is
   * cheaper to isolate than to synchronise.
   */
  test('mobile — the validation card clears every object on a short @mobile', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(420_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    await openProtected(page, 'sell', { mobile: true });
    await compressPriceScale(page, 7);
    await dragToInvalid(page, 'sell');
    await expect(page.getByTestId('chart-drag-preview')).toHaveAttribute('data-invalid', 'true');
    await assertCardClear(page);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d12-390-B-invalid-short-drag.png') });
    await page.mouse.up();
    await page.waitForTimeout(1_500);
    await assertGeometry(page, 'sell');
    await flatten(page, { mobile: true });
  });

  test('mobile — historical fills do not pile at the scale @mobile', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(420_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    // C — six round trips, twelve fills. Before the policy this drew twelve
    // arrows welded to the price scale at the live edge.
    for (let cycle = 0; cycle < 6; cycle += 1) {
      await page.getByRole('button', { name: /^Trader/ }).click();
      await expect(page.getByTestId('execution-center')).toBeVisible({ timeout: 15_000 });
      await page.getByTestId(`execution-submit-${cycle % 2 === 0 ? 'buy' : 'sell'}`).click();
      await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1_100);
      await flatten(page, { mobile: true });
      await page.waitForTimeout(1_100);
    }
    await page.waitForTimeout(2_500);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d12-390-C-many-historical-fills.png') });

    // D — a normal live trade on top of that history: entry, current price and
    // both protective levels all readable.
    await openProtected(page, 'buy', { mobile: true });
    await page.waitForTimeout(3_000);
    await assertGeometry(page, 'buy');
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d12-390-D-active-position-clean.png') });
    await flatten(page, { mobile: true });
  });
});
