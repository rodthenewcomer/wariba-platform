import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser, Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The VX1-A.1 polish harness.
 *
 * Six pieces of evidence, each aimed at one thing the polish pass changed: the
 * price scale under deliberate collision, the trade chip's material, the two
 * P&L resting states with every flash settled, and the two motions that only a
 * recording can show.
 *
 * The collision is not staged — a market order fills at the market, so the entry
 * plate and the current-price plate are a few ticks apart by construction, which
 * is exactly the case that produced the overlap in the VX1-A close-up.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-vx1a1-polish');
const VIDEO_DIR = resolve(OUT_DIR, 'motion');

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

/** The product rail's empty stretch: inert at every layout this harness renders. */
async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(27, 600);
}

async function settle(page: Page): Promise<void> {
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
    'data-connection',
    'open',
    { timeout: 30_000 },
  );
  await expect(
    page
      .getByRole('group', { name: /^Graphique / })
      .locator('canvas')
      .first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('chart-history-status')).toHaveAttribute(
    'data-history-status',
    'ready',
    { timeout: 60_000 },
  );
  await page.waitForTimeout(2_500);
}

/**
 * Waits until nothing inside a surface is mid-flash.
 *
 * §7 asks for the negative strip *after all flashes have settled*, and a live
 * strip flashes on every equity update — so a shot fired at an arbitrary moment
 * photographs a transient rather than the resting design. Every animated metric
 * publishes `data-flash`, which is what this polls.
 */
async function waitForFlashesToSettle(scope: Locator, timeoutMs = 20_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const flashing = await scope.locator('[data-flash]:not([data-flash="none"])').count();
    if (flashing === 0) return true;
    await scope.page().waitForTimeout(120);
  }
  return false;
}

async function waitForTone(metric: Locator, tone: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await metric.getAttribute('data-metric-tone')) === tone) return true;
    await metric.page().waitForTimeout(400);
  }
  return false;
}

async function boxOf(locator: Locator): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('expected a rendered box for the close-up clip');
  return box;
}

/** Closes whatever is open, one settled command at a time. */
async function closeEveryPosition(page: Page): Promise<void> {
  await page.getByTestId('utility-activity').click();
  const dock = page.getByTestId('workstation-dock');
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const close = dock.getByRole('button', { name: /^Fermer EURUSD/ }).first();
    if ((await close.count()) === 0) break;
    await close.click();
    await page.waitForTimeout(2_500);
    if ((await dock.getAttribute('data-empty')) === 'true') break;
  }
  await expect(dock).toHaveAttribute('data-empty', 'true', { timeout: 30_000 });
}

async function record(
  browser: Browser,
  storageState: string,
  name: string,
  scene: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext({
    storageState,
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  try {
    await page.goto('/trade');
    await settle(page);
    await scene(page);
  } finally {
    await context.close();
  }
  const written = readdirSync(VIDEO_DIR)
    .filter((file) => file.endsWith('.webm') && !file.startsWith('vx1a1-'))
    .map((file) => resolve(VIDEO_DIR, file));
  const latest = written.at(-1);
  if (latest) renameSync(latest, resolve(VIDEO_DIR, `${name}.webm`));
  for (const stray of readdirSync(VIDEO_DIR).filter(
    (file) => file.endsWith('.webm') && !file.startsWith('vx1a1-'),
  )) {
    rmSync(resolve(VIDEO_DIR, stray), { force: true });
  }
}

test.describe('VX1-A.1 polish', { tag: ['@warix-vx1a1'] }, () => {
  test('renders the polished hero states at 1440', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(VIDEO_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    // A bracketed market order: the entry fills at the market, which is what
    // puts the entry and current-price plates a few ticks apart.
    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    const bid = Number(await page.getByTestId('execution-bid').textContent());
    expect(Number.isFinite(bid)).toBe(true);
    await page.getByTestId('stop-loss-input').fill((bid - 0.0018).toFixed(5));
    await page.getByTestId('take-profit-input').fill((bid + 0.0022).toFixed(5));
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('workstation-dock')).toHaveAttribute('data-empty', 'false', {
      timeout: 30_000,
    });
    await page.getByTestId('utility-drawer-trade-close').click();
    await parkPointer(page);
    await page.waitForTimeout(2_000);

    /*
     * 3 — the price scale under a *deliberate* collision.
     *
     * A market fill already puts the entry within a few ticks of the market, but
     * whether that is fewer than sixteen pixels depends on the zoom. Compressing
     * the price scale — the trader's own gesture, dragging the axis — forces the
     * two plates into the same band, which is the case the resolver exists for.
     */
    await page.mouse.move(1360, 300);
    await page.mouse.down();
    await page.mouse.move(1360, 620, { steps: 20 });
    await page.mouse.up();
    await parkPointer(page);
    await page.waitForTimeout(1_500);

    const entryPlate = page.getByTestId('chart-price-plate-entry');
    await expect(entryPlate).toBeVisible();
    // The evidence is only evidence if a plate actually had to yield.
    await expect(page.locator('[data-displaced="true"]').first()).toBeVisible({ timeout: 30_000 });
    const entryBox = await boxOf(entryPlate);
    await page.screenshot({
      path: resolve(OUT_DIR, 'vx1a1-price-scale-collision.png'),
      clip: { x: 1230, y: Math.max(0, entryBox.y - 120), width: 210, height: 260 },
    });

    // 4 — the chip's material, close enough to judge the segmentation.
    const chip = page.getByTestId('chart-level-chip-take_profit');
    await expect(chip).toBeVisible();
    const chipBox = await boxOf(chip);
    await page.screenshot({
      path: resolve(OUT_DIR, 'vx1a1-trade-chip-closeup.png'),
      clip: {
        x: Math.max(0, chipBox.x - 30),
        y: Math.max(0, chipBox.y - 24),
        width: 360,
        height: 72,
      },
    });

    // 1 — the strip in profit, resting: no flash in flight.
    const strip = page.getByTestId('workstation-status-bar');
    const stripBox = await boxOf(strip);
    const openPnl = page.getByTestId('metric-open-pnl');
    const reachedProfit = await waitForTone(openPnl, 'positive', 240_000);
    if (reachedProfit) {
      await waitForFlashesToSettle(strip);
      await page.screenshot({
        path: resolve(OUT_DIR, 'vx1a1-account-strip-positive.png'),
        clip: { x: 0, y: 0, width: 900, height: Math.ceil(stripBox.height) },
      });
    }
    test.info().annotations.push({
      type: 'open-pnl-profit-state',
      description: reachedProfit ? 'captured' : 'not reached within 240s',
    });

    // 5/6 — the two motions, recorded while the bracketed trade is still on the
    // chart, because the drag clip needs its Stop Loss chip.
    const storageState = test.info().outputPath('vx1a1-storage-state.json');
    await page.context().storageState({ path: storageState });
    const browser = page.context().browser();
    if (browser) {
      await record(browser, storageState, 'vx1a1-motion-open-pnl', async (scene) => {
        await scene.waitForTimeout(7_000);
      });

      await record(browser, storageState, 'vx1a1-motion-stop-loss-drag', async (scene) => {
        const slChip = scene.getByTestId('chart-level-chip-stop_loss');
        await expect(slChip).toBeVisible({ timeout: 30_000 });
        const box = await boxOf(slChip);
        await scene.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await scene.waitForTimeout(700);
        await scene.mouse.down();
        await scene.waitForTimeout(500);
        await scene.mouse.move(box.x + box.width / 2, box.y - 70, { steps: 30 });
        await scene.waitForTimeout(800);
        await scene.mouse.move(box.x + box.width / 2, box.y + 24, { steps: 24 });
        await scene.waitForTimeout(500);
        await scene.mouse.up();
        await scene.waitForTimeout(3_000);
      });
    }

    /*
     * 2 — the strip under water, resting.
     *
     * A hedge does not flip the sign: opening the opposite side locks the pair's
     * sum at about one spread *from that moment*, so a long already in profit
     * stays in profit — which is exactly what the first attempt at this shot
     * ran into. Closing out and then opening both sides together does produce a
     * reliably negative figure: two fresh positions, each opened across the
     * spread, every number a real fill.
     */
    await closeEveryPosition(page);
    for (const side of ['buy', 'sell'] as const) {
      await page.getByTestId('utility-trade').click();
      await expect(page.getByTestId('execution-center')).toBeVisible();
      await page.getByTestId(`execution-submit-${side}`).click();
      await page.getByTestId('utility-drawer-trade-close').click();
      await page.waitForTimeout(1_500);
    }
    await parkPointer(page);
    expect(await waitForTone(openPnl, 'negative', 60_000)).toBe(true);
    expect(await waitForFlashesToSettle(strip, 30_000)).toBe(true);
    await page.screenshot({
      path: resolve(OUT_DIR, 'vx1a1-account-strip-negative.png'),
      clip: { x: 0, y: 0, width: 900, height: Math.ceil(stripBox.height) },
    });

    // Leave the account exactly as it was found.
    await closeEveryPosition(page);
  });
});
