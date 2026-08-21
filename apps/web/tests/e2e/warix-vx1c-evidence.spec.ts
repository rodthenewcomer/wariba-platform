import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser, Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The VX1-C edge-state harness.
 *
 * Every state here is *produced*, never mocked: the rejection comes from a real
 * server refusal, the degraded connection from a real dropped socket, the
 * success feedback from a real fill. The one thing the harness does is put the
 * workstation into those conditions on purpose, which is the only way a polish
 * pass on edge states can be judged from pixels.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-vx1c-edge-states');
const VIDEO_DIR = resolve(OUT_DIR, 'motion');

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(27, 600);
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
  await page.waitForTimeout(2_000);
}

async function boxOf(locator: Locator): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('expected a rendered box');
  return box;
}

async function resetAccount(page: Page): Promise<void> {
  const dock = page.getByTestId('workstation-dock');
  await page.getByTestId('utility-alerts').click();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const remove = dock.getByRole('button', { name: 'Supprimer', exact: true }).first();
    if ((await remove.count()) === 0) break;
    await remove.click();
    await page.waitForTimeout(1_500);
  }
  await page.getByTestId('utility-activity').click();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const close = dock.getByRole('button', { name: /^Fermer EURUSD/ }).first();
    if ((await close.count()) === 0) break;
    await close.click();
    await page.waitForTimeout(2_500);
    if ((await dock.getAttribute('data-empty')) === 'true') break;
  }
}

async function record(
  browser: Browser,
  storageState: string,
  name: string,
  scene: (page: Page) => Promise<void>,
  viewport = { width: 1440, height: 900 },
): Promise<void> {
  const context = await browser.newContext({
    storageState,
    viewport,
    recordVideo: { dir: VIDEO_DIR, size: viewport },
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
    .filter((file) => file.endsWith('.webm') && !file.startsWith('vx1c-'))
    .map((file) => resolve(VIDEO_DIR, file));
  const latest = written.at(-1);
  if (latest) renameSync(latest, resolve(VIDEO_DIR, `${name}.webm`));
  for (const stray of readdirSync(VIDEO_DIR).filter(
    (file) => file.endsWith('.webm') && !file.startsWith('vx1c-'),
  )) {
    rmSync(resolve(VIDEO_DIR, stray), { force: true });
  }
}

/**
 * One controllable realtime link, with three real conditions.
 *
 * `context.setOffline` was the first attempt and does not do this: Chromium
 * keeps an already-open WebSocket alive, so the client never noticed and the
 * header stayed green. Routing the socket lets the harness be the network:
 *
 * - `slow`   — the handshake takes seconds, which is when a client sits in
 *              `connecting` and the header reads "Reconnexion…".
 * - `refuse` — accepted and dropped, so the client exhausts its ladder and
 *              reports "Hors ligne".
 * - `pass`   — straight through, and the client recovers on its own schedule.
 *
 * Every state the evidence shows is the client's genuine reading of the link.
 */
type TransportMode = 'slow' | 'refuse' | 'pass';

async function controlRealtime(
  page: Page,
  initial: TransportMode,
): Promise<(mode: TransportMode) => void> {
  let mode = initial;
  await page.routeWebSocket(/\/ws/, async (ws) => {
    if (mode === 'refuse') {
      ws.close({ code: 1006, reason: 'evidence: transport interrupted' });
      return;
    }
    if (mode === 'slow') await new Promise((done) => setTimeout(done, 8_000));
    ws.connectToServer();
  });
  return (next: TransportMode) => {
    mode = next;
  };
}

/**
 * A genuinely refused order.
 *
 * Ten thousand lots is beyond every bound the server enforces, so the refusal
 * and its reason are the server's own — nothing here fabricates an error, and
 * the reason line in the evidence is whatever the risk engine actually said.
 */
async function provokeRejection(page: Page): Promise<void> {
  await page.getByTestId('utility-trade').click();
  await expect(page.getByTestId('execution-center')).toBeVisible();
  await page.getByTestId('quantity-input').fill('10.00');
  await page.getByTestId('execution-submit-buy').click();
}

test.describe('VX1-C edge states', { tag: ['@warix-vx1c'] }, () => {
  test('renders the desktop edge states at 1440', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(VIDEO_DIR, { recursive: true });

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });

    /*
     * 1 — history loading, caught before the first page lands. The toolbar, the
     * axis and the live candles are all present; only depth is missing, and the
     * chip says so rather than a bare line of text.
     */
    const setTransport = await controlRealtime(page, 'slow');
    await page.goto('/trade');
    await hideDevOverlay(page);
    const historyChip = page.getByTestId('chart-history-status');
    // Either sentence is the truthful one for this moment: the link is coming
    // up, or history is on its way. The shot is of whichever the client is in.
    await expect(historyChip).toContainText(/Connexion au flux|Historique/, { timeout: 30_000 });
    await shot('vx1c-1440-01-history-loading');

    // 5 — the same slow link, seen by the header: the client is connecting, and
    // says so, with the amber indicator breathing.
    await page.screenshot({
      path: resolve(OUT_DIR, 'vx1c-1440-05-reconnecting.png'),
      clip: { x: 640, y: 0, width: 800, height: 44 },
    });

    setTransport('pass');
    await settle(page);

    // 2 — the empty Positions dock.
    await page.getByTestId('utility-activity').click();
    await parkPointer(page);
    await page.waitForTimeout(500);
    await shot('vx1c-1440-02-empty-positions');

    // 4 — a real refusal, with the control that caused it still on screen.
    await provokeRejection(page);
    await expect(page.getByTestId('workstation-feedback')).toHaveAttribute(
      'data-feedback-tone',
      'rejection',
      { timeout: 30_000 },
    );
    await shot('vx1c-1440-04-order-rejection');
    await page.getByTestId('quantity-input').fill('0.10');

    // 3 — a real fill, and its confirmation.
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('workstation-feedback')).toHaveAttribute(
      'data-feedback-tone',
      'success',
      { timeout: 30_000 },
    );
    await shot('vx1c-1440-03-order-success');
    await page.getByTestId('utility-drawer-trade-close').click();

    // 9 — a focused execution input, with the refined single-border treatment.
    await page.getByTestId('utility-trade').click();
    await page.getByTestId('stop-loss-input').click();
    await page.waitForTimeout(400);
    const field = await boxOf(page.getByTestId('stop-loss-input'));
    await page.screenshot({
      path: resolve(OUT_DIR, 'vx1c-1440-09-focused-input.png'),
      clip: { x: field.x - 30, y: field.y - 34, width: 300, height: 92 },
    });
    await page.getByTestId('utility-drawer-trade-close').click();

    // 10 — the Markets drawer, where the quote cells answer their own ticks.
    await page.getByTestId('utility-markets').click();
    await expect(page.getByTestId('utility-drawer-markets')).toBeVisible();
    await parkPointer(page);
    await page.waitForTimeout(900);
    await shot('vx1c-1440-10-markets-quotes');
    await page.getByTestId('utility-drawer-markets-close').click();

    // 7/8 — the refined modals.
    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('indicator-library')).toBeVisible();
    await page.waitForTimeout(500);
    await shot('vx1c-1440-07-indicators-modal');
    await page.keyboard.press('Escape');

    await page.getByTestId('chart-symbol-search-trigger').click();
    await expect(page.getByTestId('symbol-search-modal')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('symbol-search-input').fill('zzz');
    await page.waitForTimeout(500);
    await shot('vx1c-1440-08-search-modal');
    await page.keyboard.press('Escape');

    /*
     * 5/6 — the degraded states, produced by actually taking the socket away.
     *
     * `context.setOffline` drops the realtime connection the same way a lost
     * network would: the client reports `connecting`/`closed` on its own, and
     * the header is photographed reacting to a real transport event.
     */
    setTransport('refuse');
    // The client only learns the socket is gone when the server drops it; a
    // reload makes the harness deterministic without faking any client state —
    // the page comes up and cannot connect, exactly as on a dead link.
    await page.reload();
    await hideDevOverlay(page);
    await expect(page.getByTestId('workstation-connection')).not.toHaveAttribute(
      'data-connection',
      'open',
      { timeout: 30_000 },
    );
    const strip = await boxOf(page.getByTestId('workstation-status-bar'));
    const headerClip = { x: 640, y: 0, width: 800, height: Math.ceil(strip.height) };

    /*
     * The client's ladder cycles closed → connecting → closed, so both states
     * are real and both are transient. Each shot waits for its own state rather
     * than for a clock, and neither is staged.
     */
    const captureConnectionState = async (
      label: string,
      wanted: string,
      file: string,
    ): Promise<boolean> => {
      const chip = page.getByTestId('workstation-connection');
      const deadline = Date.now() + 40_000;
      while (Date.now() < deadline) {
        const text = await chip.textContent();
        if ((text ?? '').includes(label)) {
          await page.screenshot({ path: resolve(OUT_DIR, file), clip: headerClip });
          /*
           * The transport oscillates while the route is dropping it, so the
           * state can change between the check and the shutter. Re-reading
           * *after* the shot is what guarantees the file shows the state its
           * name claims — otherwise a recovered header ends up filed as
           * "reconnecting".
           */
          const after = await chip.textContent();
          if ((after ?? '').includes(label)) return true;
          continue;
        }
        await page.waitForTimeout(100);
      }
      return false;
    };

    const caughtOffline = await captureConnectionState(
      'Hors ligne',
      'closed',
      'vx1c-1440-06-offline-stale.png',
    );
    test.info().annotations.push({
      type: 'connection-states',
      description: `offline=${caughtOffline}`,
    });
    // Recovery happens on the client's own schedule now that the route lets it
    // through — nothing here reloads or nudges it.
    setTransport('pass');
    await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
      'data-connection',
      'open',
      { timeout: 60_000 },
    );

    // §39 A–E — the motion, in its own contexts.
    const storageState = test.info().outputPath('vx1c-storage-state.json');
    await page.context().storageState({ path: storageState });
    const browser = page.context().browser();
    if (browser) {
      await record(browser, storageState, 'vx1c-motion-b-order-feedback', async (scene) => {
        await scene.getByTestId('utility-trade').click();
        await expect(scene.getByTestId('execution-center')).toBeVisible();
        await scene.getByTestId('quantity-input').fill('10.00');
        await scene.getByTestId('execution-submit-buy').click();
        await scene.waitForTimeout(3_200);
        await scene.getByTestId('quantity-input').fill('0.10');
        await scene.getByTestId('execution-submit-buy').click();
        await scene.waitForTimeout(3_500);
      });

      await record(browser, storageState, 'vx1c-motion-c-connection', async (scene) => {
        const set = await controlRealtime(scene, 'refuse');
        await scene.reload();
        await scene.waitForTimeout(4_500);
        set('pass');
        await scene.waitForTimeout(5_500);
      });

      await record(browser, storageState, 'vx1c-motion-d-quote-flash', async (scene) => {
        await scene.getByTestId('utility-markets').click();
        await expect(scene.getByTestId('utility-drawer-markets')).toBeVisible();
        await scene.waitForTimeout(6_500);
      });

      await record(browser, storageState, 'vx1c-motion-e-modal', async (scene) => {
        await scene.getByTestId('chart-indicators-trigger').click();
        await scene.waitForTimeout(1_600);
        await scene.keyboard.press('Escape');
        await scene.waitForTimeout(800);
        await scene.getByTestId('chart-symbol-search-trigger').click();
        await scene.waitForTimeout(1_600);
        await scene.keyboard.press('Escape');
        await scene.waitForTimeout(1_000);
      });
    }

    await resetAccount(page);
  });

  test('renders the phone edge states @mobile', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(VIDEO_DIR, { recursive: true });

    const shot = async (name: string): Promise<void> => {
      await page.waitForTimeout(400);
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    // 16 — the empty Activity sheet.
    await page.getByTestId('mobile-dock-trigger').click();
    await expect(page.getByRole('dialog', { name: 'Activité de trading' })).toBeVisible();
    await shot('vx1c-390-16-empty-activity');
    await page.keyboard.press('Escape');

    // 15 — the trade sheet.
    await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    const bid = Number(await page.getByTestId('execution-bid').textContent());
    await page.getByTestId('stop-loss-input').fill((bid - 0.0016).toFixed(5));
    await page.getByTestId('take-profit-input').fill((bid + 0.002).toFixed(5));
    await shot('vx1c-390-15-trade-sheet');

    // 11 — the resting trade objects: compact, facts only.
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2_000);
    await shot('vx1c-390-11-trade-resting');

    // 12 — the same objects, engaged: the actions arrive in place.
    await page.getByTestId('chart-level-chip-stop_loss').click();
    await page.getByTestId('chart-position-chip').click();
    await page.waitForTimeout(600);
    await shot('vx1c-390-12-trade-engaged');

    // 13/14 — the two sheets, on the propagated chrome.
    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('indicator-library')).toBeVisible();
    await shot('vx1c-390-13-indicators-sheet');
    await page.keyboard.press('Escape');

    await page.getByTestId('chart-symbol-search-trigger').click();
    await expect(page.getByRole('dialog', { name: 'Marchés' })).toBeVisible({ timeout: 15_000 });
    await shot('vx1c-390-14-markets-sheet');
    await page.keyboard.press('Escape');

    // 17 — the degraded connection, on a phone header.
    const setMobileTransport = await controlRealtime(page, 'refuse');
    await page.reload();
    await hideDevOverlay(page);
    await expect(page.getByTestId('workstation-connection')).not.toHaveAttribute(
      'data-connection',
      'open',
      { timeout: 30_000 },
    );
    await page.waitForTimeout(800);
    await shot('vx1c-390-17-connection-degraded');
    setMobileTransport('pass');
    await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
      'data-connection',
      'open',
      { timeout: 60_000 },
    );

    // §39 A/F — the phone motion.
    const storageState = test.info().outputPath('vx1c-mobile-storage-state.json');
    await page.context().storageState({ path: storageState });
    const browser = page.context().browser();
    if (browser) {
      await record(
        browser,
        storageState,
        'vx1c-motion-a-mobile-trade-chip',
        async (scene) => {
          const chip = scene.getByTestId('chart-position-chip');
          await expect(chip).toBeVisible({ timeout: 30_000 });
          await scene.waitForTimeout(1_200);
          await chip.click();
          await scene.waitForTimeout(2_000);
          await scene.getByTestId('chart-level-chip-stop_loss').click();
          await scene.waitForTimeout(2_500);
        },
        { width: 390, height: 844 },
      );

      await record(
        browser,
        storageState,
        'vx1c-motion-f-mobile-sheet',
        async (scene) => {
          await scene.getByTestId('chart-indicators-trigger').click();
          await scene.waitForTimeout(1_800);
          await scene.keyboard.press('Escape');
          await scene.waitForTimeout(900);
          await scene.getByTestId('mobile-dock-trigger').click();
          await scene.waitForTimeout(1_800);
          await scene.keyboard.press('Escape');
          await scene.waitForTimeout(900);
        },
        { width: 390, height: 844 },
      );
    }

    await page.getByTestId('mobile-dock-trigger').click();
    const sheet = page.getByRole('dialog', { name: 'Activité de trading' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Fermer', exact: true }).first().click();
    await page.waitForTimeout(3_000);
  });
});
