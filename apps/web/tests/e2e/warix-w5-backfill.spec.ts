import { mkdirSync, writeFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX W5 — a genuine pan-left backfill, proved end to end.
 *
 * The first attempt at this evidence was not a backfill test at all. The client
 * had been open while the realtime process was still young, so it accumulated
 * every retained bar *live*: 628 candles on screen, `hasMore = false`, and
 * nothing older to fetch. A manifest showing `candlesBefore == candlesAfter`
 * proves only that there was no older page to load.
 *
 * The correct condition, and what this spec sets up:
 *
 *   1. one stable realtime process, same `sourceEpoch` throughout
 *   2. it genuinely observes more than `INITIAL_HISTORY_CANDLE_LIMIT` 5s bars
 *      — real wall-clock observation, no fabricated candles, no accelerated
 *      market clock (candles are UTC-bucketed, so tick rate cannot move it)
 *   3. **only then** a fresh client opens
 *   4. its first hydration must be the bounded page, not all of history
 *   5. `hasMoreOlder` must be true before any pan
 *   6. pan to the oldest loaded edge
 *   7. wait deterministically for the older page
 *   8. assert more candles, an unchanged epoch, and a viewport that did not jump
 *
 * Step 4 is also where a second, subtler fact shows up: hydration ends with
 * `fitContent()`, which puts the whole loaded series in view and therefore
 * already satisfies the 50-bar backfill threshold, so one older page loads
 * before the trader touches anything. The manifest separates
 * `initialClientCandles` from `candlesBeforeBackfill` so both are visible, and
 * the pan is proved against the settled state.
 */
const OUT_DIR = 'test-results/warix-w5-review';

/** `INITIAL_HISTORY_CANDLE_LIMIT`. The first page must be exactly this bounded. */
const INITIAL_LIMIT = 400;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

test.describe('WariX W5 pan-left backfill', { tag: ['@warix-w5-evidence'] }, () => {
  test('a fresh client loads a bounded page, then pages older history without jumping', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(900_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);

    const chart = (): Locator => page.getByRole('group', { name: /Graphique/ });
    const status = page.getByTestId('chart-history-status');
    const candleCount = async (): Promise<number> =>
      Number((await status.getAttribute('data-history-candles')) ?? '0');
    const sourceEpoch = async (): Promise<string> =>
      (await status.getAttribute('data-history-epoch')) ?? '';
    const hasMoreOlder = async (): Promise<string> =>
      (await chart().getAttribute('data-history-has-more-older')) ?? '';
    const ohlc = async (): Promise<string> =>
      (await page.getByTestId('chart-ohlc-legend').textContent()) ?? '';

    await page.setViewportSize({ width: 1440, height: 900 });

    /**
     * The history conversation, read off the wire.
     *
     * The DOM cannot answer "was the first page bounded?": by the time a test
     * can read `data-history-candles`, the hydration-time automatic page may
     * already have merged into it, and sampling earlier is a race. The frames
     * are unambiguous — one `market_history_request` out, one
     * `market_history_result` back, with the page size the server actually sent.
     */
    const requests: {
      requestId: string;
      timeframe: string;
      limit: number;
      before: number | null;
    }[] = [];
    const results: {
      requestId: string;
      candles: number;
      hasMore: boolean;
      sourceEpoch: string;
    }[] = [];
    /**
     * How many *older-page* responses have arrived.
     *
     * The signal has to come from the wire, not from `data-history-candles`. On
     * a 5s chart a live candle finalizes every five seconds and increments that
     * counter, so "the count went up" is satisfied by the market ticking over —
     * which is how an earlier version of this spec recorded a `prependedCount`
     * of 1 and called it a backfill.
     */
    const olderPageResults = (): typeof results =>
      results.filter((result) =>
        requests.some(
          (request) => request.requestId === result.requestId && request.before !== null,
        ),
      );
    page.on('websocket', (ws) => {
      ws.on('framesent', (frame) => {
        try {
          const message = JSON.parse(String(frame.payload)) as {
            type?: string;
            history?: {
              requestId: string;
              timeframe: string;
              limit: number;
              before?: number | null;
            };
          };
          if (message.type === 'market_history_request' && message.history) {
            requests.push({
              requestId: message.history.requestId,
              timeframe: message.history.timeframe,
              limit: message.history.limit,
              before: message.history.before ?? null,
            });
          }
        } catch {
          // Non-JSON or unrelated frame — not this test's business.
        }
      });
      ws.on('framereceived', (frame) => {
        try {
          const message = JSON.parse(String(frame.payload)) as {
            type?: string;
            payload?: {
              requestId?: string;
              candles?: unknown[];
              hasMore?: boolean;
              sourceEpoch?: string;
            };
          };
          if (message.type === 'market_history_result' && message.payload) {
            results.push({
              requestId: message.payload.requestId ?? '',
              candles: message.payload.candles?.length ?? 0,
              hasMore: message.payload.hasMore === true,
              sourceEpoch: message.payload.sourceEpoch ?? '',
            });
          }
        } catch {
          // See above.
        }
      });
    });

    /** Opens a genuinely fresh client and waits for its hydration to settle. */
    const openFreshClient = async (): Promise<void> => {
      await page.goto('/trade');
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      await expect(chart().locator('canvas').first()).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => (await status.getAttribute('data-history-status')) ?? '', {
          timeout: 120_000,
          intervals: [500],
        })
        .toBe('ready');
    };

    await openFreshClient();
    // 5s is the only interval that reaches the initial limit inside a session's
    // worth of observation.
    await page.getByRole('radio', { name: '5s', exact: true }).click();
    await expect(page.getByRole('radio', { name: '5s', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect
      .poll(async () => (await status.getAttribute('data-history-status')) ?? '', {
        timeout: 60_000,
        intervals: [500],
      })
      .toBe('ready');

    /**
     * The server must genuinely retain more than one page before this is a
     * backfill test at all. Detected the honest way: a bounded first page plus
     * the server saying there is more. If the process has not observed enough
     * yet, wait for it — that is real observation time, not a workaround.
     */
    await expect
      .poll(hasMoreOlder, {
        timeout: 600_000,
        intervals: [10_000],
        message:
          'the realtime process must retain more than one initial page of 5s bars before a pan can fetch anything — genuine observation, never fabricated',
      })
      .toBe('true');

    const epochBefore = await sourceEpoch();

    /**
     * §7 — the first page is bounded, taken from the wire.
     *
     * The live-edge request is the one with no `before` cursor; its response is
     * the initial hydration. It must be capped at the initial limit even though
     * the process retains far more, and it must say there is more.
     */
    const liveEdgeIndex = requests.findIndex(
      (request) => request.timeframe === '5s' && request.before === null,
    );
    expect(
      liveEdgeIndex,
      'a live-edge 5s history request was observed on the wire',
    ).toBeGreaterThanOrEqual(0);
    const liveEdgeRequestId = requests[liveEdgeIndex]?.requestId ?? '';
    const initialResult = results.find((result) => result.requestId === liveEdgeRequestId);
    const initialClientCandles = initialResult?.candles ?? 0;
    expect(requests[liveEdgeIndex]?.limit, 'the client asks for the bounded initial page').toBe(
      INITIAL_LIMIT,
    );
    expect(
      initialClientCandles,
      'the server returns the bounded page, not all retained history',
    ).toBe(INITIAL_LIMIT);
    expect(initialResult?.hasMore, 'and says older history remains').toBe(true);

    const box = await chart().boundingBox();
    if (!box) throw new Error('chart has no bounding box');

    /** A fixed pixel well left of the live edge; the OHLC legend names its bar. */
    const referenceX = box.x + box.width * 0.3;
    const referenceY = box.y + box.height * 0.5;
    const readReference = async (): Promise<string> => {
      await page.mouse.move(referenceX, referenceY);
      await expect(page.getByTestId('chart-ohlc-legend')).toBeVisible({ timeout: 10_000 });
      return ohlc();
    };

    /** Drag right → the viewport moves back in time. `pixels` controls the step. */
    const pan = async (pixels: number): Promise<void> => {
      const startX = box.x + box.width * 0.35;
      const y = box.y + box.height * 0.5;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(startX + pixels, y, { steps: Math.max(2, Math.round(pixels / 20)) });
      await page.mouse.up();
    };

    /**
     * A ruler for §13, built from the product's own surface.
     *
     * A drawing is anchored to a candle *time*, and the overlay projects it
     * through the same coordinate adapter the chart uses — so its `x1` is a
     * direct readout of where that instant sits on screen. If the prepend
     * shifts the logical range correctly, `x1` does not move; if it does not,
     * `x1` moves by hundreds of pixels (400 bars' worth). A bar-quantised OHLC
     * reading cannot resolve that as finely, so it is kept only as a secondary
     * record.
     */
    await page.getByTestId('chart-tools-trigger').click();
    await page.getByRole('button', { name: 'Ligne de tendance', exact: true }).click();
    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
    await expect(chart()).toHaveAttribute('data-drawing-count', '1');
    const rulerX = async (): Promise<number | null> =>
      page.evaluate(() => {
        const line = document.querySelector('[data-drawing-type="trend_line"] line');
        const value = line?.getAttribute('x1');
        return value === null || value === undefined ? null : Number(value);
      });

    // Let any automatic page settle, so the pan is measured against a stable
    // series rather than racing the hydration-time fetch.
    await page.waitForTimeout(1_500);
    const candlesBeforeBackfill = await candleCount();
    await page.mouse.move(box.x + box.width / 2, box.y - 60);
    await page.screenshot({ path: `${OUT_DIR}/1440-backfill-before.png` });

    const olderPagesBefore = olderPageResults().length;

    /**
     * One uniform step size, sampled before every step.
     *
     * A coarse-then-fine scheme cannot work here: nothing observable says "you
     * are nearly at the edge", so the coarse phase lands the page itself and
     * there is never a clean pre-prepend sample. Stepping uniformly means the
     * last sample is at most one step stale, and one step is 40 px against the
     * ~1 200 px an uncompensated prepend of ~250 bars would move the anchor — a
     * wide margin, which is what makes the tolerance below honest rather than
     * convenient.
     *
     * The short settle is load-bearing: lightweight-charts processes the drag
     * and emits its visible-range change asynchronously, and a tight loop of
     * synthetic drags outruns it — 400 steps with no settle produced no request
     * at all.
     */
    const PAN_STEP_PX = 90;
    const PAN_SETTLE_MS = 60;

    /**
     * The reference reading, taken with the count still unchanged and confirmed
     * unchanged immediately after — so it is genuinely pre-prepend. From here
     * the only thing that moves the chart is the prepend itself.
     */
    const referenceBefore = await readReference();
    let rulerBefore: number | null = null;
    let cleanSample = false;
    let steps = 0;
    while (steps < 150 && olderPageResults().length === olderPagesBefore) {
      rulerBefore = await rulerX();
      cleanSample = olderPageResults().length === olderPagesBefore;
      await pan(PAN_STEP_PX);
      await page.waitForTimeout(PAN_SETTLE_MS);
      steps += 1;
    }

    await expect
      .poll(() => olderPageResults().length, {
        timeout: 60_000,
        intervals: [250],
        message: 'an older-page response arrives on the wire',
      })
      .toBeGreaterThan(olderPagesBefore);
    const panPage = olderPageResults().at(-1);

    const candlesAfterBackfill = await candleCount();
    const referenceAfter = await readReference();
    const epochAfter = await sourceEpoch();

    // §11-§13. The page size comes from the wire; the DOM delta additionally
    // includes any live candle that finalized while panning, which is why the
    // two are reported separately.
    expect(panPage?.candles ?? 0, 'the pan fetched a non-empty older page').toBeGreaterThan(0);
    expect(candlesAfterBackfill).toBeGreaterThan(candlesBeforeBackfill);
    expect(epochAfter, 'the memory generation must not change under a pagination').toBe(
      epochBefore,
    );

    await page.mouse.move(box.x + box.width / 2, box.y - 60);
    await page.screenshot({ path: `${OUT_DIR}/1440-backfill-after.png` });

    const rulerAfter = await rulerX();
    /** One pan step of slack, plus room for sub-pixel rounding. */
    const RULER_TOLERANCE_PX = PAN_STEP_PX + 30;
    const rulerDelta =
      rulerBefore !== null && rulerAfter !== null ? Math.abs(rulerAfter - rulerBefore) : null;
    const viewportPreserved =
      cleanSample && rulerDelta !== null ? rulerDelta <= RULER_TOLERANCE_PX : null;

    // A failure here is the §21 defect itself: the trader panned back in time
    // and the chart yanked them somewhere else when the page arrived.
    if (viewportPreserved !== null) {
      expect(
        viewportPreserved,
        `the anchored drawing moved ${String(rulerDelta)}px across the prepend`,
      ).toBe(true);
    }

    writeFileSync(
      `${OUT_DIR}/backfill.json`,
      `${JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          timeframe: '5s',
          serverRetainedMoreThanOnePage: initialResult?.hasMore === true,
          initialClientCandles,
          initialPageIsBounded: initialClientCandles <= INITIAL_LIMIT,
          hasMoreOlderBefore: 'true',
          historyFramesObserved: {
            requests,
            results: results.map((result) => ({
              candles: result.candles,
              hasMore: result.hasMore,
            })),
          },
          candlesBeforeBackfill,
          candlesAfterBackfill,
          prependedCount: panPage?.candles ?? 0,
          domCandleDelta: candlesAfterBackfill - candlesBeforeBackfill,
          domDeltaNote:
            'the DOM delta also counts any live candle that finalized during the pan; prependedCount is the older page the server actually sent',
          pageLanded: (panPage?.candles ?? 0) > 0,
          hasMoreOlderAfter: await hasMoreOlder(),
          sourceEpochBefore: epochBefore,
          sourceEpochAfter: epochAfter,
          sourceEpochStable: epochBefore === epochAfter,
          referenceBarBefore: referenceBefore,
          referenceBarAfter: referenceAfter,
          anchoredDrawingXBefore: rulerBefore,
          anchoredDrawingXAfter: rulerAfter,
          anchoredDrawingShiftPx: rulerDelta,
          anchoredDrawingTolerancePx: RULER_TOLERANCE_PX,
          panStepPx: PAN_STEP_PX,
          panSteps: steps,
          viewportPreserved,
          viewportNote:
            viewportPreserved === null
              ? 'the page landed before a clean pre-prepend sample could be taken — reported as indeterminate rather than guessed'
              : viewportPreserved
                ? 'a drawing anchored to a candle time stayed put across the prepend → the logical range shifted, the trader did not'
                : 'the anchored drawing moved across the prepend — the viewport was not compensated',
          automaticPageOnHydrationNote:
            'hydration ends with fitContent(), which already satisfies the 50-bar threshold, so one older page can load before any pan. initialClientCandles is the bounded first page; candlesBeforeBackfill is the settled state the pan was measured against.',
          historySource: 'observed process memory (W3) — no fabricated candles',
        },
        null,
        2,
      )}\n`,
    );
  });
});
