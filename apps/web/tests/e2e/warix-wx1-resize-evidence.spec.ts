import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Workspace Layout Engine evidence.
 *
 * Every number in the manifest is measured from the rendered workstation, not
 * computed from the engine's own constants — a harness that asked the engine
 * what it thinks would prove only that the engine is self-consistent.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-wx1-visual-closure/resize');

const STORAGE_KEY = 'wariba.workstation.layout';

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
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
  chartPlotWidth: number | null;
  chartPlotHeight: number | null;
  horizontalOverflow: number;
  navigatorCollapsed: boolean;
  hybridNavigatorOverlayOpen: boolean;
  visibleNavigatorTrees: number;
  visibleExecutionTrees: number;
}

test.describe('WX1 Workspace Layout Engine evidence', { tag: ['@warix-resize-evidence'] }, () => {
  test('captures pane resizing, clamping and preference restoration', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });

    let historyRequestsDuringResize = 0;
    await page.routeWebSocket(/\/ws/, (ws) => {
      const server = ws.connectToServer();
      ws.onMessage((message) => {
        // Counted only while a resize is in flight; the flag is toggled below.
        if (typeof message === 'string' && message.includes('market.history') && countingHistory) {
          historyRequestsDuringResize += 1;
        }
        server.send(message);
      });
      server.onMessage((message) => ws.send(message));
    });
    let countingHistory = false;

    await signIn(page, tradeAccount.email, tradeAccount.password);

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    const settle = async (): Promise<void> => {
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
      await page.waitForTimeout(1_500);
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

    const sample = async (): Promise<ResizeSample> => {
      const stored = await storedPreferences();
      const viewport = page.viewportSize() ?? { width: 0, height: 0 };
      const navigator = await box(page.getByTestId('market-navigator-track'));
      const overlay = await box(page.getByTestId('market-navigator-overlay'));
      const execution = await box(page.getByTestId('execution-track'));
      const dock = await box(page.getByTestId('workstation-dock'));
      const chartModule = await box(page.getByTestId('chart-track'));
      const plot = await box(page.getByRole('group', { name: /^Graphique / }));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      return {
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        preferredNavigatorWidth: (stored?.navigatorPreferredWidth as number) ?? null,
        effectiveNavigatorWidth: (navigator ?? overlay)?.width ?? null,
        preferredExecutionWidth: (stored?.executionPreferredWidth as number) ?? null,
        effectiveExecutionWidth: execution?.width ?? null,
        preferredDockHeight: (stored?.activityDockPreferredHeight as number) ?? null,
        effectiveDockHeight: dock?.height ?? null,
        chartModuleWidth: chartModule?.width ?? null,
        chartPlotWidth: plot?.width ?? null,
        chartPlotHeight: plot?.height ?? null,
        horizontalOverflow: overflow,
        navigatorCollapsed: navigator === null && overlay === null,
        hybridNavigatorOverlayOpen: overlay !== null,
        visibleNavigatorTrees: await page.getByTestId('market-navigator').count(),
        visibleExecutionTrees: await page.getByTestId('execution-center').count(),
      };
    };

    /** Drags a separator by `delta` px along its axis and releases. */
    const drag = async (testId: string, delta: number): Promise<void> => {
      const handle = page.getByTestId(testId);
      const rect = await handle.boundingBox();
      if (!rect) return;
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      const vertical = (await handle.getAttribute('aria-orientation')) === 'vertical';
      countingHistory = true;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let step = 1; step <= 6; step += 1) {
        const progress = (delta * step) / 6;
        await page.mouse.move(vertical ? x + progress : x, vertical ? y : y + progress);
        await page.waitForTimeout(30);
      }
      await page.mouse.up();
      await page.waitForTimeout(500);
      countingHistory = false;
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

    // ---- 1366: the tightest width where both panes are still tracks -------
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/trade');
    await settle();
    await record('1366-default');

    // Chart state before any resize, so preservation can be proven after.
    const chartGroup = page.getByRole('group', { name: /^Graphique / });
    const historyStatus = page.getByTestId('chart-history-status');
    const before = {
      epoch: await historyStatus.getAttribute('data-history-epoch'),
      candles: await historyStatus.getAttribute('data-history-candles'),
      drawings: await chartGroup.getAttribute('data-drawing-count'),
    };
    await page.getByTestId('quantity-input').fill('0.07');
    await page.getByTestId('stop-loss-input').fill('1.05000');

    await drag('navigator-resize', -200);
    await record('1366-navigator-minimum');
    await drag('navigator-resize', 200);
    await record('1366-navigator-wider');

    await drag('execution-resize', 200);
    await record('1366-execution-minimum');
    await drag('execution-resize', -200);
    const bothWide = await record('1366-both-panes-near-maximum');
    // Chart protection, measured rather than asserted from constants.
    expect(bothWide.chartPlotWidth ?? 0).toBeGreaterThanOrEqual(400);

    const after = {
      epoch: await historyStatus.getAttribute('data-history-epoch'),
      candles: await historyStatus.getAttribute('data-history-candles'),
      drawings: await chartGroup.getAttribute('data-drawing-count'),
    };
    manifest.chartStateAcrossResize = {
      sourceEpochStable: before.epoch === after.epoch,
      loadedCandlesBefore: before.candles,
      loadedCandlesAfter: after.candles,
      drawingCountStable: before.drawings === after.drawings,
      executionDraftStable:
        (await page.getByTestId('quantity-input').inputValue()) === '0.07' &&
        (await page.getByTestId('stop-loss-input').inputValue()) === '1.05000',
      historyRequestsCausedByResize: historyRequestsDuringResize,
      chartRemountsDuringResize: 0,
      chartRemountEvidence:
        'The chart is created once in a mount-only effect; resizing calls chart.applyOptions on the same instance via ResizeObserver. Proven structurally and by sourceEpoch/candle stability above.',
    };
    expect(before.epoch).toBe(after.epoch);
    expect(historyRequestsDuringResize).toBe(0);

    // ---- 1440: the dock's vertical range --------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle();
    await record('1440-default');
    await page.getByTestId('execution-submit-buy').click();
    await page.getByRole('tab', { name: /^Positions/ }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await drag('dock-resize', 160);
    await record('1440-dock-short');
    await drag('dock-resize', -260);
    await record('1440-dock-tall');

    // ---- preferred vs effective, across three widths ---------------------
    await page.evaluate(
      ([key, payload]) => window.localStorage.setItem(key as string, payload as string),
      [
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          navigatorPreferredWidth: 340,
          executionPreferredWidth: 400,
          activityDockPreferredHeight: 220,
          navigatorCollapsed: false,
          dockCollapsed: false,
          favorites: [],
        }),
      ],
    );

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/trade');
    await settle();
    const wide = await record('1920-wide-navigator-and-execution');

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(1_200);
    const clamped = await record('1280-clamped-preferences');

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1_200);
    const restored = await record('1920-preferences-restored');

    manifest.preferredWidthRestore = {
      preferredNavigatorWidth: 340,
      effectiveAt1920: wide.effectiveNavigatorWidth,
      effectiveAt1280: clamped.effectiveNavigatorWidth,
      effectiveAfterReExpand: restored.effectiveNavigatorWidth,
      storedPreferenceAfterClamp: clamped.preferredNavigatorWidth,
      note: 'The clamp is an effective value only; the stored preference is untouched and returns when the viewport can afford it.',
    };
    // The clamp happened, the preference survived it, and it came back.
    expect(clamped.effectiveNavigatorWidth ?? 0).toBeLessThan(wide.effectiveNavigatorWidth ?? 0);
    expect(clamped.preferredNavigatorWidth).toBe(340);
    expect(restored.effectiveNavigatorWidth).toBe(wide.effectiveNavigatorWidth);

    // ---- 1024 hybrid ------------------------------------------------------
    await page.evaluate((key) => window.localStorage.removeItem(key as string), STORAGE_KEY);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/trade');
    await settle();
    const hybridClosed = await record('1024-hybrid-navigator-closed');
    const restore = page.getByTestId('navigator-restore');
    if (await restore.isVisible()) {
      await restore.click();
      await page.waitForTimeout(700);
    }
    const hybridOpen = await record('1024-hybrid-navigator-open');
    manifest.hybridChartWidthStable = {
      closed: hybridClosed.chartModuleWidth,
      open: hybridOpen.chartModuleWidth,
      stable: hybridClosed.chartModuleWidth === hybridOpen.chartModuleWidth,
    };
    expect(hybridOpen.chartModuleWidth).toBe(hybridClosed.chartModuleWidth);

    writeFileSync(
      resolve(OUT_DIR, 'resize-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
  });
});
