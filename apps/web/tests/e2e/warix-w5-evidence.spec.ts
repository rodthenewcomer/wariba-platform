import { mkdirSync, writeFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX Workstation 2026 — W5 human-review visual evidence.
 *
 * Captures the states a reviewer asked for in §146, and nothing else: no
 * product behaviour, no pixel assertions, and **not** part of any gate. Run
 * explicitly:
 *
 *   pnpm --filter @wariba/web exec playwright test \
 *     tests/e2e/warix-w5-evidence.spec.ts --project=desktop
 *
 * W5 §145's readiness rule is the one that matters here and it is stricter than
 * W3's. A screenshot is only evidence of chart intelligence if the chart is
 * genuinely intelligent at the moment it is taken: connection open, symbol specs
 * loaded, history `ready`, **enough finalized candles for a 100 SMA to have a
 * value**, and the indicator legend actually printing numbers rather than dashes.
 * A shot of one giant candle with four flat lines would misrepresent the
 * milestone, so `waitForAnalysis` refuses to return until all of that holds.
 *
 * The manifest records what a screenshot cannot: how deep the observed history
 * was, whether the pan-left backfill actually fired, and by how many bars the
 * viewport was compensated — the number §21 exists to protect.
 */
const OUT_DIR = 'test-results/warix-w5-review';

/** 100 SMA needs 100 bars; ask for a little more so the line has visible length. */
const MINIMUM_CANDLES_FOR_ANALYSIS = 130;

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
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);

    const status = page.getByTestId('chart-history-status');
    const chart = (): Locator => page.getByRole('group', { name: /Graphique/ });

    const openWorkstation = async (): Promise<void> => {
      await page.goto('/trade');
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      await expect(chart().locator('canvas').first()).toBeVisible({ timeout: 30_000 });
    };

    /**
     * §145 — the readiness gate. Returns the depth actually captured.
     *
     * The last condition is the W5-specific one: the indicator legend must show
     * a value for SMA 100, which is only true once 100 finalized candles have
     * genuinely been observed. Waiting on candle count alone would let a shot
     * through while the longest average was still an em dash.
     */
    const waitForAnalysis = async (minimum = MINIMUM_CANDLES_FOR_ANALYSIS): Promise<number> => {
      await expect(status).toHaveAttribute('data-history-epoch', /.+/, { timeout: 120_000 });
      await expect
        .poll(async () => Number((await status.getAttribute('data-history-candles')) ?? '0'), {
          timeout: 300_000,
          message: `${minimum} finalized candles on screen`,
        })
        .toBeGreaterThanOrEqual(minimum);
      await expect(status).toHaveAttribute('data-history-status', 'ready');
      await expect(page.getByTestId('chart-indicator-legend')).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => (await page.getByTestId('chart-indicator-legend').textContent()) ?? '', {
          timeout: 60_000,
          message: 'every default indicator has a value',
        })
        .not.toContain('—');
      return Number((await status.getAttribute('data-history-candles')) ?? '0');
    };

    const selectTimeframe = async (timeframe: string): Promise<void> => {
      await page.getByRole('radio', { name: timeframe, exact: true }).click();
      await expect(page.getByRole('radio', { name: timeframe, exact: true })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    };

    const selectSymbol = async (symbol: string): Promise<void> => {
      await page
        .getByRole('button', { name: new RegExp(`^${symbol}`) })
        .first()
        .click();
      await expect(chart()).toHaveAccessibleName(new RegExp(symbol));
    };

    const selectTool = async (name: string): Promise<void> => {
      await page.getByTestId('chart-tools-trigger').click();
      await page.getByRole('button', { name, exact: true }).click();
    };

    /** Two chart clicks at fractions of the plot box — enough for any two-anchor tool. */
    const drawTwoPoints = async (
      from: { x: number; y: number },
      to: { x: number; y: number },
    ): Promise<void> => {
      const box = await chart().boundingBox();
      if (!box) throw new Error('chart has no box');
      await page.mouse.click(box.x + box.width * from.x, box.y + box.height * from.y);
      await page.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y);
      await page.mouse.click(box.x + box.width * to.x, box.y + box.height * to.y);
    };

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
    };

    const manifest: Record<string, unknown> = {};

    // ---- 1440×900 — 1. NAS100 1m with the four default moving averages -----
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkstation();
    await selectSymbol('NAS100');
    await selectTimeframe('1m');
    manifest.nas100_1m_candles = await waitForAnalysis();
    manifest.indicatorLegend = await page.getByTestId('chart-indicator-legend').textContent();
    await shot('1440x900-01-nas100-1m-four-moving-averages');

    // Toolbar density is the §62 question, measured rather than eyeballed.
    const toolbarBox = await page.getByTestId('chart-toolbar').boundingBox();
    manifest.toolbarHeightAt1440 = toolbarBox ? Math.round(toolbarBox.height) : null;
    manifest.documentOverflowAt1440 = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    // ---- 2. NAS100 15s with the indicator menu open ------------------------
    await selectTimeframe('15s');
    await waitForAnalysis(60);
    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('chart-indicator-options')).toBeVisible();
    await shot('1440x900-02-nas100-15s-indicator-menu');
    await page.keyboard.press('Escape');

    // ---- 3. EURUSD 3m with a trend line and a horizontal line --------------
    await selectSymbol('EURUSD');
    await selectTimeframe('3m');
    await waitForAnalysis(20);
    await selectTool('Ligne de tendance');
    await drawTwoPoints({ x: 0.25, y: 0.65 }, { x: 0.7, y: 0.35 });
    await selectTool('Ligne horizontale');
    const plot = await chart().boundingBox();
    if (plot) await page.mouse.click(plot.x + plot.width * 0.5, plot.y + plot.height * 0.45);
    await expect(chart()).toHaveAttribute('data-drawing-count', '2');
    await shot('1440x900-03-eurusd-3m-trend-and-horizontal');

    // ---- 4. EURUSD with a Fibonacci retracement and a rectangle ------------
    await selectTool('Fibonacci');
    await drawTwoPoints({ x: 0.3, y: 0.25 }, { x: 0.62, y: 0.75 });
    await selectTool('Rectangle');
    await drawTwoPoints({ x: 0.68, y: 0.3 }, { x: 0.88, y: 0.6 });
    await expect(chart()).toHaveAttribute('data-drawing-count', '4');
    await shot('1440x900-04-eurusd-fibonacci-and-rectangle');
    manifest.drawingsOnChart = await chart().getAttribute('data-drawing-count');

    // ---- 5. A backfilled chart, scrolled left ------------------------------
    // §21's real question: after older bars land, is the trader still looking at
    // what they were looking at? The bar count before and after is recorded so a
    // reviewer can confirm the page arrived, and the screenshot shows where the
    // viewport ended up.
    await selectTimeframe('5s');
    const beforeBackfill = await waitForAnalysis(MINIMUM_CANDLES_FOR_ANALYSIS);
    const box = await chart().boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      // Drag right repeatedly — panning right moves the viewport back in time.
      for (let pull = 0; pull < 12; pull += 1) {
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.92, box.y + box.height * 0.5, { steps: 12 });
        await page.mouse.up();
        await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.5);
      }
    }
    const afterBackfill = Number((await status.getAttribute('data-history-candles')) ?? '0');
    manifest.backfill = {
      candlesBefore: beforeBackfill,
      candlesAfter: afterBackfill,
      pageLanded: afterBackfill > beforeBackfill,
      hasMoreOlder: await chart().getAttribute('data-history-has-more-older'),
    };
    await shot('1440x900-05-backfilled-scrolled-left');

    // ---- 6. 1920×1080 — the whole workstation ------------------------------
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openWorkstation();
    await waitForAnalysis(60);
    await shot('1920x1080-06-workstation-chart-tools-and-execution-center');

    // ---- 7-10. 390×844 mobile ---------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkstation();
    await waitForAnalysis(60);
    await shot('390x844-07-chart-first-timeframe-strip');
    manifest.documentOverflowAt390 = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    await page.getByTestId('chart-tools-sheet-trigger').click();
    await expect(page.getByTestId('chart-tools-sheet')).toBeVisible();
    await shot('390x844-08-chart-tools-sheet');

    await page.getByTestId('chart-tool-horizontal_line').click();
    await expect(page.getByTestId('chart-active-tool')).toBeVisible();
    await shot('390x844-09-drawing-mode');

    const mobilePlot = await chart().boundingBox();
    if (mobilePlot) {
      await page.mouse.click(
        mobilePlot.x + mobilePlot.width * 0.5,
        mobilePlot.y + mobilePlot.height * 0.5,
      );
    }
    await expect(page.getByTestId('chart-drawing-actions')).toBeVisible();
    await shot('390x844-10-selected-drawing-actions');

    // Every mobile viewport §67 names, checked for document overflow.
    const overflow: Record<string, boolean> = {};
    for (const width of [320, 360, 390, 412, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(150);
      overflow[String(width)] = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
    }
    manifest.mobileDocumentOverflow = overflow;

    writeFileSync(`${OUT_DIR}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  });
});
