import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX Workstation 2026 — W3 market history & candle hydration.
 *
 * These assert the behaviours that only exist once a real realtime process, a
 * real socket and a real browser are involved: that the chart hydrates from
 * history the server genuinely observed, that switching instrument or interval
 * never shows another one's bars, that a browser reload comes back to the same
 * process memory rather than starting empty, and that killing history leaves the
 * live feed and every execution control exactly as they were.
 *
 * Timing note, stated rather than hidden: candle depth here is a function of the
 * realtime process's **wall-clock uptime**, because a bucket only finalizes when
 * an accepted tick lands in a later one and the mock feed's timestamps are wall
 * clock (W3 §81 forbids making the simulator time-reconstructable). So the waits
 * below are waits for a deterministic server condition, not sleeps. WX2's
 * durable cache makes the professional 1m interval the shortest supported
 * source of history across process restarts.
 */

const HISTORY_STATUS = '[data-testid="chart-history-status"]';
const DESKTOP_WORKSTATION_BREAKPOINT = 1024;

/** The live quote surface is the desk-grade Execution Center on desktop and
 * the compact market trigger in the mobile composition. */
function liveQuote(page: Page) {
  const width = page.viewportSize()?.width ?? DESKTOP_WORKSTATION_BREAKPOINT;
  return width < DESKTOP_WORKSTATION_BREAKPOINT
    ? page.getByTestId('chart-symbol-search-trigger')
    : page.getByTestId('execution-bid');
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

/**
 * W3 §86 — a connected socket is not a hydrated workstation. Waits for the
 * connection, then for the symbol specs (without which hydration cannot even
 * start, since mid needs the instrument's precision), then for the history
 * request to have actually resolved.
 */
async function openWorkstation(page: Page): Promise<void> {
  await page.goto('/trade');
  await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
    'data-connection',
    'open',
    { timeout: 30_000 },
  );
  /*
   * The Execution Center is a drawer, not a column.
   *
   * Its quote is this suite's hydration signal, and the VX1 pass moved the
   * panel behind the Trade destination — so waiting for the bid without
   * opening it waited on a panel nothing had asked for. warix-w4's own helper
   * has opened it this way since that pass; this is the same two lines.
   */
  const width = page.viewportSize()?.width ?? DESKTOP_WORKSTATION_BREAKPOINT;
  if (width >= DESKTOP_WORKSTATION_BREAKPOINT) {
    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('utility-drawer-trade')).toBeVisible();
  }
  await expect(liveQuote(page)).not.toContainText('—', { timeout: 30_000 });
  await expect(page.locator(HISTORY_STATUS)).not.toHaveAttribute('data-history-status', 'idle', {
    timeout: 30_000,
  });
}

/** Waits until the chart holds at least `minimum` server-or-locally-observed finalized bars. */
async function waitForCandles(page: Page, minimum: number, timeout = 90_000): Promise<number> {
  await expect
    .poll(
      async () =>
        Number((await page.locator(HISTORY_STATUS).getAttribute('data-history-candles')) ?? '0'),
      { timeout, message: `at least ${minimum} finalized candles` },
    )
    .toBeGreaterThanOrEqual(minimum);
  return Number((await page.locator(HISTORY_STATUS).getAttribute('data-history-candles')) ?? '0');
}

/**
 * W5 §86 changed the timeframe control from a row of toggle buttons to a real
 * `radiogroup` with roving tab focus, because five intervals in a row of
 * `aria-pressed` buttons is not the WAI-ARIA pattern for a single-choice
 * control. The selector moves with it: `role="radio"` + `aria-checked`. The
 * *behaviour* under test — selecting an interval hydrates that interval — is
 * unchanged, which is why this is a harness correction and not a weakened
 * assertion.
 */
async function selectTimeframe(page: Page, timeframe: '1m' | '5m' | '1h'): Promise<void> {
  await page.getByRole('radio', { name: timeframe, exact: true }).click();
  await expect(page.getByRole('radio', { name: timeframe, exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
}

test.describe('WariX W3 market history', { tag: ['@trade'] }, () => {
  test('hydrates the chart from server-observed history and continues live', async ({
    page,
    tradeAccount,
  }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);
    await selectTimeframe(page, '1m');

    const status = page.locator(HISTORY_STATUS);

    // The response landed and identified its memory generation.
    await expect(status).toHaveAttribute('data-history-epoch', /.+/, { timeout: 30_000 });
    const epoch = await status.getAttribute('data-history-epoch');
    expect(epoch).toBeTruthy();

    // Either the server already had finalized bars (`ready`) or it is still
    // building them (`empty`) — both are honest; what must not happen is
    // `error`, and what must happen is that bars accumulate.
    expect(['ready', 'empty']).toContain(await status.getAttribute('data-history-status'));

    const observed = await waitForCandles(page, 2);
    await expect(status).toHaveAttribute('data-history-status', 'ready');
    // The newest finalized bucket is a real 1m-aligned epoch second.
    const newest = Number((await status.getAttribute('data-history-newest')) ?? '-1');
    expect(newest % 60).toBe(0);

    // Live continuation: more bars appear without a new hydration, and the
    // epoch never changes because the process never restarted.
    await waitForCandles(page, observed + 1, 75_000);
    await expect(status).toHaveAttribute('data-history-epoch', epoch ?? '');
  });

  test('reload returns to the surviving process memory rather than starting empty', async ({
    page,
    tradeAccount,
  }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);
    await selectTimeframe(page, '1m');

    const status = page.locator(HISTORY_STATUS);
    const before = await waitForCandles(page, 3);
    const epochBefore = await status.getAttribute('data-history-epoch');
    const newestBefore = Number((await status.getAttribute('data-history-newest')) ?? '-1');

    await page.reload();
    await openWorkstation(page);
    await expect(status).toHaveAttribute('data-history-status', 'ready', { timeout: 30_000 });

    // W3 §69 — the browser restarted, the realtime process did not. Same memory
    // generation, and at least as much observed history as before: a chart that
    // started empty here would be the pre-W3 defect.
    expect(await status.getAttribute('data-history-epoch')).toBe(epochBefore);
    const after = Number((await status.getAttribute('data-history-candles')) ?? '0');
    expect(after).toBeGreaterThanOrEqual(before);
    expect(Number(await status.getAttribute('data-history-newest'))).toBeGreaterThanOrEqual(
      newestBefore,
    );
  });

  test('symbol switches never show another instrument’s bars', async ({ page, tradeAccount }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);
    await waitForCandles(page, 1);

    const status = page.locator(HISTORY_STATUS);

    for (const symbol of ['XAUUSD', 'NAS100', 'EURUSD'] as const) {
      if (symbol === 'EURUSD') {
        // The canonical transport permits six history requests per 10s. Each
        // symbol currently performs its initial hydration plus one bounded
        // prepend, so page load + XAUUSD + NAS100 deliberately consumes that
        // budget. Pace the return switch past the fixed window: a seventh
        // immediate request correctly returns `rate_limited` and says nothing
        // about cross-symbol isolation.
        await page.waitForTimeout(10_100);
      }
      await page
        .getByTestId('market-navigator')
        .first()
        .getByRole('button', { name: new RegExp(`^${symbol}`) })
        .first()
        .click();
      await expect(page.getByRole('group', { name: `Graphique ${symbol}` })).toBeVisible({
        timeout: 15_000,
      });
      // Each switch resolves its own request; none is left loading, and none
      // errors because a previous symbol's response arrived late.
      await expect(status).not.toHaveAttribute('data-history-status', 'error', {
        timeout: 30_000,
      });
      await expect
        .poll(async () => status.getAttribute('data-history-status'), { timeout: 30_000 })
        .not.toBe('loading');
    }
  });

  test('each timeframe requests and hydrates its own interval', async ({ page, tradeAccount }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);

    const status = page.locator(HISTORY_STATUS);

    // 1m first: the shortest supported professional interval.
    await selectTimeframe(page, '1m');
    await waitForCandles(page, 2);
    expect(Number(await status.getAttribute('data-history-newest')) % 60).toBe(0);

    for (const timeframe of ['5m', '1h'] as const) {
      await selectTimeframe(page, timeframe);
      // A longer interval may legitimately have nothing finalized yet on a
      // young process — `empty` is the honest answer, `error` is not.
      await expect
        .poll(async () => status.getAttribute('data-history-status'), { timeout: 30_000 })
        .not.toBe('loading');
      expect(['ready', 'empty']).toContain(await status.getAttribute('data-history-status'));

      const newest = await status.getAttribute('data-history-newest');
      if (newest) {
        expect(Number(newest) % (timeframe === '5m' ? 300 : 3_600)).toBe(0);
      }
    }

    // The offered set, read off the control itself rather than probed one
    // absent label at a time. WX2 exposes the complete professional interval
    // contract while legacy subminute intervals remain internal-only fixtures.
    const intervals = page.getByRole('radiogroup', { name: 'Intervalle du graphique' });
    await expect(intervals.getByRole('radio')).toHaveText([
      '1m',
      '3m',
      '5m',
      '15m',
      '30m',
      '1h',
      '4h',
      '1D',
      '1W',
      '1M',
    ]);
    for (const unsupported of ['5s', '15s', '30s', '1000T']) {
      await expect(page.getByRole('radio', { name: unsupported, exact: true })).toHaveCount(0);
    }
  });

  test('history failure leaves the live feed and execution controls untouched', async ({
    page,
    tradeAccount,
  }) => {
    // W3 §72 — force history to fail while the tick stream stays healthy, by
    // rewriting only the history frames on the wire. Nothing in the product is
    // modified to make this testable.
    await page.routeWebSocket(/\/ws/, (ws) => {
      const server = ws.connectToServer();
      // Only the server→client direction is filtered. Deliberately no
      // `ws.onMessage` handler: installing one would make this proxy responsible
      // for forwarding client→server too, and the `subscribe` frame the client
      // sends the instant its socket opens can precede the upstream connection —
      // dropping it silently costs the page its symbol specs, so history never
      // even starts and the chart sits in `idle`. Leaving that direction to
      // Playwright's own buffered forwarding removes the race entirely.
      server.onMessage((message) => {
        const text = typeof message === 'string' ? message : message.toString();
        if (text.includes('"market_history_result"')) {
          const envelope = JSON.parse(text) as { payload: { requestId: string } };
          ws.send(
            JSON.stringify({
              type: 'market_history_error',
              version: 1,
              sequence: 0,
              occurredAt: new Date().toISOString(),
              correlationId: envelope.payload.requestId,
              payload: {
                requestId: envelope.payload.requestId,
                code: 'unavailable',
                message: 'Historique indisponible.',
              },
            }),
          );
          return;
        }
        ws.send(message);
      });
    });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
      'data-connection',
      'open',
      { timeout: 30_000 },
    );

    const status = page.locator(HISTORY_STATUS);
    await expect(status).toHaveAttribute('data-history-status', 'error', { timeout: 30_000 });
    await expect(status).toContainText('Historique indisponible. Le flux temps réel continue.');

    // The live feed is unaffected: real quotes still arrive and keep moving.
    const trigger = liveQuote(page);
    await expect(trigger).not.toContainText('—', { timeout: 30_000 });
    const firstQuote = await trigger.textContent();
    await expect.poll(async () => trigger.textContent(), { timeout: 30_000 }).not.toBe(firstQuote);

    // And so is execution: the order ticket's Buy/Sell are still enabled,
    // governed by risk/feed truth rather than by history.
    await expect(page.getByRole('button', { name: 'Buy', exact: true }).first()).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Sell', exact: true }).first()).toBeEnabled();

    // A history failure is not a stale market and not a global outage: it stays
    // inside the chart.
    await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
      'data-connection',
      'open',
    );
  });
});

test.describe('WariX W3 market history — accessibility', { tag: ['@trade'] }, () => {
  test('adds no critical or serious violations in any history state', async ({
    page,
    tradeAccount,
  }) => {
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);
    await waitForCandles(page, 1);

    const hydrated = await new AxeBuilder({ page }).analyze();
    expect(
      hydrated.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
      JSON.stringify(hydrated.violations, null, 2),
    ).toHaveLength(0);

    // W3 §75 — the error state adds a polite status region; scan it too rather
    // than assuming a one-element overlay is safe.
    await page.routeWebSocket(/\/ws/, (ws) => {
      const server = ws.connectToServer();
      // Only the server→client direction is filtered. Deliberately no
      // `ws.onMessage` handler: installing one would make this proxy responsible
      // for forwarding client→server too, and the `subscribe` frame the client
      // sends the instant its socket opens can precede the upstream connection —
      // dropping it silently costs the page its symbol specs, so history never
      // even starts and the chart sits in `idle`. Leaving that direction to
      // Playwright's own buffered forwarding removes the race entirely.
      server.onMessage((message) => {
        const text = typeof message === 'string' ? message : message.toString();
        if (text.includes('"market_history_result"')) {
          const envelope = JSON.parse(text) as { payload: { requestId: string } };
          ws.send(
            JSON.stringify({
              type: 'market_history_error',
              version: 1,
              sequence: 0,
              occurredAt: new Date().toISOString(),
              correlationId: envelope.payload.requestId,
              payload: {
                requestId: envelope.payload.requestId,
                code: 'unavailable',
                message: 'Historique indisponible.',
              },
            }),
          );
          return;
        }
        ws.send(message);
      });
    });
    await page.goto('/trade');
    await expect(page.locator(HISTORY_STATUS)).toHaveAttribute('data-history-status', 'error', {
      timeout: 30_000,
    });

    const failed = await new AxeBuilder({ page }).analyze();
    expect(
      failed.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
      JSON.stringify(failed.violations, null, 2),
    ).toHaveLength(0);
  });
});

test.describe('WariX W3 market history — mobile', { tag: ['@trade', '@mobile'] }, () => {
  test('hydrates inside the chart-first layout without breaking the sheets', async ({
    page,
    tradeAccount,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await openWorkstation(page);
    await waitForCandles(page, 1);

    const status = page.locator(HISTORY_STATUS);
    await expect(status).toHaveAttribute('data-history-status', 'ready', { timeout: 30_000 });

    // W3 §74 — the history overlay is chart-local, so it must not introduce a
    // horizontal overflow at 390 px.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    // Exactly one chart tree, not a second mobile one.
    await expect(page.locator(HISTORY_STATUS)).toHaveCount(1);

    // The sheets still work with history on screen.
    await page.getByTestId('mobile-market-trigger').click();
    await expect(page.getByRole('dialog').getByTestId('market-search')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByTestId('mobile-dock-trigger').click();
    await expect(page.getByRole('tab', { name: /^Positions/ })).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(status).toHaveAttribute('data-history-status', 'ready');
  });
});
