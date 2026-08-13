import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Workspace Layout Engine closure evidence.
 *
 * Every dimension and chart coordinate below comes from the rendered
 * workstation. Constants are used only as expected contractual outcomes; the
 * manifest never asks the pure layout engine to report its own answer.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-wx1-visual-closure/resize');
const STORAGE_KEY = 'wariba.workstation.layout';
const CHART_MARKER = 'wx1-resize-closure-chart';

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/hub(?:\?.*)?$/, { timeout: 30_000, waitUntil: 'commit' });
  await page.getByRole('link', { name: 'Ouvrir WariX' }).waitFor({ state: 'visible' });
}

interface LogicalRange {
  from: number;
  to: number;
}

interface ResizeSample {
  viewportWidth: number;
  viewportHeight: number;
  preferredNavigatorWidth: number | null;
  effectiveNavigatorWidth: number | null;
  preferredExecutionWidth: number | null;
  effectiveExecutionWidth: number | null;
  preferredDockHeight: number | null;
  effectiveDockHeight: number | null;
  chartModuleWidth: number | null;
  chartModuleHeight: number | null;
  chartPlotWidth: number | null;
  chartPlotHeight: number | null;
  logicalRange: LogicalRange | null;
  horizontalOverflow: number;
  navigatorCollapsed: boolean;
  hybridNavigatorOverlayOpen: boolean;
  visibleNavigatorTrees: number;
  visibleExecutionTrees: number;
}

test.describe('WX1 Workspace Layout Engine evidence', { tag: ['@warix-resize-evidence'] }, () => {
  test('closes responsive, chart-protection and accessible-resize gates', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });

    let countingHistory = false;
    let historyRequestsDuringResize = 0;
    await page.routeWebSocket(/\/ws/, (ws) => {
      const server = ws.connectToServer();
      ws.onMessage((message) => {
        if (typeof message === 'string' && message.includes('market.history') && countingHistory) {
          historyRequestsDuringResize += 1;
        }
        server.send(message);
      });
      server.onMessage((message) => ws.send(message));
    });

    await signIn(page, tradeAccount.email, tradeAccount.password);

    const chart = () => page.getByRole('group', { name: /^Graphique / });
    const historyStatus = () => page.getByTestId('chart-history-status');
    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };
    const settle = async (): Promise<void> => {
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      await expect(historyStatus()).toHaveAttribute('data-history-status', 'ready', {
        timeout: 60_000,
      });
      await expect(chart()).toHaveAttribute('data-visible-logical-to', /.+/, { timeout: 30_000 });
      await expect(page.getByTestId('quantity-bounds')).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(700);
    };
    const box = async (locator: Locator): Promise<{ width: number; height: number } | null> => {
      if ((await locator.count()) === 0 || !(await locator.first().isVisible())) return null;
      const rect = await locator.first().boundingBox();
      return rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null;
    };
    const storedPreferences = async (): Promise<Record<string, unknown> | null> =>
      page.evaluate((key) => {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      }, STORAGE_KEY);
    const visibleRange = async (): Promise<LogicalRange | null> => {
      const from = Number(await chart().getAttribute('data-visible-logical-from'));
      const to = Number(await chart().getAttribute('data-visible-logical-to'));
      return Number.isFinite(from) && Number.isFinite(to) ? { from, to } : null;
    };
    const sample = async (): Promise<ResizeSample> => {
      const stored = await storedPreferences();
      const viewport = page.viewportSize() ?? { width: 0, height: 0 };
      const navigator = await box(page.getByTestId('market-navigator-track'));
      const overlay = await box(page.getByTestId('market-navigator-overlay'));
      const execution = await box(page.getByTestId('execution-track'));
      const dock = await box(page.getByTestId('workstation-dock'));
      const chartModule = await box(page.getByTestId('chart-track'));
      const plot = await box(chart());
      const effectiveNavigatorWidth =
        (navigator ?? overlay)?.width ?? (viewport.width < 1024 ? 0 : null);
      return {
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        preferredNavigatorWidth: (stored?.navigatorPreferredWidth as number) ?? null,
        effectiveNavigatorWidth,
        preferredExecutionWidth: (stored?.executionPreferredWidth as number) ?? null,
        effectiveExecutionWidth: execution?.width ?? (viewport.width < 1024 ? 0 : null),
        preferredDockHeight: (stored?.activityDockPreferredHeight as number) ?? null,
        effectiveDockHeight: dock?.height ?? null,
        chartModuleWidth: chartModule?.width ?? null,
        chartModuleHeight: chartModule?.height ?? null,
        chartPlotWidth: plot?.width ?? null,
        chartPlotHeight: plot?.height ?? null,
        logicalRange: await visibleRange(),
        horizontalOverflow: await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
        navigatorCollapsed: navigator === null && overlay === null,
        hybridNavigatorOverlayOpen: overlay !== null,
        visibleNavigatorTrees: await page.getByTestId('market-navigator').count(),
        visibleExecutionTrees: await page.getByTestId('execution-center').count(),
      };
    };
    const manifest: Record<string, unknown> = {
      capturedAt: new Date().toISOString(),
      samples: {},
    };
    const record = async (name: string): Promise<ResizeSample> => {
      const measured = await sample();
      (manifest.samples as Record<string, unknown>)[name] = measured;
      await shot(name);
      expect(measured.horizontalOverflow).toBe(0);
      return measured;
    };
    const withResizeCounting = async (action: () => Promise<void>): Promise<void> => {
      countingHistory = true;
      try {
        await action();
        await page.waitForTimeout(700);
      } finally {
        countingHistory = false;
      }
    };
    const drag = async (testId: string, delta: number): Promise<void> => {
      const handle = page.getByTestId(testId);
      const rect = await handle.boundingBox();
      if (!rect) throw new Error(`Resize handle ${testId} is not visible`);
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      const vertical = (await handle.getAttribute('aria-orientation')) === 'vertical';
      await withResizeCounting(async () => {
        await page.mouse.move(x, y);
        await page.mouse.down();
        for (let step = 1; step <= 6; step += 1) {
          const progress = (delta * step) / 6;
          await page.mouse.move(vertical ? x + progress : x, vertical ? y : y + progress);
          await page.waitForTimeout(30);
        }
        await page.mouse.up();
      });
    };
    const pressResize = async (testId: string, key: string): Promise<void> => {
      await withResizeCounting(async () => page.getByTestId(testId).press(key));
    };
    const resizeViewport = async (width: number, height: number): Promise<void> => {
      await withResizeCounting(async () => page.setViewportSize({ width, height }));
    };
    const markChart = async (): Promise<void> => {
      await chart().evaluate((element, marker) => {
        element.setAttribute('data-resize-closure-marker', marker);
      }, CHART_MARKER);
    };
    const chartMarkerSurvived = async (): Promise<boolean> =>
      (await chart().getAttribute('data-resize-closure-marker')) === CHART_MARKER;

    // Pane resizing and chart continuity at the tightest full-desktop width.
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/trade');
    await settle();
    await page.getByTestId('quantity-input').fill('0.07');
    await page.getByTestId('stop-loss-input').fill('1.05000');
    await markChart();

    await record('1366-default');
    await drag('navigator-resize', -200);
    await record('1366-navigator-minimum');
    await drag('navigator-resize', 200);
    await record('1366-navigator-wider');
    await drag('execution-resize', 200);
    await record('1366-execution-minimum');
    // Keep the logical-range proof inside one live candle. Comparing across the
    // whole sweep lets an unrelated minute boundary add a real bar and move the
    // logical right edge by one, which proves market time advanced rather than
    // whether the resize preserved the viewport.
    const liveBucketBefore = await historyStatus().getAttribute('data-history-newest');
    const loadedCandlesBefore = Number(await historyStatus().getAttribute('data-history-candles'));
    const sourceEpochBefore = await historyStatus().getAttribute('data-history-epoch');
    const logicalRangeBefore = await visibleRange();
    await drag('execution-resize', -200);
    const bothWide = await record('1366-both-panes-near-maximum');

    const logicalRangeAfter = await visibleRange();
    const sourceEpochAfter = await historyStatus().getAttribute('data-history-epoch');
    const liveBucketAfter = await historyStatus().getAttribute('data-history-newest');
    const loadedCandlesAfter = Number(await historyStatus().getAttribute('data-history-candles'));
    const rightEdgeDelta =
      (logicalRangeAfter?.to ?? Number.NaN) - (logicalRangeBefore?.to ?? Number.NaN);
    const loadedCandleDelta = loadedCandlesAfter - loadedCandlesBefore;
    const visibleRangePreserved =
      Number.isFinite(rightEdgeDelta) && Math.abs(rightEdgeDelta - loadedCandleDelta) < 0.000001;
    const chartRemountCount = (await chartMarkerSurvived()) ? 0 : 1;
    const chartResizeEvidence = {
      logicalRangeBefore,
      logicalRangeAfter,
      rightEdgeBefore: logicalRangeBefore?.to ?? null,
      rightEdgeAfter: logicalRangeAfter?.to ?? null,
      sourceEpochBefore,
      sourceEpochAfter,
      liveBucketBefore,
      liveBucketAfter,
      loadedCandlesBefore,
      loadedCandlesAfter,
      rightEdgeDelta,
      loadedCandleDelta,
      rightEdgeRelativeToLoadedBefore: (logicalRangeBefore?.to ?? Number.NaN) - loadedCandlesBefore,
      rightEdgeRelativeToLoadedAfter: (logicalRangeAfter?.to ?? Number.NaN) - loadedCandlesAfter,
      visibleRangePreserved,
      historyRequestsDuringResize,
      chartRemountCount,
      executionDraftStable:
        (await page.getByTestId('quantity-input').inputValue()) === '0.07' &&
        (await page.getByTestId('stop-loss-input').inputValue()) === '1.05000',
    };
    manifest.chartResizeEvidence = chartResizeEvidence;
    expect(bothWide.chartModuleWidth ?? 0).toBeGreaterThanOrEqual(520);
    expect(sourceEpochBefore).not.toBe('');
    expect(sourceEpochAfter).toBe(sourceEpochBefore);
    expect(historyRequestsDuringResize).toBe(0);
    expect(chartRemountCount).toBe(0);
    expect(chartResizeEvidence.executionDraftStable).toBe(true);
    expect(logicalRangeBefore).not.toBeNull();
    expect(logicalRangeAfter).not.toBeNull();
    expect(visibleRangePreserved).toBe(true);

    // Vertical dock protection: the tallest legal dock must leave the chart
    // module at its published 420px floor.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle();
    await page.getByTestId('execution-submit-buy').click();
    await page.getByRole('tab', { name: /^Positions/ }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    const verticalDefault = await record('1440-default');
    await drag('dock-resize', 160);
    const verticalShortDock = await record('1440-dock-short');
    await drag('dock-resize', -600);
    const verticalTallDock = await record('1440-dock-tall');
    manifest.verticalDockChartProtection = {
      default: verticalDefault,
      shortDock: verticalShortDock,
      tallDock: verticalTallDock,
      minimumChartModuleHeight: 420,
      passed: (verticalTallDock.chartModuleHeight ?? 0) >= 420,
    };
    expect(verticalTallDock.chartModuleHeight ?? 0).toBeGreaterThanOrEqual(420);
    expect(verticalTallDock.chartPlotHeight ?? 0).toBeGreaterThan(300);

    // Exact Execution preferred/effective proof requested by the closure gate.
    await page.evaluate((key) => window.localStorage.removeItem(key as string), STORAGE_KEY);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/trade');
    await settle();
    await drag('execution-resize', -20);
    const executionWide = await record('1920-execution-preferred-280');
    expect(executionWide.preferredExecutionWidth).toBe(280);
    expect(executionWide.effectiveExecutionWidth).toBe(280);
    await resizeViewport(1280, 800);
    const executionClamped = await record('1280-execution-effective-clamped');
    expect(executionClamped.preferredExecutionWidth).toBe(280);
    expect(executionClamped.effectiveExecutionWidth).toBe(260);
    await resizeViewport(1920, 1080);
    const executionRestored = await record('1920-execution-preference-restored');
    expect(executionRestored.preferredExecutionWidth).toBe(280);
    expect(executionRestored.effectiveExecutionWidth).toBe(280);
    manifest.executionPreferenceRestore = {
      preferredAt1920: executionWide.preferredExecutionWidth,
      effectiveAt1920: executionWide.effectiveExecutionWidth,
      preferredAt1280: executionClamped.preferredExecutionWidth,
      effectiveAt1280: executionClamped.effectiveExecutionWidth,
      preferredAfterReExpand: executionRestored.preferredExecutionWidth,
      effectiveAfterReExpand: executionRestored.effectiveExecutionWidth,
      current1280Maximum: 260,
      passed: true,
    };

    // Navigator equivalent. The compact Execution policy leaves enough room for
    // the maximum Navigator throughout the desktop bands, so the responsive
    // clamp is exercised at the mobile transition where its effective track is
    // 0; the 340px preference remains stored and returns on re-expansion.
    await drag('navigator-resize', 96);
    const navigatorWide = await record('1920-navigator-preferred-340');
    expect(navigatorWide.preferredNavigatorWidth).toBe(340);
    expect(navigatorWide.effectiveNavigatorWidth).toBe(340);
    await resizeViewport(900, 844);
    const navigatorClamped = await record('900-navigator-effectively-hidden');
    expect(navigatorClamped.preferredNavigatorWidth).toBe(340);
    expect(navigatorClamped.effectiveNavigatorWidth).toBe(0);
    await resizeViewport(1920, 1080);
    const navigatorRestored = await record('1920-navigator-preference-restored');
    expect(navigatorRestored.preferredNavigatorWidth).toBe(340);
    expect(navigatorRestored.effectiveNavigatorWidth).toBe(340);
    manifest.navigatorPreferenceRestore = {
      preferredAt1920: navigatorWide.preferredNavigatorWidth,
      effectiveAt1920: navigatorWide.effectiveNavigatorWidth,
      preferredAtResponsiveClamp: navigatorClamped.preferredNavigatorWidth,
      effectiveAtResponsiveClamp: navigatorClamped.effectiveNavigatorWidth,
      preferredAfterReExpand: navigatorRestored.preferredNavigatorWidth,
      effectiveAfterReExpand: navigatorRestored.effectiveNavigatorWidth,
      responsiveClampViewport: 900,
      passed: true,
    };

    // Keyboard path, coarse step, double-click and canonical defaults.
    const executionSeparator = page.getByTestId('execution-resize');
    const executionKeyboardBefore = Number(await executionSeparator.getAttribute('aria-valuenow'));
    await pressResize('execution-resize', 'ArrowRight');
    const executionAfterArrow = Number(await executionSeparator.getAttribute('aria-valuenow'));
    await pressResize('execution-resize', 'Shift+ArrowLeft');
    const executionAfterShiftArrow = Number(await executionSeparator.getAttribute('aria-valuenow'));
    expect(executionKeyboardBefore).toBe(280);
    expect(executionAfterArrow).toBe(272);
    expect(executionAfterShiftArrow).toBe(296);
    await withResizeCounting(async () => executionSeparator.dblclick());
    const executionAfterReset = Number(await executionSeparator.getAttribute('aria-valuenow'));
    expect(executionAfterReset).toBe(260);

    const navigatorSeparator = page.getByTestId('navigator-resize');
    const navigatorKeyboardBefore = Number(await navigatorSeparator.getAttribute('aria-valuenow'));
    await pressResize('navigator-resize', 'ArrowRight');
    const navigatorAfterArrow = Number(await navigatorSeparator.getAttribute('aria-valuenow'));
    await pressResize('navigator-resize', 'Shift+ArrowLeft');
    const navigatorAfterShiftArrow = Number(await navigatorSeparator.getAttribute('aria-valuenow'));
    await withResizeCounting(async () => navigatorSeparator.dblclick());
    const navigatorAfterReset = Number(await navigatorSeparator.getAttribute('aria-valuenow'));
    expect(navigatorKeyboardBefore).toBe(340);
    expect(navigatorAfterArrow).toBe(348);
    expect(navigatorAfterShiftArrow).toBe(324);
    expect(navigatorAfterReset).toBe(244);

    const dockSeparator = page.getByTestId('dock-resize');
    const dockBefore = Number(await dockSeparator.getAttribute('aria-valuenow'));
    await pressResize('dock-resize', 'ArrowUp');
    const dockAfterArrow = Number(await dockSeparator.getAttribute('aria-valuenow'));
    await pressResize('dock-resize', 'Shift+ArrowDown');
    const dockAfterShiftArrow = Number(await dockSeparator.getAttribute('aria-valuenow'));
    await withResizeCounting(async () => dockSeparator.dblclick());
    const dockAfterReset = Number(await dockSeparator.getAttribute('aria-valuenow'));
    expect(dockAfterArrow - dockBefore).toBe(8);
    expect(dockAfterShiftArrow - dockAfterArrow).toBe(-24);
    expect(dockAfterReset).toBe(220);
    manifest.accessibleResize = {
      keyboardResize: {
        execution: {
          before: executionKeyboardBefore,
          afterArrowRight: executionAfterArrow,
          delta: executionAfterArrow - executionKeyboardBefore,
        },
        navigator: {
          before: navigatorKeyboardBefore,
          afterArrowRight: navigatorAfterArrow,
          delta: navigatorAfterArrow - navigatorKeyboardBefore,
        },
        dock: {
          before: dockBefore,
          afterArrowUp: dockAfterArrow,
          delta: dockAfterArrow - dockBefore,
        },
      },
      shiftArrowResize: {
        execution: executionAfterShiftArrow - executionAfterArrow,
        navigator: navigatorAfterShiftArrow - navigatorAfterArrow,
        dock: dockAfterShiftArrow - dockAfterArrow,
      },
      doubleClickReset: true,
      canonicalDefaults: {
        executionAt1920: executionAfterReset,
        navigator: navigatorAfterReset,
        dock: dockAfterReset,
      },
    };

    // 1024 hybrid: opening the overlaid Navigator changes neither chart axis.
    await page.evaluate((key) => window.localStorage.removeItem(key as string), STORAGE_KEY);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/trade');
    await settle();
    await markChart();
    const hybridClosed = await record('1024-hybrid-navigator-closed');
    const restore = page.getByTestId('navigator-restore');
    await expect(restore).toBeVisible();
    await restore.click();
    await expect(page.getByTestId('market-navigator-overlay')).toBeVisible();
    await page.waitForTimeout(700);
    const hybridOpen = await record('1024-hybrid-navigator-open');
    const hybridChartRemountCount = (await chartMarkerSurvived()) ? 0 : 1;
    const hybridStability = {
      closed: {
        chartModuleWidth: hybridClosed.chartModuleWidth,
        chartModuleHeight: hybridClosed.chartModuleHeight,
        chartPlotWidth: hybridClosed.chartPlotWidth,
        chartPlotHeight: hybridClosed.chartPlotHeight,
      },
      open: {
        chartModuleWidth: hybridOpen.chartModuleWidth,
        chartModuleHeight: hybridOpen.chartModuleHeight,
        chartPlotWidth: hybridOpen.chartPlotWidth,
        chartPlotHeight: hybridOpen.chartPlotHeight,
      },
      widthStable:
        hybridClosed.chartModuleWidth === hybridOpen.chartModuleWidth &&
        hybridClosed.chartPlotWidth === hybridOpen.chartPlotWidth,
      heightStable:
        hybridClosed.chartModuleHeight === hybridOpen.chartModuleHeight &&
        hybridClosed.chartPlotHeight === hybridOpen.chartPlotHeight,
      chartRemountCount: hybridChartRemountCount,
    };
    manifest.hybrid1024Stability = hybridStability;
    expect(hybridStability.widthStable, JSON.stringify(hybridStability, null, 2)).toBe(true);
    expect(hybridStability.heightStable, JSON.stringify(hybridStability, null, 2)).toBe(true);
    expect(hybridChartRemountCount).toBe(0);

    manifest.finalGates = {
      VERTICAL_DOCK_CHART_PROTECTION: true,
      '1024_HYBRID_WIDTH_STABILITY': hybridStability.widthStable,
      '1024_HYBRID_HEIGHT_STABILITY': hybridStability.heightStable,
      VISIBLE_LOGICAL_RANGE_PRESERVATION:
        visibleRangePreserved && sourceEpochAfter === sourceEpochBefore,
      KEYBOARD_RESIZE: true,
      SHIFT_ARROW_RESIZE: true,
      DOUBLE_CLICK_RESET: true,
      CANONICAL_DEFAULT_RESET:
        executionAfterReset === 260 && navigatorAfterReset === 244 && dockAfterReset === 220,
      PREFERENCE_RESTORE_AFTER_VIEWPORT_REEXPAND:
        executionRestored.effectiveExecutionWidth === 280 &&
        navigatorRestored.effectiveNavigatorWidth === 340,
    };
    expect(Object.values(manifest.finalGates as Record<string, boolean>).every(Boolean)).toBe(true);

    writeFileSync(
      resolve(OUT_DIR, 'resize-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
  });
});
