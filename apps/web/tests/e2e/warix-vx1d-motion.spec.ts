import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BrowserContext, Locator, Page } from '@playwright/test';
import { devices } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The VX1-D motion harness.
 *
 * **Why this one records instead of screenshotting.** Every earlier visual
 * phase could be judged from a still: a colour, a spacing, a silhouette. Motion
 * cannot — a screenshot of an interpolating price plate is a screenshot of a
 * price plate. So the acceptance artefact here is video, and the stills are
 * reduced to the four §57 asks for.
 *
 * **Nothing here fabricates market movement (§58).** The prices that move in
 * these clips are the local realtime service's own sandbox feed, the same one
 * the workstation runs against in development, reaching the browser over a real
 * WebSocket. No tick is injected, no price is scripted, and no animation is
 * driven from the test. What the harness does is *press things* — quantity,
 * Buy, a stop-loss drag — and let the product answer.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-vx1d-motion');

/** Long enough for the motion to be judged, short enough for a human to watch. */
const CLIP = {
  hero: 14_000,
  markets: 9_000,
  execution: 15_000,
  sltp: 15_000,
  workspace: 10_000,
  mobile: 14_000,
  degraded: 10_000,
} as const;

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

/**
 * Playwright names its videos by an internal page id, so each recorded context
 * is closed and its single file renamed to the scene it documents. Renaming
 * after `context.close()` is not optional: the file is not flushed until then.
 */
async function finishClip(context: BrowserContext, name: string): Promise<void> {
  await context.close();
  const dir = resolve(OUT_DIR, 'raw');
  const file = readdirSync(dir).find((entry) => entry.endsWith('.webm'));
  if (!file) throw new Error(`no recording produced for ${name}`);
  renameSync(resolve(dir, file), resolve(OUT_DIR, `${name}.webm`));
}

interface Scene {
  context: BrowserContext;
  page: Page;
}

async function openScene(
  browser: import('@playwright/test').Browser,
  account: { email: string; password: string },
  options: { mobile?: boolean } = {},
): Promise<Scene> {
  const context = await browser.newContext({
    ...(options.mobile ? devices['Pixel 7'] : { viewport: { width: 1440, height: 900 } }),
    baseURL: 'http://localhost:3000',
    recordVideo: {
      dir: resolve(OUT_DIR, 'raw'),
      size: options.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    },
  });
  const page = await context.newPage();
  await signIn(page, account.email, account.password);
  await page.goto('/trade');
  await settle(page);
  return { context, page };
}

/** A pointer drag that actually looks like one: stepped, so the clip shows tracking. */
async function dragBy(page: Page, handle: Locator, dy: number, steps = 26): Promise<void> {
  const box = await handle.boundingBox();
  if (!box) throw new Error('expected a draggable handle');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(x, y + (dy * step) / steps);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(400);
  await page.mouse.up();
}

test.describe('VX1-D motion evidence', { tag: ['@warix-vx1d'] }, () => {
  test.beforeAll(() => {
    mkdirSync(resolve(OUT_DIR, 'raw'), { recursive: true });
  });

  /*
   * A — LIVE MARKET HERO.
   *
   * The camera does nothing at all for fourteen seconds. That is the point of
   * this clip: every pixel that moves in it moved because the market moved —
   * the current-price plate travelling and pulsing, the active candle, the
   * legend's OHLC, the header metrics, the feed icon's sweep. If the terminal
   * does not look alive here, no interaction elsewhere will save it.
   */
  test('A — live market hero', async ({ browser, tradeAccount }) => {
    test.setTimeout(240_000);
    const { context, page } = await openScene(browser, tradeAccount);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d-1440-hero.png') });
    // Assert the display layer is actually engaged before spending the clip on
    // it: a plate that reports a direction is a plate that saw a real tick.
    await expect(page.getByTestId('chart-price-plate-current')).toHaveAttribute(
      'data-move',
      /up|down/,
      { timeout: 30_000 },
    );
    await page.waitForTimeout(CLIP.hero);
    await finishClip(context, 'vx1d-A-live-market-hero');
  });

  /*
   * B — MARKETS.
   *
   * Five instruments, all live, with the drawer open and the pointer parked.
   * What is under review is §8: can a trader see *which* quote changed, without
   * the row itself flashing.
   */
  test('B — markets quote feedback', async ({ browser, tradeAccount }) => {
    test.setTimeout(240_000);
    const { context, page } = await openScene(browser, tradeAccount);
    await page.getByTestId('utility-markets').click();
    await expect(page.getByTestId('utility-drawer-markets')).toBeVisible();
    await page.mouse.move(700, 500);
    await page.waitForTimeout(CLIP.markets);
    await finishClip(context, 'vx1d-B-markets-quotes');
  });

  /*
   * C — EXECUTION.
   *
   * A real market order on a real account: the quantity steppers, the Buy key's
   * press and its in-flight rule, the canonical confirmation, then the entry
   * line and chip arriving on the plot and the position's money starting to
   * move. Nothing is mocked, which is why the clip has to be long enough to
   * contain a genuine round trip.
   */
  test('C — execution physics', async ({ browser, tradeAccount }) => {
    test.setTimeout(300_000);
    const { context, page } = await openScene(browser, tradeAccount);
    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('execution-center')).toBeVisible();

    await page.waitForTimeout(900);
    await page.getByTestId('quantity-increment').click();
    await page.waitForTimeout(500);
    await page.getByTestId('quantity-increment').click();
    await page.waitForTimeout(700);
    await page.getByTestId('quantity-decrement').click();
    await page.waitForTimeout(900);

    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d-1440-active-trade.png') });
    await page.waitForTimeout(CLIP.execution);
    await finishClip(context, 'vx1d-C-execution');
  });

  /*
   * D — SL/TP DRAG.
   *
   * §31 calls this one of the most important tactile interactions in the
   * product, so the drag is stepped at roughly frame rate rather than issued as
   * a single mouse jump: a teleporting pointer would record a cut, not a drag,
   * and would prove nothing about tracking, the preview panel, or the settle.
   */
  test('D — stop-loss drag physics', async ({ browser, tradeAccount }) => {
    test.setTimeout(300_000);
    const { context, page } = await openScene(browser, tradeAccount);
    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('utility-drawer-trade-close').click();
    await page.waitForTimeout(1_200);

    const addStop = page.getByTestId('chart-add-level-stop_loss');
    if (await addStop.isVisible().catch(() => false)) {
      await addStop.click();
      await page.waitForTimeout(1_500);
    }
    const stopChip = page.getByTestId('chart-level-chip-stop_loss');
    if (await stopChip.isVisible().catch(() => false)) {
      await dragBy(page, stopChip, 46);
    }
    await page.waitForTimeout(CLIP.sltp);
    await finishClip(context, 'vx1d-D-sltp-drag');
  });

  /*
   * E — WORKSPACE.
   *
   * The chrome's own choreography, with no market decision in it: rail hover,
   * one drawer replacing another without the shell closing and reopening
   * (§22), the dock, and a timeframe switch that swaps data without fading the
   * chart to black (§16).
   */
  test('E — workspace choreography', async ({ browser, tradeAccount }) => {
    test.setTimeout(240_000);
    const { context, page } = await openScene(browser, tradeAccount);
    await page.getByTestId('utility-markets').hover();
    await page.waitForTimeout(700);
    await page.getByTestId('utility-alerts').hover();
    await page.waitForTimeout(700);

    await page.getByTestId('utility-markets').click();
    await expect(page.getByTestId('utility-drawer-markets')).toBeVisible();
    await page.waitForTimeout(1_100);
    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    await page.waitForTimeout(1_100);
    await page.getByTestId('utility-drawer-trade-close').click();
    await page.waitForTimeout(800);

    await page.getByTestId('workstation-dock-collapse').click();
    await page.waitForTimeout(800);
    await page.getByTestId('workstation-dock-collapse').click();
    await page.waitForTimeout(800);

    /*
     * The interval chips are a radiogroup named by their own label, so no test
     * id is needed — but the label is lowercase in the DOM and only *looks*
     * uppercase, because the chip is styled `uppercase`. An accessible name is
     * computed from the text, not from the paint, so `15S` matches nothing.
     */
    for (const timeframe of ['15s', '30s', '5s']) {
      await page.getByRole('radio', { name: timeframe, exact: true }).click();
      await page.waitForTimeout(1_400);
    }
    await page.waitForTimeout(CLIP.workspace);
    await finishClip(context, 'vx1d-E-workspace');
  });

  /*
   * F — MOBILE.
   *
   * A real Pixel 7 profile, not a narrowed desktop: touch, device pixel ratio
   * and mobile user agent all differ, and sheet choreography is exactly the
   * thing that looks fine at 1440 and wrong on a phone.
   */
  test('F — mobile motion @mobile', async ({ browser, tradeAccount }) => {
    test.setTimeout(300_000);
    const { context, page } = await openScene(browser, tradeAccount, { mobile: true });
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d-390-hero.png') });
    await page.waitForTimeout(3_000);

    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('indicator-library')).toBeVisible();
    await page.waitForTimeout(1_600);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);

    /*
     * The phone's action rail is two keys, and they open two different things:
     * "Trader" raises the ticket, "Activité" raises the dock. §57 asks for a
     * mobile *trade* still, so the ticket is the one to open — the first cut
     * pressed the dock and produced a correctly-rendered screenshot of the
     * wrong surface.
     */
    await page.getByRole('button', { name: /^Trader/ }).click();
    await expect(page.getByTestId('execution-center')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1_600);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d-390-trade.png') });
    await page.waitForTimeout(1_200);

    // And the dock, for the sheet choreography §42 is judged on.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
    await page.getByTestId('mobile-dock-trigger').click();
    await page.waitForTimeout(1_600);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(CLIP.mobile);
    await finishClip(context, 'vx1d-F-mobile');
  });

  /*
   * G — DEGRADED FEED.
   *
   * The transport is genuinely taken away — the route closes the socket, the
   * client runs its own reconnect ladder — so the clip records the real
   * sequence: mint sweep, the socket dropping, amber, the chart's single local
   * notice, then recovery and one "Flux rétabli". §47's "do not celebrate
   * excessively" is what is on trial here.
   */
  test('G — degraded feed', async ({ browser, tradeAccount }) => {
    test.setTimeout(300_000);
    const { context, page } = await openScene(browser, tradeAccount);
    await page.waitForTimeout(4_000);

    let refusing = true;
    await page.routeWebSocket(/\/ws/, (ws) => {
      if (refusing) {
        ws.close({ code: 1006, reason: 'evidence: transport interrupted' });
        return;
      }
      ws.connectToServer();
    });
    await page.reload();
    await hideDevOverlay(page);
    await expect(page.getByTestId('workstation-connection')).not.toHaveAttribute(
      'data-connection',
      'open',
      { timeout: 30_000 },
    );
    await page.waitForTimeout(4_000);
    refusing = false;
    await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
      'data-connection',
      'open',
      { timeout: 60_000 },
    );
    await page.waitForTimeout(CLIP.degraded);
    await finishClip(context, 'vx1d-G-degraded-feed');
  });

  /*
   * Reduced motion (§53/§59) — a smoke check, not a clip.
   *
   * There is nothing to record: the correct result is that nothing moves. What
   * matters is that the workstation is still fully usable and still financially
   * truthful with every animation collapsed, so this asserts the surfaces are
   * there and the authoritative price still prints.
   */
  test('reduced motion keeps the terminal usable and truthful', async ({
    browser,
    tradeAccount,
  }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      baseURL: 'http://localhost:3000',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await settle(page);

    await expect(page.getByTestId('chart-price-plate-current')).toBeVisible();
    const price = await page.getByTestId('chart-price-plate-current').textContent();
    expect(price?.trim()).toMatch(/^\d+\.\d+$/);
    await expect(page.getByTestId('right-utility-rail')).toBeVisible();
    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1d-1440-reduced-motion.png') });
    await context.close();
  });
});

/**
 * VX1-D §59 — the checks a recording cannot make.
 *
 * A clip shows that something moved; it cannot show that the digits on the
 * plate are the authoritative ones, that the transition never outlives the gap
 * it was given, or that the ambient sweep is absent when it should be. These
 * read the computed values instead, so the motion layer's two safety
 * properties — truth and boundedness — are asserted rather than eyeballed.
 */
test.describe('VX1-D motion safety', { tag: ['@warix-vx1d'] }, () => {
  test('the display layer never changes an authoritative price', async ({ page, tradeAccount }) => {
    test.setTimeout(180_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    const plate = page.getByTestId('chart-price-plate-current');
    await expect(plate).toHaveAttribute('data-move', /up|down/, { timeout: 30_000 });

    /*
     * Sampled repeatedly *during* motion, not after it settles: if the module
     * ever interpolated a value rather than a duration, a midpoint would appear
     * here — a price the feed never sent, at a precision the instrument does
     * not use.
     */
    for (let sample = 0; sample < 12; sample += 1) {
      const printed = (await plate.textContent())?.trim() ?? '';
      // Exactly the instrument's precision, always. An interpolated value would
      // arrive as a float the feed never sent, and would show up here as either
      // a different digit count or a price the legend does not know.
      expect(printed).toMatch(/^\d+\.\d{5}$/);
      const legend = (await page.getByTestId('chart-ohlc-legend').textContent()) ?? '';
      const close = /C\s*([\d.]+)/.exec(legend)?.[1];
      if (close) expect(printed).toBe(close);
      await page.waitForTimeout(220);
    }

    // And the travel time stays inside the ladder: never long enough for the
    // marker to still be moving toward a price two ticks stale.
    const durations = new Set<string>();
    for (let sample = 0; sample < 20; sample += 1) {
      durations.add(
        await plate.evaluate((node) => getComputedStyle(node).transitionDuration.split(',')[0]!),
      );
      await page.waitForTimeout(140);
    }
    for (const duration of durations) {
      const ms = duration.endsWith('ms')
        ? Number(duration.slice(0, -2))
        : Number(duration.slice(0, -1)) * 1_000;
      expect(ms).toBeGreaterThanOrEqual(0);
      expect(ms).toBeLessThanOrEqual(160);
    }
  });

  test('the ambient sweep runs only on a healthy feed', async ({ page, tradeAccount }) => {
    test.setTimeout(180_000);
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    const bars = page.getByTestId('workstation-connection').locator('svg rect');
    await expect(bars).toHaveCount(3);
    const healthyNames = await bars.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).animationName),
    );
    expect(healthyNames.every((name) => name.includes('wariba-feed-sweep'))).toBe(true);

    // Staggered, not synchronised: that is what makes it a sweep rather than a
    // blink.
    const delays = await bars.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).animationDelay),
    );
    expect(new Set(delays).size).toBe(3);

    // Taken away, the glyph goes still: an indicator that sweeps while
    // disconnected would be the most dishonest animation in the product.
    await page.routeWebSocket(/\/ws/, (ws) => ws.close({ code: 1006, reason: 'evidence' }));
    await page.reload();
    await hideDevOverlay(page);
    await expect(page.getByTestId('workstation-connection')).not.toHaveAttribute(
      'data-connection',
      'open',
      { timeout: 30_000 },
    );
    const degradedNames = await bars.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).animationName),
    );
    expect(degradedNames.every((name) => name === 'none')).toBe(true);
  });
});
