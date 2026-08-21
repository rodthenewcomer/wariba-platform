import { AxeBuilder } from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Locator, Page, WebSocketRoute } from '@playwright/test';
import { expect, test } from './fixtures';

const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-wx1-kinetic-workstation');
const WX0_MANIFEST = resolve(
  process.cwd(),
  '../../docs/04-ux/evidence/warix-wx0-kinetic-workstation/evidence-manifest.json',
);

const DESKTOP_VIEWPORTS = [
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
] as const;

const MOBILE_VIEWPORTS = [
  { width: 320, height: 844 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
] as const;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GeometryEvidence {
  viewport: { width: number; height: number } | null;
  globalInstrumentation: Rect | null;
  productRail: Rect | null;
  navigator: Rect | null;
  drawingRail: Rect | null;
  chartModule: Rect | null;
  chartPlot: Rect | null;
  chartCanvas: Rect | null;
  execution: Rect | null;
  dock: (Rect & { state: string | null }) | null;
  mobileMarketContext: Rect | null;
  mobileActionRail: Rect | null;
  centerWorkspace: Rect | null;
  preChartChromeHeight: number | null;
  chartViewportAreaSharePercent: number | null;
  chartShareOfCenterWorkspacePercent: number | null;
  document: {
    scrollWidth: number;
    clientWidth: number;
    horizontalOverflow: number;
  };
  minimumTouchTarget: number | null;
  visibleExecutionTrees: number;
  visibleToolTrees: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;
const roundedRect = (rect: Rect | null): Rect | null =>
  rect
    ? {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }
    : null;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

test.describe(
  'WX1 Kinetic Professional Workstation evidence',
  {
    tag: ['@warix-wx1-evidence'],
  },
  () => {
    test('captures the full responsive, interaction, accessibility and geometry contract', async ({
      page,
      tradeAccount,
    }) => {
      test.setTimeout(1_200_000);
      mkdirSync(OUT_DIR, { recursive: true });

      const socketState: { active: WebSocketRoute | null } = { active: null };
      let blockRealtime = false;
      await page.routeWebSocket(/\/ws/, (ws) => {
        socketState.active = ws;
        if (blockRealtime) {
          void ws.close({ code: 1012, reason: 'WX1 disconnected-state evidence' });
          return;
        }
        const server = ws.connectToServer();
        server.onMessage((message) => {
          ws.send(message);
        });
      });
      await signIn(page, tradeAccount.email, tradeAccount.password);

      const chart = (): Locator => page.getByRole('group', { name: /^Graphique / });
      const historyStatus = page.getByTestId('chart-history-status');
      const shot = async (name: string): Promise<void> => {
        await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
      };
      const read = async (locator: Locator): Promise<Rect | null> => {
        if ((await locator.count()) === 0 || !(await locator.first().isVisible())) return null;
        return roundedRect(await locator.first().boundingBox());
      };
      const visibleCount = async (locator: Locator): Promise<number> =>
        locator.evaluateAll(
          (elements) =>
            elements.filter((element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                rect.width > 0 &&
                rect.height > 0
              );
            }).length,
        );

      const openWorkstation = async (): Promise<void> => {
        if (new URL(page.url()).pathname !== '/trade') {
          await page.goto('/trade');
        }
        await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
          'data-connection',
          'open',
          { timeout: 30_000 },
        );
        const width = page.viewportSize()?.width ?? 1440;
        if (width < 1024) {
          await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —', {
            timeout: 30_000,
          });
        } else {
          await expect(page.getByTestId('execution-bid')).not.toHaveText('—', {
            timeout: 30_000,
          });
        }
        await expect(chart().locator('canvas').first()).toBeVisible({ timeout: 30_000 });
        await expect
          .poll(async () => (await historyStatus.getAttribute('data-history-status')) ?? '', {
            timeout: 120_000,
            intervals: [500],
          })
          .toMatch(/^(ready|empty)$/);
      };

      const minimumTouchTarget = async (): Promise<number | null> =>
        page.evaluate(() => {
          const interactive = Array.from(
            document.querySelectorAll<HTMLElement>(
              'button:not([disabled]), summary, a[href], input:not([disabled]), [role="radio"]',
            ),
          );
          const sizes = interactive
            .filter((element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              const dialog = element.closest('dialog');
              return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                rect.width > 0 &&
                rect.height > 0 &&
                !element.matches('a[href*="tradingview.com"]') &&
                (!dialog || dialog.open)
              );
            })
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return Math.min(rect.width, rect.height);
            });
          return sizes.length === 0 ? null : Math.round(Math.min(...sizes) * 100) / 100;
        });

      const geometry = async (): Promise<GeometryEvidence> => {
        const viewport = page.viewportSize();
        const globalInstrumentation = await read(page.getByTestId('workstation-status-bar'));
        const productRail = await read(page.getByTestId('workstation-nav-rail'));
        const navigator = await read(page.getByTestId('market-navigator-track'));
        const drawingRail = await read(page.getByTestId('chart-tools-trigger'));
        const chartModule = await read(page.getByTestId('chart-track'));
        const chartPlot = await read(chart());
        const chartCanvas = await read(chart().locator('canvas').first());
        const execution = await read(page.getByTestId('execution-track'));
        const dockRect = await read(page.getByTestId('workstation-dock'));
        const dockState =
          (await page.getByTestId('workstation-dock').count()) > 0
            ? await page.getByTestId('workstation-dock').first().getAttribute('data-empty')
            : null;
        const mobileMarketContext = await read(page.getByTestId('mobile-market-context'));
        const mobileActionRail = await read(page.getByTestId('mobile-action-rail'));
        const body = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        let centerWorkspace: Rect | null = null;
        if (viewport && globalInstrumentation && chartPlot) {
          if (viewport.width >= 1024 && productRail && dockRect) {
            centerWorkspace = {
              x: productRail.x + productRail.width,
              y: globalInstrumentation.y + globalInstrumentation.height,
              width: viewport.width - (productRail.x + productRail.width),
              height: dockRect.y - (globalInstrumentation.y + globalInstrumentation.height),
            };
          } else if (mobileActionRail) {
            centerWorkspace = {
              x: 0,
              y: globalInstrumentation.y + globalInstrumentation.height,
              width: viewport.width,
              height: mobileActionRail.y - (globalInstrumentation.y + globalInstrumentation.height),
            };
          }
        }

        const chartArea = chartPlot ? chartPlot.width * chartPlot.height : null;
        const viewportArea = viewport ? viewport.width * viewport.height : null;
        const centerArea = centerWorkspace ? centerWorkspace.width * centerWorkspace.height : null;

        return {
          viewport,
          globalInstrumentation,
          productRail,
          navigator,
          drawingRail,
          chartModule,
          chartPlot,
          chartCanvas,
          execution,
          dock: dockRect ? { ...dockRect, state: dockState } : null,
          mobileMarketContext,
          mobileActionRail,
          centerWorkspace: roundedRect(centerWorkspace),
          preChartChromeHeight: chartPlot?.y ?? null,
          chartViewportAreaSharePercent:
            chartArea !== null && viewportArea ? round((chartArea / viewportArea) * 100) : null,
          chartShareOfCenterWorkspacePercent:
            chartArea !== null && centerArea ? round((chartArea / centerArea) * 100) : null,
          document: {
            ...body,
            horizontalOverflow: body.scrollWidth - body.clientWidth,
          },
          minimumTouchTarget: viewport && viewport.width < 1024 ? await minimumTouchTarget() : null,
          visibleExecutionTrees: await visibleCount(page.getByTestId('execution-center')),
          visibleToolTrees:
            (await visibleCount(page.getByRole('group', { name: 'Outils de dessin' }))) +
            (await visibleCount(page.getByTestId('chart-tools-sheet'))),
        };
      };

      const axe = async (state: string) => {
        const results = await new AxeBuilder({ page }).analyze();
        return {
          state,
          violations: results.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.length,
            targets: violation.nodes.map((node) => node.target),
            failureSummaries: violation.nodes.map((node) => node.failureSummary),
          })),
          seriousOrCritical: results.violations.filter(
            (violation) => violation.impact === 'serious' || violation.impact === 'critical',
          ).length,
        };
      };

      const contrast = async (selector: string, useOutline = false) =>
        page.evaluate(
          ({ selector, useOutline }) => {
            const element = document.querySelector<HTMLElement>(selector);
            if (!element) return null;
            const parse = (value: string): [number, number, number] | null => {
              const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
              return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
            };
            const backgroundFor = (start: HTMLElement): string => {
              let node: HTMLElement | null = start;
              while (node) {
                const color = getComputedStyle(node).backgroundColor;
                if (!color.endsWith(', 0)') && color !== 'transparent') return color;
                node = node.parentElement;
              }
              return getComputedStyle(document.body).backgroundColor;
            };
            const luminance = (rgb: [number, number, number]) => {
              const channel = (raw: number) => {
                const value = raw / 255;
                return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
              };
              return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
            };
            const style = getComputedStyle(element);
            const foregroundValue = useOutline ? style.outlineColor : style.color;
            const backgroundValue = backgroundFor(element);
            const foreground = parse(foregroundValue);
            const background = parse(backgroundValue);
            if (!foreground || !background) return null;
            const lighter = Math.max(luminance(foreground), luminance(background));
            const darker = Math.min(luminance(foreground), luminance(background));
            return {
              foreground: foregroundValue,
              background: backgroundValue,
              ratio: Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100,
            };
          },
          { selector, useOutline },
        );

      const baselineManifest = JSON.parse(readFileSync(WX0_MANIFEST, 'utf8')) as {
        desktop: Record<string, GeometryEvidence>;
        mobile: Record<string, GeometryEvidence>;
      };
      const baseline1366 = baselineManifest.desktop['1366x768']!;
      const baseline390 = baselineManifest.mobile['390x844']!;
      const baselineCenterShare = (entry: GeometryEvidence, mobile: boolean): number | null => {
        const viewport = entry.viewport;
        const plot = entry.chartPlot ?? (entry as unknown as { chart: Rect }).chart;
        const bar =
          entry.globalInstrumentation ?? (entry as unknown as { statusBar: Rect }).statusBar;
        const dock = entry.dock;
        const action = entry.mobileActionRail;
        if (!viewport || !plot || !bar) return null;
        const centerWidth = mobile ? viewport.width : viewport.width - 56;
        const centerHeight = mobile
          ? (action?.y ?? 783) - (bar.y + bar.height)
          : (dock?.y ?? 548) - (bar.y + bar.height);
        return round(((plot.width * plot.height) / (centerWidth * centerHeight)) * 100);
      };

      const manifest: Record<string, unknown> = {
        capturedAt: new Date().toISOString(),
        capturedCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
          cwd: resolve(process.cwd(), '../..'),
          encoding: 'utf8',
        }).trim(),
        source:
          'WX1 production build; live mock realtime; process-memory history; no fabricated market, financial or risk data',
        baseline: {
          viewport1366: baseline1366,
          viewport390: baseline390,
          chartShareOfCenterWorkspace1366Percent: baselineCenterShare(baseline1366, false),
          chartShareOfCenterWorkspace390Percent: baselineCenterShare(baseline390, true),
        },
        desktop: {},
        tablet: {},
        mobile: {},
        states: {},
        accessibility: [],
        contrast: {},
        dependencies: {
          baseUi: 'NOT_ADOPTED_NATIVE_PRIMITIVES_RETAINED',
          shadcn: 'NOT_INITIALIZED_REFERENCE_ONLY',
          motion: 'CSS_ONLY_NO_MARKET_TICK_SUBSCRIPTION',
          lucide: 'ADOPTED_VIA_WARIBA_UI_WRAPPERS_ONLY',
        },
        renderOwnership: {
          selectedTicks: 25,
          workstationShell: 0,
          productRail: 0,
          globalStatus: 0,
          accountSwitcher: 0,
          dockChrome: 0,
          closedDialogs: 0,
          marketNavigatorChrome: 0,
          staticChartToolbar: 0,
          drawingRail: 0,
          chartWorkspace: 25,
          execution: 25,
          visiblePositionsPnl: 25,
          unselectedTicks: 25,
          unselectedChartWorkspace: 0,
          unselectedExecution: 0,
          unselectedStatus: 0,
          unselectedNavigatorChrome: 0,
          draftEdits: 5,
          drawingPointerMoves: 40,
          drawingChromeRenders: 0,
          drawingStorageWritesBeforePointerUp: 0,
          drawingStorageWritesOnPointerUp: 1,
          source:
            'workstation-render-ownership.test.tsx and chart-render-ownership.test.tsx, rerun in WX1 final validation',
        },
      };

      // Empty default geometry and visual hierarchy at every desktop width.
      for (const viewport of DESKTOP_VIEWPORTS) {
        await page.setViewportSize(viewport);
        await openWorkstation();
        const key = `${viewport.width}x${viewport.height}`;
        const measured = await geometry();
        (manifest.desktop as Record<string, unknown>)[key] = measured;
        if ([1366, 1440, 1920, 2560].includes(viewport.width)) {
          await shot(`desktop-${key}-default-workstation`);
        }
        expect(measured.document.horizontalOverflow).toBe(0);
      }

      const desktop1366 = (manifest.desktop as Record<string, GeometryEvidence>)['1366x768']!;
      expect(desktop1366.globalInstrumentation?.height).toBe(44);
      expect(desktop1366.navigator?.width).toBe(244);
      expect(desktop1366.drawingRail?.width).toBe(36);
      expect(desktop1366.execution?.width).toBe(320);
      expect(desktop1366.dock?.height).toBe(48);
      expect(desktop1366.chartViewportAreaSharePercent).toBeGreaterThanOrEqual(39);
      await page.setViewportSize({ width: 1366, height: 768 });
      await openWorkstation();
      await shot('desktop-1366x768-empty-dock');
      await shot('desktop-1366x768-market-order');

      // Execution variants at the tight desktop width.
      await page.getByRole('radio', { name: 'Limit', exact: true }).click();
      const bid1366 = Number(await page.getByTestId('execution-bid').textContent());
      await page.getByTestId('trigger-price-input').fill((bid1366 - 0.005).toFixed(5));
      await shot('desktop-1366x768-limit-order');
      await expect(page.getByTestId('execution-side-unavailable-sell')).toBeVisible();
      await shot('desktop-1366x768-warning');
      (manifest.contrast as Record<string, unknown>).warning = await contrast(
        '[data-testid="execution-side-unavailable-sell"]',
      );

      await page.getByRole('radio', { name: 'Market', exact: true }).click();
      // Contrast evidence must sample the settled semantic fill, not the
      // previous Limit-side outline while its short CSS transition is active.
      await page.waitForTimeout(200);
      (manifest.contrast as Record<string, unknown>).buy = await contrast(
        '[data-testid="execution-submit-buy"]',
      );
      (manifest.contrast as Record<string, unknown>).sell = await contrast(
        '[data-testid="execution-submit-sell"]',
      );
      await page.getByLabel('Quantité (lots)').fill('1.00');
      await page.getByTestId('execution-submit-buy').click();
      await expect(page.getByTestId('execution-rejection')).toBeVisible({ timeout: 30_000 });
      await shot('desktop-1366x768-server-rejection');
      (manifest.contrast as Record<string, unknown>).rejection = await contrast(
        '[data-testid="execution-rejection"]',
      );
      (manifest.states as Record<string, unknown>).serverRejection = (
        await page.getByTestId('execution-rejection').textContent()
      )
        ?.replace(/\s+/g, ' ')
        .trim();

      // The next command clears the persisted rejection through the canonical
      // command `begin()` path. A valid small order then proves the deliberate
      // 48 -> populated dock transition without changing semantics.
      await openWorkstation();
      await page.getByLabel('Quantité (lots)').fill('0.01');
      await page.getByTestId('execution-submit-buy').click();
      await expect(page.getByTestId('workstation-dock')).toHaveAttribute('data-empty', 'false', {
        timeout: 30_000,
      });
      await shot('desktop-1366x768-populated-dock');
      (manifest.states as Record<string, unknown>).populatedDock = await geometry();
      const closePosition = page.getByRole('button', { name: /^Fermer EURUSD/ }).first();
      await closePosition.click();
      await expect(page.getByTestId('workstation-dock')).toHaveAttribute('data-empty', 'true', {
        timeout: 30_000,
      });

      // Main 1440 analytical states and every direct drawing tool requested.
      await page.setViewportSize({ width: 1440, height: 900 });
      await openWorkstation();
      await shot('desktop-1440x900-main-chart');
      (manifest.accessibility as unknown[]).push(await axe('desktop-default'));

      const indicatorsTrigger = page.getByTestId('chart-indicators-trigger');
      await indicatorsTrigger.focus();
      (manifest.contrast as Record<string, unknown>).focus = await contrast(
        '[data-testid="chart-indicators-trigger"]',
        true,
      );
      await indicatorsTrigger.click();
      await expect(page.getByTestId('chart-indicator-options')).toBeVisible();
      await shot('desktop-1440x900-indicators-open');
      await page.keyboard.press('Escape');

      const plot = async () => {
        const box = await chart().boundingBox();
        if (!box) throw new Error('chart plot has no bounding box');
        return box;
      };
      const draw = async (
        tool: 'horizontal_line' | 'trend_line' | 'rectangle' | 'fibonacci',
        name: string,
      ) => {
        const before = Number((await chart().getAttribute('data-drawing-count')) ?? '0');
        await page.getByTestId(`chart-tool-${tool}`).click();
        const box = await plot();
        const first = { x: box.x + box.width * 0.33, y: box.y + box.height * 0.42 };
        const second = { x: box.x + box.width * 0.68, y: box.y + box.height * 0.62 };
        await page.mouse.click(first.x, first.y);
        if (tool !== 'horizontal_line') {
          await page.mouse.move(second.x, second.y);
          await page.mouse.click(second.x, second.y);
        }
        await expect
          .poll(async () => Number((await chart().getAttribute('data-drawing-count')) ?? '0'))
          .toBeGreaterThan(before);
        await shot(name);
        return first;
      };

      await page.getByTestId('chart-tool-horizontal_line').click();
      await shot('desktop-1440x900-drawing-rail-active');
      const horizontalPoint = await draw('horizontal_line', 'desktop-1440x900-horizontal-line');
      await page.getByTestId('chart-tool-select').click();
      await page.mouse.click(horizontalPoint.x, horizontalPoint.y);
      await expect(page.getByTestId('chart-drawing-actions')).toBeVisible();
      (manifest.contrast as Record<string, unknown>).selectedTool = await contrast(
        '[data-testid="chart-tool-select"]',
      );
      await shot('desktop-1440x900-horizontal-selected');
      await page.getByRole('button', { name: 'Terminé' }).click();
      await draw('trend_line', 'desktop-1440x900-trend-line');
      await draw('rectangle', 'desktop-1440x900-rectangle');
      await draw('fibonacci', 'desktop-1440x900-fibonacci');
      await shot('desktop-1440x900-execution-center');

      // Close the actual routed socket, and keep reconnect attempts blocked,
      // so the captured state is a real transport loss rather than cosmetic UI.
      blockRealtime = true;
      const socketBeforeDisconnect = socketState.active;
      if (socketBeforeDisconnect) {
        await socketBeforeDisconnect.close({
          code: 1012,
          reason: 'WX1 disconnected-state evidence',
        });
      }
      await expect(page.getByTestId('workstation-connection')).not.toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      await shot('desktop-1440x900-disconnected-stale');
      (manifest.states as Record<string, unknown>).disconnected = await page
        .getByTestId('workstation-connection')
        .getAttribute('data-connection');
      blockRealtime = false;
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );

      // The drawing captures above prove persistence. The chart-first mobile
      // evidence is intentionally a clean workstation state, so clear only
      // this isolated fixture account's local drawing store before reloading.
      await page.evaluate(() => window.localStorage.removeItem('wariba.warix.chart.drawings'));
      await page.reload();
      await openWorkstation();

      // Mobile/tablet chart-first matrix. Every screenshot waits for resolved history.
      for (const viewport of MOBILE_VIEWPORTS) {
        await page.setViewportSize(viewport);
        await openWorkstation();
        const key = `${viewport.width}x${viewport.height}`;
        const measured = await geometry();
        (manifest.mobile as Record<string, unknown>)[key] = measured;
        await shot(`mobile-${key}-chart-first`);
        expect(measured.document.horizontalOverflow).toBe(0);
      }
      await page.setViewportSize({ width: 768, height: 1024 });
      await openWorkstation();
      (manifest.tablet as Record<string, unknown>)['768x1024'] = await geometry();
      await shot('tablet-768x1024-workstation');

      const mobile390 = (manifest.mobile as Record<string, GeometryEvidence>)['390x844']!;
      await page.setViewportSize({ width: 390, height: 844 });
      await openWorkstation();
      const undersizedMobileTargets = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>(
            'button:not([disabled]), summary, a[href], input:not([disabled]), [role="radio"]',
          ),
        )
          .filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            const dialog = element.closest('dialog');
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0 &&
              (!dialog || dialog.open) &&
              Math.min(rect.width, rect.height) < 44
            );
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName,
              text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80),
              ariaLabel: element.getAttribute('aria-label'),
              testId: element.dataset.testid,
              href: element.getAttribute('href'),
              width: Math.round(rect.width * 100) / 100,
              height: Math.round(rect.height * 100) / 100,
            };
          }),
      );
      console.warn('WX1_UNDERSIZED_MOBILE_TARGETS', JSON.stringify(undersizedMobileTargets));
      (manifest.states as Record<string, unknown>).thirdPartyAttributionTouchTarget =
        undersizedMobileTargets.find((target) => target.href?.includes('tradingview.com')) ?? null;
      expect(
        undersizedMobileTargets.every((target) => target.href?.includes('tradingview.com')),
      ).toBe(true);
      expect(mobile390.preChartChromeHeight).toBeLessThanOrEqual(116);
      expect(mobile390.chartViewportAreaSharePercent).toBeGreaterThanOrEqual(78);
      expect(mobile390.minimumTouchTarget).toBeGreaterThanOrEqual(44);
      expect(mobile390.visibleExecutionTrees).toBe(0);
      expect(mobile390.visibleToolTrees).toBe(0);

      (manifest.accessibility as unknown[]).push(await axe('mobile-chart-first'));

      await page.getByTestId('mobile-market-trigger').click();
      await expect(page.getByRole('dialog', { name: 'Marchés' })).toBeVisible();
      await shot('mobile-390x844-market-sheet');
      await page.keyboard.press('Escape');

      await page.getByTestId('chart-tools-sheet-trigger').click();
      await expect(page.getByTestId('chart-tools-sheet')).toBeVisible();
      await shot('mobile-390x844-tools-palette');
      (manifest.accessibility as unknown[]).push(await axe('mobile-tools-sheet'));
      await page.getByRole('button', { name: 'Ligne horizontale', exact: true }).click();
      const mobilePlot = await plot();
      const mobilePoint = {
        x: mobilePlot.x + mobilePlot.width * 0.46,
        y: mobilePlot.y + mobilePlot.height * 0.42,
      };
      await page.mouse.click(mobilePoint.x, mobilePoint.y);
      await page.getByTestId('chart-tools-sheet-trigger').click();
      await page.getByRole('button', { name: 'Sélection', exact: true }).click();
      await page.mouse.click(mobilePoint.x, mobilePoint.y);
      await expect(page.getByTestId('chart-drawing-actions')).toBeVisible();
      await shot('mobile-390x844-selected-drawing');

      // One execution tree only: market, limit, warning and a real rejection.
      await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
      await expect(page.getByTestId('execution-center')).toBeVisible();
      expect(await visibleCount(page.getByTestId('execution-center'))).toBe(1);
      await shot('mobile-390x844-market-execution');
      (manifest.accessibility as unknown[]).push(await axe('mobile-execution-sheet'));
      await page.getByRole('radio', { name: 'Limit', exact: true }).click();
      const mobileBid = Number(await page.getByTestId('execution-bid').textContent());
      await page.getByTestId('trigger-price-input').fill((mobileBid - 0.005).toFixed(5));
      await shot('mobile-390x844-limit-execution');
      await expect(page.getByTestId('execution-side-unavailable-sell')).toBeVisible();
      await shot('mobile-390x844-warning');
      await page.getByRole('radio', { name: 'Market', exact: true }).click();
      await page.getByLabel('Quantité (lots)').fill('1.00');
      await page.getByTestId('execution-submit-buy').click();
      await expect(page.getByTestId('execution-rejection')).toBeVisible({ timeout: 30_000 });
      await shot('mobile-390x844-server-rejection');
      await page.keyboard.press('Escape');

      // A valid next command clears the persisted rejection and exposes the
      // structured mobile Activity rows without mounting a second tree.
      await openWorkstation();
      await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
      await page.getByLabel('Quantité (lots)').fill('0.01');
      await page.getByTestId('execution-submit-buy').click();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('mobile-dock-trigger')).toContainText('1', {
        timeout: 30_000,
      });
      await page.getByTestId('mobile-dock-trigger').click();
      await expect(page.getByRole('dialog', { name: 'Activité de trading' })).toBeVisible();
      await shot('mobile-390x844-activity');
      await page.keyboard.press('Escape');
      await page.setViewportSize({ width: 430, height: 932 });
      await page.getByTestId('mobile-dock-trigger').click();
      await shot('mobile-430x932-activity');
      await page.keyboard.press('Escape');

      const accessibility = manifest.accessibility as Array<{ seriousOrCritical: number }>;
      writeFileSync(
        resolve(OUT_DIR, 'evidence-manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      expect(accessibility.every((result) => result.seriousOrCritical === 0)).toBe(true);
    });
  },
);
