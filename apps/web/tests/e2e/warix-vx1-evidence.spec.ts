import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser, Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The VX1 render harness — the representative premium state, and nothing else.
 *
 * VX1 §44 is explicit that the visual pass is judged on *one* fully-built
 * composition before anything propagates: 1440, EURUSD, a live long position
 * with both protective levels, and a market price that is none of them. This
 * spec builds exactly that state through the product's own controls — a real
 * ticket, a real server-confirmed fill — and photographs it.
 *
 * Nothing here fabricates a number. The position is opened by the Execution
 * Center, the levels are the ones the ticket sent, and every figure on screen
 * came back from the server.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-vx1-premium');
const VIDEO_DIR = resolve(OUT_DIR, 'motion');

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

/**
 * Parks the pointer somewhere inert before a shot.
 *
 * Not the status bar (every metric there has a tooltip), not the plot (a pointer
 * over it draws the crosshair) and not the chart footer either — the footer's
 * height moves with the dock, so a fixed point there lands inside the plot half
 * the time. The product rail's empty stretch below its last destination is inert
 * at every layout this harness renders.
 */
async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(27, 600);
}

async function settle(page: Page): Promise<void> {
  // The Next dev overlay badge is tooling, not product; it must never appear in
  // evidence a human is asked to accept.
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

/** A clipped, upscaled close-up — a 28px chip cannot be judged in a 1440 frame. */
async function closeUp(
  page: Page,
  name: string,
  clip: { x: number; y: number; width: number; height: number },
): Promise<void> {
  await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), clip });
}

/**
 * Waits for a metric to reach a tone, and reports whether it did.
 *
 * The profitable state cannot be manufactured honestly — it arrives when the
 * market moves the trader's way — so this returns a boolean instead of failing
 * the run. An evidence bundle missing one state and saying so is worth more than
 * a green run that photographed the wrong one under the right filename.
 */
async function waitForTone(metric: Locator, tone: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await metric.getAttribute('data-metric-tone')) === tone) return true;
    await metric.page().waitForTimeout(500);
  }
  return false;
}

async function boxOf(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('expected a rendered box for the close-up clip');
  return box;
}

/**
 * Records one short clip of a single interaction.
 *
 * Its own browser context, so the clip starts and ends at the interaction
 * rather than carrying the whole test with it — VX1 §46 asks for 5–10 seconds,
 * not a session recording. The context inherits the signed-in storage state, so
 * what it records is the same workstation the screenshots came from.
 */
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
  // Playwright names videos by an internal id; give the clip the name of the
  // thing it shows, which is what a reviewer is looking for in the folder.
  const written = readdirSync(VIDEO_DIR)
    .filter((file) => file.endsWith('.webm') && !file.startsWith('vx1-'))
    .map((file) => resolve(VIDEO_DIR, file));
  const latest = written.at(-1);
  if (latest) renameSync(latest, resolve(VIDEO_DIR, `${name}.webm`));
  // Any other unnamed clip is a leftover from an interrupted run; a reviewer
  // opening this folder should find four named clips and nothing else.
  for (const stray of readdirSync(VIDEO_DIR).filter(
    (file) => file.endsWith('.webm') && !file.startsWith('vx1-'),
  )) {
    rmSync(resolve(VIDEO_DIR, stray), { force: true });
  }
}

test.describe('WX/VX1 premium visual state', { tag: ['@warix-vx1'] }, () => {
  test('renders the representative desktop state at 1440', async ({ page, tradeAccount }) => {
    // Generous: this one test builds a real trade, waits on a real market for a
    // profitable state, and records four clips in their own contexts.
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    // 1 — the premium default: no position yet, so this is the material, the
    // colour and the typography on their own.
    await shot('vx1-1440-default');

    // 8 — Markets drawer, on the same surfaces.
    await page.getByTestId('utility-markets').click();
    await expect(page.getByTestId('utility-drawer-markets')).toBeVisible();
    await parkPointer(page);
    await page.waitForTimeout(500);
    await shot('vx1-1440-markets-drawer');
    await page.getByTestId('utility-drawer-markets-close').click();

    /*
     * The representative trade (§45). Both protective levels are set *in the
     * ticket*, so the position arrives from the server already bracketed —
     * which is the state the whole chart-object system exists to draw, and the
     * one a screenshot taken after two manual drags could never prove was real.
     */
    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    const bid = Number(await page.getByTestId('execution-bid').textContent());
    expect(Number.isFinite(bid)).toBe(true);
    await page.getByTestId('stop-loss-input').fill((bid - 0.0018).toFixed(5));
    await page.getByTestId('take-profit-input').fill((bid + 0.0022).toFixed(5));
    await page.waitForTimeout(400);

    // 7 — the Trade drawer itself, with a fully exercised ticket.
    await parkPointer(page);
    await shot('vx1-1440-trade-drawer');

    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('workstation-dock')).toHaveAttribute('data-empty', 'false', {
      timeout: 30_000,
    });
    await page.getByTestId('utility-drawer-trade-close').click();
    await expect(page.getByTestId('execution-center')).toBeHidden();
    await parkPointer(page);
    await page.waitForTimeout(1_500);

    /*
     * §45 wants all four levels *visible*, and lightweight-charts autoscales to
     * the candles alone — a bracket wider than the last hour's range leaves its
     * levels outside the band (where WariX pins them to the edge, correctly, but
     * without their lines). Dragging the price axis is the trader's own way to
     * widen the band, so the evidence uses it rather than a special render path.
     */
    await page.mouse.move(1360, 320);
    await page.mouse.down();
    await page.mouse.move(1360, 470, { steps: 12 });
    await page.mouse.up();
    await parkPointer(page);
    await page.waitForTimeout(800);

    // 2 — the state VX1 is judged on: four distinct levels on one chart.
    await expect(page.getByTestId('chart-position-chip')).toBeVisible();
    await expect(page.getByTestId('chart-level-chip-take_profit')).toBeVisible();
    await expect(page.getByTestId('chart-level-chip-stop_loss')).toBeVisible();
    await shot('vx1-1440-active-position');

    // 3 — the chips themselves, close enough to read the money on them.
    const tp = await boxOf(page.getByTestId('chart-level-chip-take_profit'));
    const sl = await boxOf(page.getByTestId('chart-level-chip-stop_loss'));
    await closeUp(page, 'vx1-closeup-trade-chips', {
      x: Math.max(0, Math.min(tp.x, sl.x) - 40),
      y: Math.max(0, tp.y - 40),
      width: 460,
      height: Math.min(420, sl.y + sl.height + 40 - (tp.y - 40)),
    });

    // 4 — the price scale, where the four identities have to stay legible
    // against each other and above the indicators.
    await closeUp(page, 'vx1-closeup-price-scale', {
      x: 1240,
      y: Math.max(0, tp.y - 80),
      width: 200,
      height: Math.min(460, sl.y + sl.height + 80 - (tp.y - 80)),
    });

    /*
     * 5 — the strip with the trade *in profit*, and 6 with it under water. Both
     * wait for the market to produce the state rather than staging it: the
     * sandbox feed oscillates, so a long position visits both sides on its own,
     * and what is photographed is whatever the server reported at that instant.
     */
    const strip = await boxOf(page.getByTestId('workstation-status-bar'));
    const openPnlMetric = page.getByTestId('metric-open-pnl');
    const reachedProfit = await waitForTone(openPnlMetric, 'positive', 240_000);
    if (reachedProfit) {
      await closeUp(page, 'vx1-closeup-account-strip', {
        x: 0,
        y: 0,
        width: 900,
        height: Math.ceil(strip.height),
      });
    }
    // Recorded in the run output either way, so the bundle can be read against
    // what the market actually did while it was being captured.
    test.info().annotations.push({
      type: 'open-pnl-profit-state',
      description: reachedProfit ? 'captured' : 'not reached within 240s',
    });

    /*
     * The negative state is *produced*, not waited for: a second position on the
     * opposite side leaves the account holding a long and a short, and a hedged
     * pair is under water by its two spreads from the moment it exists. The
     * figure is real — two real fills, real spread cost, the server's own
     * equity — and it arrives in a second rather than whenever the sandbox feed
     * happens to turn.
     */
    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    await page.getByTestId('execution-submit-sell').click();
    await page.getByTestId('utility-drawer-trade-close').click();
    await parkPointer(page);
    await expect(openPnlMetric).toHaveAttribute('data-metric-tone', 'negative', {
      timeout: 60_000,
    });
    await closeUp(page, 'vx1-closeup-account-strip-negative', {
      x: 0,
      y: 0,
      width: 900,
      height: Math.ceil(strip.height),
    });

    /*
     * §46 A–D — four short clips of the motion the stills cannot show. Recorded
     * against this same live account, with the position still open, so the P&L
     * clip is a real market moving a real trade.
     */
    mkdirSync(VIDEO_DIR, { recursive: true });
    // Written to the run's own output directory, never into the evidence
    // bundle: this file holds a live session cookie for the fixture account and
    // has no business anywhere near a folder meant to be shared or committed.
    const storageState = test.info().outputPath('vx1-storage-state.json');
    await page.context().storageState({ path: storageState });
    const browser = page.context().browser();
    if (browser) {
      // A — the live quote and the open P&L, moving on their own.
      await record(browser, storageState, 'vx1-motion-a-live-pnl', async (scene) => {
        await scene.waitForTimeout(7_000);
      });

      // B — dragging the Stop Loss: line, label, chip and estimate together.
      await record(browser, storageState, 'vx1-motion-b-stop-loss-drag', async (scene) => {
        const chip = scene.getByTestId('chart-level-chip-stop_loss');
        await expect(chip).toBeVisible({ timeout: 30_000 });
        const box = await boxOf(chip);
        await scene.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await scene.mouse.down();
        await scene.mouse.move(box.x + box.width / 2, box.y - 60, { steps: 30 });
        await scene.waitForTimeout(900);
        await scene.mouse.move(box.x + box.width / 2, box.y + 30, { steps: 30 });
        await scene.waitForTimeout(600);
        await scene.mouse.up();
        await scene.waitForTimeout(2_500);
      });

      // C — the interval selection travelling between keys.
      await record(browser, storageState, 'vx1-motion-c-timeframe', async (scene) => {
        for (const interval of ['3m', '5m', '15m', '1m']) {
          await scene.getByRole('radio', { name: interval, exact: true }).click();
          await scene.waitForTimeout(1_200);
        }
      });

      // D — a drawer opening and closing.
      await record(browser, storageState, 'vx1-motion-d-drawer', async (scene) => {
        await scene.getByTestId('utility-markets').click();
        await scene.waitForTimeout(1_600);
        await scene.getByTestId('utility-drawer-markets-close').click();
        await scene.waitForTimeout(1_000);
        await scene.getByTestId('utility-trade').click();
        await scene.waitForTimeout(1_600);
        await scene.getByTestId('utility-drawer-trade-close').click();
        await scene.waitForTimeout(1_200);
      });
    }

    // Leave the account exactly as it was found: the fixture cannot delete a
    // user whose positions are still open.
    await page.getByTestId('utility-activity').click();
    const dock = page.getByTestId('workstation-dock');
    // Closes whatever is open, one settled close at a time: the hedged pair
    // closes as two independent server commands, and firing the second before
    // the first has settled leaves a position behind.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const close = dock.getByRole('button', { name: /^Fermer EURUSD/ }).first();
      if ((await close.count()) === 0) break;
      await close.click();
      await page.waitForTimeout(2_500);
      if ((await dock.getAttribute('data-empty')) === 'true') break;
    }
    await expect(dock).toHaveAttribute('data-empty', 'true', { timeout: 30_000 });
  });

  test('renders the phone premium state @mobile', async ({ page, tradeAccount }) => {
    test.setTimeout(300_000);
    mkdirSync(OUT_DIR, { recursive: true });

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    // 10 — the phone header and toolbar, on the premium surfaces.
    await shot('vx1-390-header');

    // 9 — a live bracketed trade, in the compact chip presentation.
    await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    const bid = Number(await page.getByTestId('execution-bid').textContent());
    await page.getByTestId('stop-loss-input').fill((bid - 0.0018).toFixed(5));
    await page.getByTestId('take-profit-input').fill((bid + 0.0022).toFixed(5));
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1_500);
    await shot('vx1-390-active-trade');

    // Same cleanup contract as the desktop run — scoped to the activity sheet,
    // which is where the phone's dock lives.
    await page.getByTestId('mobile-dock-trigger').click();
    const sheet = page.getByRole('dialog', { name: 'Activité de trading' });
    await expect(sheet).toBeVisible();
    // The phone dock renders positions as cards, whose close action is named
    // "Fermer" alone — the desktop table's fuller name belongs to its own row.
    await sheet.getByRole('button', { name: 'Fermer', exact: true }).first().click();
    await expect(sheet.getByTestId('workstation-dock')).toHaveAttribute('data-empty', 'true', {
      timeout: 30_000,
    });
  });
});
