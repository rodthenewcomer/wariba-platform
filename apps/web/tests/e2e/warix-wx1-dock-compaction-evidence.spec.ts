import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

const PHASE = process.env.WARIX_DOCK_EVIDENCE_PHASE === 'after' ? 'after' : 'before';
const OUT_DIR = resolve(
  process.cwd(),
  `../../docs/04-ux/evidence/warix-wx1-right-dock-compaction/${PHASE}`,
);
const CLOSURE_224_DIR = resolve(OUT_DIR, 'closure-224');
const STORAGE_KEY = 'wariba.workstation.layout';
const CHART_MARKER = 'wx1-dock-compaction-chart';

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // The App Router can commit /hub while a long-lived development request
  // keeps the document load event pending. The committed route and its
  // authenticated affordance are the evidence that sign-in completed.
  await page.waitForURL(/\/hub(?:\?.*)?$/, { timeout: 30_000, waitUntil: 'commit' });
  await page.getByRole('link', { name: 'Ouvrir WariX' }).waitFor({ state: 'visible' });
}

interface Geometry {
  viewportWidth: number;
  viewportHeight: number;
  executionDockWidth: number;
  chartModuleWidth: number;
  chartPlotWidth: number;
  chartPlotHeight: number;
  horizontalOverflow: number;
}

interface StateEvidence extends Geometry {
  chartRemounted: boolean;
  historyRefetched: boolean;
  historyRequests: number;
  executionDraftSurvived: boolean;
  drawingsSurvived: boolean;
  drawingCount: number;
}

test.describe(
  'WX1 right execution dock compaction evidence',
  {
    tag: ['@warix-dock-compaction-evidence'],
  },
  () => {
    test('captures the ten required dock states and preservation contracts', async ({
      page,
      tradeAccount,
    }) => {
      test.setTimeout(600_000);
      mkdirSync(OUT_DIR, { recursive: true });

      let historyRequests = 0;
      page.on('websocket', (socket) => {
        socket.on('framesent', ({ payload }) => {
          if (typeof payload === 'string' && payload.includes('market.history')) {
            historyRequests += 1;
          }
        });
      });

      await page.setViewportSize({ width: 1920, height: 1080 });
      await signIn(page, tradeAccount.email, tradeAccount.password);
      await page.goto('/trade');

      const chart = () => page.getByRole('group', { name: /^Graphique / });
      const waitForWorkstation = async (): Promise<void> => {
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
        await expect(page.getByTestId('quantity-bounds')).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(600);
      };
      await waitForWorkstation();

      const box = async (locator: Locator): Promise<{ width: number; height: number }> => {
        const rect = await locator.boundingBox();
        if (!rect) throw new Error('Expected a visible geometry target');
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      };
      const geometry = async (): Promise<Geometry> => {
        const viewport = page.viewportSize() ?? { width: 0, height: 0 };
        const execution = await box(page.getByTestId('execution-track'));
        const chartModule = await box(page.getByTestId('chart-track'));
        const plot = await box(chart());
        return {
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
          executionDockWidth: execution.width,
          chartModuleWidth: chartModule.width,
          chartPlotWidth: plot.width,
          chartPlotHeight: plot.height,
          horizontalOverflow: await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        };
      };

      // Seed real state so every subsequent transition proves preservation rather
      // than merely observing 0 drawings and the default draft on both sides.
      await page.getByTestId('quantity-input').fill('0.07');
      await page.getByTestId('chart-tool-horizontal_line').click();
      const initialPlot = await chart().boundingBox();
      if (!initialPlot) throw new Error('Chart plot is not measurable');
      await page.mouse.click(
        initialPlot.x + initialPlot.width * 0.48,
        initialPlot.y + initialPlot.height * 0.46,
      );
      await expect(chart()).toHaveAttribute('data-drawing-count', '1');
      await page.getByTestId('chart-tool-select').click();

      const states: Record<string, StateEvidence> = {};
      const expectedDraft = { quantity: '0.07', stopLoss: '' };

      const markChart = async (): Promise<void> => {
        await chart().evaluate((element, marker) => {
          element.setAttribute('data-evidence-chart-marker', marker);
        }, CHART_MARKER);
      };

      const record = async (
        name: string,
        action: () => Promise<void>,
        draft = expectedDraft,
      ): Promise<StateEvidence> => {
        await markChart();
        const historyBefore = historyRequests;
        const drawingBefore = Number((await chart().getAttribute('data-drawing-count')) ?? '0');
        await action();
        await page.waitForTimeout(500);
        const measured = await geometry();
        const markerAfter = await chart().getAttribute('data-evidence-chart-marker');
        const drawingAfter = Number((await chart().getAttribute('data-drawing-count')) ?? '0');
        const evidence: StateEvidence = {
          ...measured,
          chartRemounted: markerAfter !== CHART_MARKER,
          historyRefetched: historyRequests > historyBefore,
          historyRequests: historyRequests - historyBefore,
          executionDraftSurvived:
            (await page.getByTestId('quantity-input').inputValue()) === draft.quantity &&
            (await page.getByTestId('stop-loss-input').inputValue()) === draft.stopLoss,
          drawingsSurvived: drawingBefore === drawingAfter && drawingAfter > 0,
          drawingCount: drawingAfter,
        };
        states[name] = evidence;
        await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
        expect(evidence.horizontalOverflow).toBe(0);
        expect(evidence.chartRemounted).toBe(false);
        expect(evidence.historyRefetched).toBe(false);
        expect(evidence.executionDraftSurvived).toBe(true);
        expect(evidence.drawingsSurvived).toBe(true);
        return evidence;
      };

      await record('01-1920-default', async () => undefined);
      await record('02-1440-default', async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
      });
      await record('03-1366-default', async () => {
        await page.setViewportSize({ width: 1366, height: 768 });
      });
      await record('04-1280-default', async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
      });

      await record('05-1440-active-position', async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.getByTestId('execution-submit-buy').click();
        await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible({
          timeout: 30_000,
        });
      });

      expectedDraft.stopLoss = '1.05000';
      await record('06-1440-sl-populated', async () => {
        await page.getByTestId('stop-loss-input').fill(expectedDraft.stopLoss);
      });

      await record('07-1440-limit-mode', async () => {
        await page.getByRole('radio', { name: 'Limit' }).click();
        await expect(page.getByTestId('trigger-price-input')).toBeVisible();
      });

      await record('08-1440-navigator-open', async () => {
        await page.getByTestId('navigator-collapse').click();
        await expect(page.getByTestId('navigator-restore')).toBeVisible();
        await page.getByTestId('navigator-restore').click();
        await expect(page.getByTestId('market-navigator-track')).toBeVisible();
      });

      await record('09-1440-bottom-dock-open', async () => {
        await page.getByTestId('workstation-dock-collapse').click();
        await page.getByTestId('workstation-dock-collapse').click();
        await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible();
      });

      // Manual keyboard resize: Home is the documented accessible path to the
      // current policy minimum. The resize itself must preserve chart/history/
      // draft/drawings. Reload then proves the preferred width is persisted.
      const resized = await record('10a-1440-manual-resize', async () => {
        await page.getByTestId('execution-resize').press('Home');
      });
      const storedBeforeReload = await page.evaluate((key) => {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      }, STORAGE_KEY);
      const drawingBeforeReload = Number((await chart().getAttribute('data-drawing-count')) ?? '0');
      const historyBeforeReload = historyRequests;
      await page.reload();
      await waitForWorkstation();
      const reloaded = await geometry();
      const drawingAfterReload = Number((await chart().getAttribute('data-drawing-count')) ?? '0');
      await page.screenshot({ path: resolve(OUT_DIR, '10b-1440-reload-persistence.png') });

      const reloadPersistence = {
        ...reloaded,
        preferredExecutionWidth: storedBeforeReload?.executionPreferredWidth ?? null,
        effectiveWidthBeforeReload: resized.executionDockWidth,
        effectiveWidthAfterReload: reloaded.executionDockWidth,
        layoutRestored: resized.executionDockWidth === reloaded.executionDockWidth,
        resizeChartRemounted: resized.chartRemounted,
        resizeHistoryRefetched: resized.historyRefetched,
        resizeExecutionDraftSurvived: resized.executionDraftSurvived,
        resizeDrawingsSurvived: resized.drawingsSurvived,
        reloadCreatedNewChart: true,
        reloadHistoryRequests: historyRequests - historyBeforeReload,
        reloadDraftPersisted: (await page.getByTestId('quantity-input').inputValue()) === '0.07',
        reloadDrawingsPersisted:
          drawingBeforeReload === drawingAfterReload && drawingAfterReload > 0,
        note: 'A document reload intentionally recreates the chart and reloads history. The invariant is that the manual resize itself does neither; layout and drawings persist across reload, while the execution draft remains session-scoped by the existing W4 contract.',
      };
      expect(reloadPersistence.layoutRestored).toBe(true);
      expect(reloadPersistence.resizeChartRemounted).toBe(false);
      expect(reloadPersistence.resizeHistoryRefetched).toBe(false);
      expect(reloadPersistence.resizeExecutionDraftSurvived).toBe(true);
      expect(reloadPersistence.resizeDrawingsSurvived).toBe(true);
      expect(reloadPersistence.reloadDrawingsPersisted).toBe(true);

      writeFileSync(
        resolve(OUT_DIR, 'evidence-manifest.json'),
        `${JSON.stringify({ phase: PHASE, capturedAt: new Date().toISOString(), states, reloadPersistence }, null, 2)}\n`,
        'utf8',
      );
    });

    test('proves every critical Execution state at the 224px legal minimum', async ({
      page,
      tradeAccount,
    }) => {
      test.setTimeout(300_000);
      mkdirSync(CLOSURE_224_DIR, { recursive: true });

      await page.setViewportSize({ width: 1440, height: 900 });
      await signIn(page, tradeAccount.email, tradeAccount.password);
      await page.evaluate((key) => window.localStorage.removeItem(key as string), STORAGE_KEY);
      await page.goto('/trade');
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
      await expect(page.getByTestId('quantity-bounds')).toBeVisible({ timeout: 30_000 });
      await page.getByTestId('execution-resize').press('Home');
      await expect(page.getByTestId('execution-resize')).toHaveAttribute('aria-valuenow', '224');
      await expect
        .poll(async () =>
          Math.round((await page.getByTestId('execution-track').boundingBox())?.width ?? 0),
        )
        .toBe(224);

      interface SafetyMeasure {
        text: string;
        clientWidth: number;
        scrollWidth: number;
        clientHeight: number;
        scrollHeight: number;
        textLineCount: number;
      }
      const measure = async (locator: Locator): Promise<SafetyMeasure> =>
        locator.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const lineTops = new Set(
            [...range.getClientRects()]
              .filter((rect) => rect.width > 0 && rect.height > 0)
              .map((rect) => Math.round(rect.top)),
          );
          return {
            text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            textLineCount: lineTops.size,
          };
        });
      const allMeasures = async (locator: Locator): Promise<SafetyMeasure[]> => {
        const count = await locator.count();
        const results: SafetyMeasure[] = [];
        for (let index = 0; index < count; index += 1)
          results.push(await measure(locator.nth(index)));
        return results;
      };
      const inputValueClipped = async (locator: Locator): Promise<boolean> =>
        locator.evaluate((element) => {
          const input = element as HTMLInputElement;
          if (!input.value) return false;
          const style = window.getComputedStyle(input);
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return true;
          context.font = style.font;
          const horizontalPadding =
            Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
          return context.measureText(input.value).width + horizontalPadding > input.clientWidth;
        });
      const visualSafety = async () => {
        const track = await measure(page.getByTestId('execution-track'));
        const panel = await measure(page.getByTestId('execution-center'));
        const quotes = await Promise.all([
          measure(page.getByTestId('execution-bid')),
          measure(page.getByTestId('execution-ask')),
        ]);
        const monetaryValues = await allMeasures(
          page.locator(
            '[data-testid^="execution-impact-summary-"][data-testid], [data-testid="execution-actions"] .wariba-data',
          ),
        );
        const orderTypes = await allMeasures(
          page.getByTestId('order-type-selector').getByRole('radio'),
        );
        const actions = await Promise.all([
          measure(page.getByTestId('execution-submit-sell')),
          measure(page.getByTestId('execution-submit-buy')),
        ]);
        const clippedProtectionValue =
          (await inputValueClipped(page.getByTestId('stop-loss-input'))) ||
          (await inputValueClipped(page.getByTestId('take-profit-input')));
        const horizontalOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        const checks = {
          executionTrackWidth: track.clientWidth,
          executionTrackHorizontalOverflow: track.scrollWidth - track.clientWidth,
          executionPanelHorizontalOverflow: panel.scrollWidth - panel.clientWidth,
          documentHorizontalOverflow: horizontalOverflow,
          quotes,
          monetaryValues,
          orderTypes,
          actions,
          clippedQuote: quotes.some((entry) => entry.scrollWidth > entry.clientWidth),
          clippedProtectionValue,
          wrappedMonetaryValue: monetaryValues
            .filter((entry) => /^-?[\d.,]+(?:\s[A-Z]{3})?$/.test(entry.text))
            .some((entry) => entry.scrollWidth > entry.clientWidth || entry.textLineCount > 1),
          truncatedOrderType:
            orderTypes.some(
              (entry) => entry.scrollWidth > entry.clientWidth || entry.textLineCount > 1,
            ) || orderTypes.map((entry) => entry.text).join('|') !== 'Market|Limit|Stop',
          unusableAction: actions.some(
            (entry) =>
              entry.clientWidth < 80 ||
              entry.clientHeight < 48 ||
              entry.scrollWidth > entry.clientWidth,
          ),
        };
        expect(checks.executionTrackWidth).toBe(224);
        expect(checks.executionTrackHorizontalOverflow).toBe(0);
        expect(checks.executionPanelHorizontalOverflow).toBe(0);
        expect(checks.documentHorizontalOverflow).toBe(0);
        expect(checks.clippedQuote).toBe(false);
        expect(checks.clippedProtectionValue).toBe(false);
        expect(checks.wrappedMonetaryValue).toBe(false);
        expect(checks.truncatedOrderType).toBe(false);
        expect(checks.unusableAction).toBe(false);
        return checks;
      };

      const states: Record<string, unknown> = {};
      const capture = async (name: string, extra: Record<string, unknown> = {}): Promise<void> => {
        await page.waitForTimeout(350);
        states[name] = { ...(await visualSafety()), ...extra };
        await page.screenshot({
          path: resolve(CLOSURE_224_DIR, `${name}.png`),
          fullPage: false,
        });
      };

      await page.getByTestId('quantity-input').fill('0.01');
      await capture('01-market');

      await page.getByRole('radio', { name: 'Limit', exact: true }).click();
      const bid = Number(await page.getByTestId('execution-bid').textContent());
      await page.getByTestId('trigger-price-input').fill((bid - 0.005).toFixed(5));
      await capture('02-limit');

      await page.getByRole('radio', { name: 'Market', exact: true }).click();
      await page.getByTestId('stop-loss-input').fill('1.05000');
      await capture('03-sl-populated');

      await page.getByTestId('take-profit-input').fill('1.12000');
      await capture('04-sl-tp-populated');

      await expect(page.getByTestId('execution-impact-summary')).toBeVisible();
      await capture('05-estimate-visible', {
        estimateVisible: await page.getByTestId('execution-impact-summary').isVisible(),
      });

      await page.getByTestId('quantity-input').fill('1.00');
      await page.getByTestId('execution-submit-buy').click();
      await expect(page.getByTestId('execution-rejection')).toBeVisible({ timeout: 30_000 });
      await capture('06-server-rejection', {
        rejection: (await page.getByTestId('execution-rejection').textContent())
          ?.replace(/\s+/g, ' ')
          .trim(),
      });

      writeFileSync(
        resolve(CLOSURE_224_DIR, 'visual-safety-manifest.json'),
        `${JSON.stringify(
          {
            capturedAt: new Date().toISOString(),
            executionWidth: 224,
            minimumAccepted: true,
            states,
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    });
  },
);
