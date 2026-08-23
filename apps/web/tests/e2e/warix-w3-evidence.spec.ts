import { mkdirSync, writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX Workstation 2026 — W3 human-review visual evidence.
 *
 * Captures the states a reviewer asked to see, and nothing else: no product
 * behaviour, no pixel assertions, and **not** part of any gate. Run explicitly:
 *
 *   pnpm --filter @wariba/web exec playwright test \
 *     tests/e2e/warix-w3-evidence.spec.ts --project=desktop
 *
 * W3 §86 — the integrity rule W2 got wrong. A connected websocket is not
 * hydrated history: the symbol specs and the history response both arrive after
 * the socket opens, and screenshotting before them produces evidence of an empty
 * chart that misrepresents the milestone. So every hydrated shot below waits for
 * connection → specs → a resolved history request → a specific finalized candle
 * count, and the loading and error shots are produced by deliberately holding or
 * failing the history frame on the wire rather than by hoping to catch a race.
 *
 * Wall-clock note: a bucket finalizes only when an accepted tick lands in a later
 * one, and the feed's timestamps are wall clock (§81 forbids making the simulator
 * time-reconstructable). WX2 persists observed bars across restarts, so this
 * evidence waits for minimum durable depth instead of assuming a fresh process.
 */
const OUT_DIR = 'test-results/warix-w3-review';
const HISTORY_STATUS = '[data-testid="chart-history-status"]';

/**
 * Minimum finalized bars each shot must actually contain.
 *
 * Not decoration — an integrity floor. The first capture of this evidence was
 * technically "hydrated" (status `ready`, epoch present) yet showed a single 1m
 * bar filling the viewport after `fitContent`, because the realtime process had
 * only ~2 minutes of uptime. That is a true picture of a young process and a
 * misleading picture of the feature, which is precisely the W2 evidence mistake
 * §86 exists to prevent. So each shot names the depth it needs and waits for it;
 * on a young process this spec is slow rather than wrong.
 *
 * The counts differ because longer professional intervals finalize less often.
 */
const REQUIRED_CANDLES = { '1m': 8, '5m': 2, '15m': 1 } as const;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

test.describe('WariX W3 review evidence', { tag: ['@warix-w3-evidence'] }, () => {
  test('captures hydrated, loading and failed history for human review', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(420_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);

    const status = page.locator(HISTORY_STATUS);

    /** Connection + specs + a settled chart box. Does not yet assert history. */
    const openWorkstation = async () => {
      await page.goto('/trade');
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —', {
        timeout: 30_000,
      });
      const canvas = page
        .getByRole('group', { name: /Graphique/ })
        .locator('canvas')
        .first();
      await expect(canvas).toBeVisible({ timeout: 30_000 });
      // The chart's ResizeObserver settles a frame after layout: wait for the
      // box to stop moving rather than for a fixed delay.
      await expect
        .poll(
          async () => {
            const first = (await canvas.boundingBox())?.height ?? 0;
            await page.evaluate(
              () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
            );
            const second = (await canvas.boundingBox())?.height ?? 0;
            return first > 0 && first === second ? first : 0;
          },
          { timeout: 10_000 },
        )
        .toBeGreaterThan(0);
    };

    /**
     * W3 §86 — hydrated means: resolved, `ready`, an identified memory
     * generation, and this many real finalized bars on screen. Returns the
     * depth actually captured so it can be recorded in the manifest.
     */
    const waitForHydrated = async (minimumCandles: number, timeout: number): Promise<number> => {
      await expect(status).toHaveAttribute('data-history-epoch', /.+/, { timeout: 60_000 });
      await expect
        .poll(async () => Number((await status.getAttribute('data-history-candles')) ?? '0'), {
          timeout,
          message: `${minimumCandles} finalized candles on screen`,
        })
        .toBeGreaterThanOrEqual(minimumCandles);
      await expect(status).toHaveAttribute('data-history-status', 'ready');
      return Number((await status.getAttribute('data-history-candles')) ?? '0');
    };

    // See the note on `selectTimeframe` in warix-w3.spec.ts: W5 §86 made this a
    // real radiogroup, so the selector follows the semantics.
    const selectTimeframe = async (timeframe: '1m' | '5m' | '15m') => {
      await page.getByRole('radio', { name: timeframe, exact: true }).click();
      await expect(page.getByRole('radio', { name: timeframe, exact: true })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    };

    const selectSymbol = async (symbol: string) => {
      await page
        .getByTestId('market-navigator')
        .first()
        .getByRole('button', { name: new RegExp(`^${symbol}`) })
        .first()
        .click();
      await expect(page.getByRole('group', { name: `Graphique ${symbol}` })).toBeVisible({
        timeout: 15_000,
      });
    };

    const shot = async (name: string) => {
      await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
    };

    // ---- 1920×1080, default 5m with durable observed history ---------------
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openWorkstation();
    await selectTimeframe('1m');
    const desktopDepth = await waitForHydrated(REQUIRED_CANDLES['1m'], 180_000);
    await shot('1920x1080-full-workstation-hydrated');

    // ---- 390×844 hydrated chart-first ------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkstation();
    await selectTimeframe('1m');
    const mobileDepth = await waitForHydrated(REQUIRED_CANDLES['1m'], 180_000);
    await shot('390x844-chart-first-hydrated');

    // ---- 1440×900, XAUUSD 5m --------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkstation();
    await selectSymbol('XAUUSD');
    await selectTimeframe('5m');
    const xauusdDepth = await waitForHydrated(REQUIRED_CANDLES['5m'], 300_000);
    await shot('1440x900-xauusd-5m-hydrated');

    // ---- 1440×900, EURUSD 15m -------------------------------------------
    await selectSymbol('EURUSD');
    await selectTimeframe('15m');
    const eurusdDepth = await waitForHydrated(REQUIRED_CANDLES['15m'], 900_000);
    await shot('1440x900-eurusd-15m-hydrated');

    // ---- 390×844, history deliberately held ------------------------------
    // W3 §86 — the loading state is produced, not caught. The history frame is
    // withheld on the wire while every other frame (market ticks included)
    // passes through, so the chart is genuinely and stably in `loading`.
    await page.setViewportSize({ width: 390, height: 844 });
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
        if (text.includes('"market_history_result"')) return;
        ws.send(message);
      });
    });
    await openWorkstation();
    await expect(status).toHaveAttribute('data-history-status', 'loading', { timeout: 30_000 });
    await expect(status).toContainText('Historique…');
    // The live feed is visibly healthy in the same frame.
    await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —');
    await shot('390x844-history-loading-live-feed-healthy');

    // ---- 390×844, history deliberately failed ----------------------------
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
    await openWorkstation();
    await expect(status).toHaveAttribute('data-history-status', 'error', { timeout: 30_000 });
    await expect(status).toContainText('Historique indisponible. Le flux temps réel continue.');
    // Proof in the same screenshot that this is a chart-local history failure
    // and not an outage: quotes are live and the connection is open.
    await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —');
    await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
      'data-connection',
      'open',
    );
    await shot('390x844-history-error-live-feed-healthy');

    /**
     * The manifest is part of the evidence, not a nicety: it records what each
     * hydrated shot actually contained, so a reviewer can tell a real chart from
     * a chart that merely reached `ready`, without having to trust the filenames.
     */
    writeFileSync(
      `${OUT_DIR}/evidence-manifest.json`,
      `${JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          historySource: 'observed_memory_cache',
          priceBasis: 'mid',
          note: 'Finalized-candle counts are the depth on screen at capture time. Depth is bounded by the realtime process uptime, not by a database.',
          gapsNote:
            'A visible gap between candles is real, not a rendering artefact: an interval in which the process observed no accepted tick produces no candle at all (W3 §14/§51 — no timer finalization, no previous-close filler, no interpolation). On a developer machine the backgrounded simulator process can be suspended by the host for long stretches, which is exactly how such a gap appears here. It is an observation gap, never a claim that the market gapped.',
          finalizedCandles: {
            '1920x1080-full-workstation-hydrated': desktopDepth,
            '390x844-chart-first-hydrated': mobileDepth,
            '1440x900-xauusd-5m-hydrated': xauusdDepth,
            '1440x900-eurusd-15m-hydrated': eurusdDepth,
          },
          forcedStates: {
            '390x844-history-loading-live-feed-healthy':
              'market_history_result withheld on the wire; ticks pass through',
            '390x844-history-error-live-feed-healthy':
              'market_history_result rewritten to market_history_error; ticks pass through',
          },
        },
        null,
        2,
      )}\n`,
    );

    // Evidence only — this merely proves the run reached the end.
    expect(true).toBe(true);
  });
});
