import { mkdirSync, writeFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX Workstation 2026 — W5 human-review visual evidence.
 *
 * Captures the states §146 asks for, and nothing else: no product behaviour, no
 * pixel assertions, and **not** part of any gate. Run explicitly:
 *
 *   pnpm --filter @wariba/web exec playwright test \
 *     tests/e2e/warix-w5-evidence.spec.ts --project=desktop
 *
 * ## Readiness is state-specific, because history is honest
 *
 * The first version of this spec had one shared readiness gate that required
 * every default indicator to hold a value before any screenshot. Since the
 * preset includes SMA 100, that silently demanded **100 genuinely observed
 * candles on every timeframe it was called for** — and W3's history is observed
 * process memory at one tick per second, so:
 *
 *   5s → ~8 min · 15s → ~25 min · 30s → ~50 min · 1m → ~1 h 40 · 3m → ~5 h
 *
 * against a 10-minute test timeout. The spec could not honestly execute. The
 * fix is *not* to fabricate candles, shorten the market's clock or hide missing
 * indicator values — it is to ask each screenshot for the readiness it actually
 * needs:
 *
 * - **Indicator proof** (§A) runs on one timeframe only, the shortest honest one
 *   (5s), and waits for the realtime process to genuinely observe enough bars
 *   for SMA 100 to have a value.
 * - **Timeframe proof** (§B) asks only that the interval became active and the
 *   chart honestly rendered whatever it has observed. Sparse 1m/3m history on a
 *   young process is a correct W3 state, not a failure, and the manifest records
 *   the depth rather than pretending it away.
 * - **Drawing proof** (§C) needs geometry, not depth: specs loaded, history
 *   resolved, a plot to click in.
 *
 * ## Backfill is waited for, not sampled
 *
 * The older-history page is asynchronous. Reading the candle count straight
 * after the pan gesture can record `pageLanded: false` before the response has
 * arrived. The harness now polls for one of two truthful terminal outcomes —
 * a page lands, or the server reports no older retained page — and says which.
 *
 * Viewport preservation (§21) is proved through the UI that already exists: the
 * OHLC legend reports the bar under the crosshair, so the same reading at the
 * same pixel before and after a prepend means the bar did not move. No
 * production debug state was added for a screenshot.
 */
const OUT_DIR = 'test-results/warix-w5-review';

/** §A — SMA 100's warm-up, on the shortest honest interval. 100 bars × 5s ≈ 8 min. */
const INDICATOR_TIMEFRAME = '5s';
const INDICATOR_MINIMUM_CANDLES = 100;
/** Generous: this is genuine observation time, and the process may be cold. */
const INDICATOR_WARMUP_TIMEOUT_MS = 900_000;
/** A second page needs more than one initial page (400) retained. 400 × 5s ≈ 34 min. */
const BACKFILL_TIMEOUT_MS = 300_000;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

test.describe('WariX W5 review evidence', { tag: ['@warix-w5-evidence'] }, () => {
  test('captures timeframes, indicators, drawings and a backfilled chart', async ({
    page,
    tradeAccount,
  }) => {
    // Bounded by the two genuine waits above plus the captures themselves.
    test.setTimeout(1_800_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);

    const status = page.getByTestId('chart-history-status');
    const chart = (): Locator => page.getByRole('group', { name: /Graphique/ });

    const candleCount = async (): Promise<number> =>
      Number((await status.getAttribute('data-history-candles')) ?? '0');
    const historyStatus = async (): Promise<string> =>
      (await status.getAttribute('data-history-status')) ?? '';
    const sourceEpoch = async (): Promise<string> =>
      (await status.getAttribute('data-history-epoch')) ?? '';
    const hasMoreOlder = async (): Promise<string> =>
      (await chart().getAttribute('data-history-has-more-older')) ?? '';

    /**
     * The server rate-limits market-history requests to 6 per 10 s per
     * connection (W3, `HISTORY_RATE_LIMIT_MAX_REQUESTS`). That limit is correct
     * and is not relaxed for evidence: a harness that clicks through five
     * timeframes plus a symbol switch inside one window trips it, the chart
     * honestly reports `error`, and the screenshot would be of a rate-limited
     * chart rather than of chart intelligence.
     *
     * So the harness models the limiter instead of sleeping arbitrarily: it
     * keeps the timestamps of the requests it has caused and waits only as long
     * as the oldest one needs to fall out of the window.
     */
    const HISTORY_RATE_LIMIT_MAX = 6;
    const HISTORY_RATE_LIMIT_WINDOW_MS = 10_000;
    /**
     * A hydration costs **two** requests, not one: the live-edge page, then the
     * automatic older page that `fitContent()` triggers whenever the server has
     * more (see §15's known limitation). An earlier version of this pacer
     * charged one, which was survivable only while the process was young enough
     * that most intervals fitted in a single page — and started tripping the
     * limit as soon as it had genuinely observed more history.
     */
    const REQUESTS_PER_HYDRATION = 2;
    const requestTimestamps: number[] = [];
    const paceHistoryRequest = async (): Promise<void> => {
      for (let charge = 0; charge < REQUESTS_PER_HYDRATION; charge += 1) {
        const now = Date.now();
        while (
          requestTimestamps.length > 0 &&
          now - requestTimestamps[0]! > HISTORY_RATE_LIMIT_WINDOW_MS
        ) {
          requestTimestamps.shift();
        }
        if (requestTimestamps.length >= HISTORY_RATE_LIMIT_MAX - 1) {
          const oldest = requestTimestamps[0]!;
          const waitMs = HISTORY_RATE_LIMIT_WINDOW_MS - (now - oldest) + 250;
          if (waitMs > 0) await page.waitForTimeout(waitMs);
          requestTimestamps.shift();
        }
        requestTimestamps.push(Date.now());
      }
    };

    const openWorkstation = async (): Promise<void> => {
      await paceHistoryRequest();
      await page.goto('/trade');
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      await expect(chart().locator('canvas').first()).toBeVisible({ timeout: 30_000 });
    };

    /**
     * The floor every capture shares: the chart resolved to a terminal state
     * against an identified memory generation.
     *
     * `ready` **or** `empty` — a young process that has observed no finalized
     * bar of the selected interval yet is honestly `empty`, and §D says that is
     * not a failure. What is never acceptable is photographing `loading`.
     */
    const waitForResolvedHistory = async (): Promise<void> => {
      await expect
        .poll(historyStatus, {
          timeout: 120_000,
          intervals: [500],
          message:
            'history resolves to ready or empty — `error` here usually means the harness outran the server rate limit; see paceHistoryRequest',
        })
        .toMatch(/^(ready|empty)$/);
      await expect(status).toHaveAttribute('data-history-epoch', /.+/, { timeout: 30_000 });
    };

    /**
     * §A — the indicator proof's own gate, used for one timeframe only.
     *
     * Two conditions, both about genuinely observed data: enough finalized bars
     * for the longest average, and a legend with no em dash left in it. The
     * second is what actually proves SMA 100 is calculating rather than warming
     * up, and it is deliberately *not* required anywhere else in this file.
     */
    const waitForIndicatorWarmup = async (): Promise<number> => {
      await waitForResolvedHistory();
      await expect
        .poll(candleCount, {
          timeout: INDICATOR_WARMUP_TIMEOUT_MS,
          intervals: [5_000],
          message: `${INDICATOR_MINIMUM_CANDLES} genuinely observed ${INDICATOR_TIMEFRAME} candles (process warm-up, not fabrication)`,
        })
        .toBeGreaterThanOrEqual(INDICATOR_MINIMUM_CANDLES);
      await expect(page.getByTestId('chart-indicator-legend')).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => (await page.getByTestId('chart-indicator-legend').textContent()) ?? '', {
          timeout: 120_000,
          intervals: [2_000],
          message: 'every default indicator, SMA 100 included, holds a value',
        })
        .not.toContain('—');
      return candleCount();
    };

    const selectTimeframe = async (timeframe: string): Promise<void> => {
      await paceHistoryRequest();
      await page.getByRole('radio', { name: timeframe, exact: true }).click();
      await expect(page.getByRole('radio', { name: timeframe, exact: true })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await waitForResolvedHistory();
    };

    // Scoped to the navigator, matching warix-w3-evidence.spec.ts: a bare
    // role=button regex also matches the mobile market trigger and the
    // execution header, and which one wins depends on the viewport.
    const selectSymbol = async (symbol: string): Promise<void> => {
      await paceHistoryRequest();
      await page
        .getByTestId('market-navigator')
        .first()
        .getByRole('button', { name: new RegExp(`^${symbol}`) })
        .first()
        .click();
      await expect(page.getByRole('group', { name: `Graphique ${symbol}` })).toBeVisible({
        timeout: 15_000,
      });
      await waitForResolvedHistory();
    };

    const selectTool = async (name: string): Promise<void> => {
      await page.getByTestId('chart-tools-trigger').click();
      await page.getByRole('button', { name, exact: true }).click();
    };

    const plotBox = async (): Promise<{ x: number; y: number; width: number; height: number }> => {
      const box = await chart().boundingBox();
      if (!box) throw new Error('chart has no bounding box');
      return box;
    };

    /** Two chart clicks at fractions of the plot box — enough for any two-anchor tool. */
    const drawTwoPoints = async (
      from: { x: number; y: number },
      to: { x: number; y: number },
    ): Promise<void> => {
      const box = await plotBox();
      await page.mouse.click(box.x + box.width * from.x, box.y + box.height * from.y);
      await page.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y);
      await page.mouse.click(box.x + box.width * to.x, box.y + box.height * to.y);
    };

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
    };

    const documentOverflow = async (): Promise<boolean> =>
      page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );

    const manifest: Record<string, unknown> = {
      capturedAt: new Date().toISOString(),
      historySource: 'observed process memory (W3) — no fabricated candles',
    };

    // =====================================================================
    // §B — TIMEFRAME PROOF. Selection works, the interval becomes active, and
    // whatever was genuinely observed is rendered. SMA 100 is NOT required.
    // =====================================================================
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkstation();
    await selectSymbol('NAS100');

    const timeframeProof: Record<string, unknown> = {};
    for (const timeframe of ['5s', '15s', '30s', '1m', '3m']) {
      await selectTimeframe(timeframe);
      const observed = await candleCount();
      timeframeProof[timeframe] = {
        active: await page
          .getByRole('radio', { name: timeframe, exact: true })
          .getAttribute('aria-checked'),
        historyStatus: await historyStatus(),
        observedCandles: observed,
        // §D — sparse long-interval history on a young process is honest, and
        // is recorded as such rather than read as a defect.
        note:
          observed < 100
            ? 'sparse — fewer observed bars than a 100-period average needs; correct W3 state'
            : 'sufficient for every default indicator',
      };
      // The two intervals W5 adds are captured here, inside the one pass, so
      // the harness does not switch timeframe twice for the same evidence.
      if (timeframe === '15s') await shot('1440x900-02a-nas100-15s-timeframe-active');
      if (timeframe === '3m') await shot('1440x900-02b-nas100-3m-timeframe-active');
    }
    manifest.timeframeProof = timeframeProof;

    // Toolbar density (§62), measured rather than eyeballed.
    const toolbarBox = await page.getByTestId('chart-toolbar').boundingBox();
    manifest.toolbarHeightAt1440 = toolbarBox ? Math.round(toolbarBox.height) : null;
    manifest.documentOverflowAt1440 = await documentOverflow();

    // =====================================================================
    // §C — DRAWING PROOF. Needs geometry, not depth.
    // =====================================================================
    await selectSymbol('EURUSD');
    await selectTimeframe('3m');
    manifest.drawingProof = {
      timeframe: '3m',
      historyStatus: await historyStatus(),
      observedCandles: await candleCount(),
      note: 'drawings require a plot and a price scale, not a warmed 100-period average',
    };

    /**
     * Anchors snap to a **loaded candle time** (§47), so on a young process's 3m
     * chart — a dozen bars occupying the left third of the plot — a click at 70%
     * of the width snaps back to the newest bar and the drawing renders cramped.
     * That is the model behaving correctly, not a defect, but it is poor
     * evidence. The anchor fractions therefore follow where the candles actually
     * are, which the chart already reports.
     */
    const sparse = (await candleCount()) < 40;
    const near = sparse ? 0.1 : 0.25;
    const far = sparse ? 0.3 : 0.7;

    await selectTool('Ligne de tendance');
    await drawTwoPoints({ x: near, y: 0.65 }, { x: far, y: 0.35 });
    await selectTool('Ligne horizontale');
    const box = await plotBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45);
    await expect(chart()).toHaveAttribute('data-drawing-count', '2');
    await shot('1440x900-03-eurusd-3m-trend-and-horizontal');

    /**
     * §115/§77 — the same two records, read on a different interval. Drawings
     * are symbol-scoped and never timeframe-scoped, so switching to 15s must
     * show the same two drawings at the same time/price anchors, not duplicates
     * and not nothing.
     */
    await selectTimeframe('15s');
    await expect(chart()).toHaveAttribute('data-drawing-count', '2');
    manifest.timeframeSharing = {
      drawnOn: '3m',
      readOn: '15s',
      drawingCount: await chart().getAttribute('data-drawing-count'),
      note: 'same records, no duplication — drawings are symbol-scoped, never timeframe-scoped',
    };
    await shot('1440x900-03b-eurusd-15s-same-drawings-other-timeframe');

    // Fibonacci and the rectangle go on the denser interval, where the tool is
    // actually legible for a reviewer.
    await selectTool('Fibonacci');
    await drawTwoPoints({ x: 0.3, y: 0.25 }, { x: 0.62, y: 0.75 });
    await selectTool('Rectangle');
    await drawTwoPoints({ x: 0.68, y: 0.3 }, { x: 0.88, y: 0.6 });
    await expect(chart()).toHaveAttribute('data-drawing-count', '4');
    await shot('1440x900-04-eurusd-fibonacci-and-rectangle');
    manifest.drawingsOnChart = await chart().getAttribute('data-drawing-count');

    // =====================================================================
    // §A — INDICATOR PROOF. One timeframe, genuinely warmed.
    // =====================================================================
    await selectSymbol('NAS100');
    await selectTimeframe(INDICATOR_TIMEFRAME);
    const indicatorCandles = await waitForIndicatorWarmup();
    manifest.indicatorProof = {
      timeframe: INDICATOR_TIMEFRAME,
      observedCandles: indicatorCandles,
      legend: await page.getByTestId('chart-indicator-legend').textContent(),
      sourceEpoch: await sourceEpoch(),
    };
    await shot('1440x900-01-nas100-5s-four-moving-averages');

    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('chart-indicator-options')).toBeVisible();
    await shot('1440x900-02-nas100-indicator-menu');
    await page.keyboard.press('Escape');

    // =====================================================================
    // BACKFILL — waited for, not sampled.
    // =====================================================================
    const plot = await plotBox();
    /** A fixed pixel inside the plot; the OHLC legend reports the bar under it. */
    const referenceX = plot.x + plot.width * 0.35;
    const referenceY = plot.y + plot.height * 0.5;
    const readReferenceBar = async (): Promise<string> => {
      await page.mouse.move(referenceX, referenceY);
      // The legend updates only when the bar under the crosshair changes, so a
      // short settle is enough and no arbitrary sleep is load-bearing.
      await expect(page.getByTestId('chart-ohlc-legend')).toBeVisible({ timeout: 10_000 });
      return (await page.getByTestId('chart-ohlc-legend').textContent()) ?? '';
    };

    const epochBefore = await sourceEpoch();
    const hasMoreBefore = await hasMoreOlder();
    /**
     * Recorded because the first evidence run surfaced it: hydration ends with
     * `fitContent()` (W3 §44), which puts the entire loaded series in view, so
     * the leftmost visible logical index is ~0 and the 50-bar backfill threshold
     * is already crossed. One older page therefore loads with **no pan at all**.
     *
     * Not a correctness fault — the merge deduplicates, the viewport is
     * compensated, single-inflight holds and the epoch is stable — but it is a
     * behavioural deviation from §17/§18's "when the trader pans", and it costs
     * one extra history request per hydration. Left exactly as it is: this pass
     * is explicitly forbidden from changing production history behaviour. The
     * numbers are surfaced here so a human can decide.
     */
    const candlesAtPanStart = await candleCount();
    await shot('1440x900-05a-before-pan-left');

    /** One pan-left gesture: drag the plot to the right, which moves back in time. */
    const panLeftOnce = async (): Promise<void> => {
      await page.mouse.move(plot.x + plot.width * 0.25, plot.y + plot.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(plot.x + plot.width * 0.9, plot.y + plot.height * 0.5, { steps: 15 });
      await page.mouse.up();
    };

    // Pan in steps until the count moves, sampling the reference bar after each
    // settled step. The last sample taken while the count was still unchanged is
    // the honest "before" reading.
    let candlesBefore = await candleCount();
    let referenceBefore = await readReferenceBar();
    /**
     * Whether the "before" reading can isolate the prepend.
     *
     * It only can when the page landed *after* the reading was taken and with no
     * panning in between — otherwise the reading differs because the trader
     * moved the chart, not because the prepend failed to compensate, and the
     * comparison would report a false negative. The mirror risk is a false
     * positive: if the page lands between reading the count and reading the
     * legend, both samples are post-prepend and trivially equal. Both are closed
     * by re-reading the count after the legend and demanding it is unchanged.
     */
    let cleanBeforeSample = false;

    for (let step = 0; step < 25; step += 1) {
      await panLeftOnce();
      const after = await candleCount();
      if (after > candlesBefore) {
        cleanBeforeSample = false;
        break;
      }
      candlesBefore = after;
      referenceBefore = await readReferenceBar();
      cleanBeforeSample = (await candleCount()) === candlesBefore;
      if ((await hasMoreOlder()) === 'false') break;
    }

    /**
     * The terminal outcome. Either an older page lands and the count rises, or
     * the server says nothing older is retained — §23's retention floor, which
     * is a truthful end state and not a failure.
     */
    let pageLanded = (await candleCount()) > candlesBefore;
    if (!pageLanded && (await hasMoreOlder()) === 'true') {
      await expect
        .poll(
          async () => (await candleCount()) > candlesBefore || (await hasMoreOlder()) === 'false',
          {
            timeout: BACKFILL_TIMEOUT_MS,
            intervals: [500],
            message: 'an older page lands, or the server reports no older retained page',
          },
        )
        .toBe(true);
      pageLanded = (await candleCount()) > candlesBefore;
    }

    const candlesAfter = await candleCount();
    // Read at the same pixel, with the pointer never having left it between the
    // prepend and this reading.
    const referenceAfter = await readReferenceBar();

    manifest.backfill = {
      timeframe: INDICATOR_TIMEFRAME,
      candlesAtPanStart,
      automaticPageOnHydrationNote:
        'hydration ends with fitContent(), so the whole series is visible and the 50-bar threshold is already crossed — one older page loads before any pan. Observed, not changed (see the spec comment).',
      candlesBefore,
      candlesAfter,
      pageLanded,
      hasMoreOlderBefore: hasMoreBefore,
      hasMoreOlderAfter: await hasMoreOlder(),
      sourceEpochBefore: epochBefore,
      sourceEpochAfter: await sourceEpoch(),
      sourceEpochStable: epochBefore === (await sourceEpoch()),
      /**
       * §21, proved through existing UI rather than added debug state: the OHLC
       * legend names the bar under the crosshair, so an identical reading at an
       * identical pixel means the prepend did not move it. `null` when no page
       * landed, because there is then nothing to have preserved.
       */
      referenceBarBefore: referenceBefore,
      referenceBarAfter: referenceAfter,
      viewportPreserved:
        pageLanded && cleanBeforeSample ? referenceBefore === referenceAfter : null,
      viewportNote: !pageLanded
        ? 'no older page landed; retention floor reached, nothing to preserve'
        : !cleanBeforeSample
          ? 'the page landed inside a pan step, so a before/after reading would measure the pan rather than the prepend — indeterminate rather than guessed'
          : referenceBefore === referenceAfter
            ? 'same pixel, same bar across the prepend → the logical range shifted, the trader did not'
            : 'the bar under the reference pixel changed across the prepend — investigate',
      exactPrependedCountNote:
        'the exact shift is asserted in chart-interaction-priority.test.tsx (setVisibleLogicalRange from+N, no fitContent); no production debug state was added here',
    };
    await shot('1440x900-05b-backfilled-scrolled-left');

    // =====================================================================
    // 1920×1080 — the whole workstation
    // =====================================================================
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openWorkstation();
    await waitForResolvedHistory();
    await expect(page.getByTestId('execution-bid')).not.toHaveText('—', { timeout: 30_000 });
    await shot('1920x1080-06-workstation-chart-tools-and-execution-center');

    // =====================================================================
    // 390×844 mobile
    // =====================================================================
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkstation();
    await waitForResolvedHistory();
    await shot('390x844-07-chart-first-timeframe-strip');
    manifest.documentOverflowAt390 = await documentOverflow();

    await page.getByTestId('chart-tools-sheet-trigger').click();
    await expect(page.getByTestId('chart-tools-sheet')).toBeVisible();
    await shot('390x844-08-chart-tools-sheet');

    await page.getByTestId('chart-tool-horizontal_line').click();
    await expect(page.getByTestId('chart-active-tool')).toBeVisible();
    await shot('390x844-09-drawing-mode');

    const mobilePlot = await plotBox();
    await page.mouse.click(
      mobilePlot.x + mobilePlot.width * 0.5,
      mobilePlot.y + mobilePlot.height * 0.5,
    );
    await expect(page.getByTestId('chart-drawing-actions')).toBeVisible();
    await shot('390x844-10-selected-drawing-actions');

    // Every mobile width §67 names.
    const overflow: Record<string, boolean> = {};
    for (const width of [320, 360, 390, 412, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.getByTestId('chart-toolbar')).toBeVisible();
      overflow[String(width)] = await documentOverflow();
    }
    manifest.mobileDocumentOverflow = overflow;

    writeFileSync(`${OUT_DIR}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  });
});
