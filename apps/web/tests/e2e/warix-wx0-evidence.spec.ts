import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WX0 is an audit/evidence pass, not a product milestone. This spec records
 * the accepted W5 workstation exactly as it renders before WX1. It makes no
 * visual assertions and changes no production component.
 *
 * Run explicitly:
 *
 *   pnpm --filter @wariba/web exec playwright test \
 *     tests/e2e/warix-wx0-evidence.spec.ts --project=desktop
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-wx0-kinetic-workstation');

const DESKTOP_VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
] as const;

const MOBILE_VIEWPORTS = [
  { width: 320, height: 844 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
] as const;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

interface RectEvidence {
  x: number;
  y: number;
  width: number;
  height: number;
}

const roundRect = (rect: RectEvidence | null): RectEvidence | null =>
  rect
    ? {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }
    : null;

test.describe('WariX WX0 kinetic workstation baseline', { tag: ['@warix-wx0-evidence'] }, () => {
  test('captures required desktop/mobile states and measured geometry', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(900_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);

    const chart = (): Locator => page.getByRole('group', { name: /Graphique/ });
    const historyStatus = page.getByTestId('chart-history-status');

    const openWorkstation = async (): Promise<void> => {
      await page.goto('/trade');
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      if ((page.viewportSize()?.width ?? 1440) < 1024) {
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

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    const geometry = async (): Promise<Record<string, unknown>> => {
      const viewport = page.viewportSize();
      const read = async (locator: Locator): Promise<RectEvidence | null> => {
        if ((await locator.count()) === 0 || !(await locator.isVisible())) return null;
        return roundRect(await locator.boundingBox());
      };
      const chartRect = await read(chart());
      const canvasRect = await read(chart().locator('canvas').first());
      const body = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      }));
      const areaShare =
        viewport && chartRect
          ? Math.round(
              ((chartRect.width * chartRect.height) / (viewport.width * viewport.height)) * 10_000,
            ) / 100
          : null;
      return {
        viewport,
        statusBar: await read(page.getByTestId('workstation-status-bar')),
        navRail: await read(page.getByTestId('workstation-nav-rail')),
        navigator: await read(page.getByTestId('market-navigator').first()),
        chart: chartRect,
        chartCanvas: canvasRect,
        chartToolbar: await read(page.getByTestId('chart-toolbar')),
        execution: await read(page.getByTestId('execution-center').first()),
        dock: await read(page.getByTestId('workstation-dock').first()),
        mobileMarketBar: await read(page.getByTestId('mobile-market-trigger')),
        mobileActionRail: await read(page.getByTestId('mobile-action-rail')),
        preChartChromeHeight: chartRect ? chartRect.y : null,
        chartViewportAreaSharePercent: areaShare,
        chartViewportWidthSharePercent:
          viewport && chartRect
            ? Math.round((chartRect.width / viewport.width) * 10_000) / 100
            : null,
        chartViewportHeightSharePercent:
          viewport && chartRect
            ? Math.round((chartRect.height / viewport.height) * 10_000) / 100
            : null,
        document: body,
      };
    };

    const manifest: Record<string, unknown> = {
      capturedAt: new Date().toISOString(),
      capturedCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: resolve(process.cwd(), '../..'),
        encoding: 'utf8',
      }).trim(),
      acceptedW5Head: '96ec035ceccf35dcc7cfe46346ae7ae739cad15c',
      w5MergeCommit: '715010163cafca56561f71e396c0c7f5d58c63a6',
      source: 'accepted W5 runtime; observed process-memory history; no fabricated candles',
      desktop: {},
      mobile: {},
      states: {},
    };

    // Required desktop baseline at every audit viewport. Fresh fixture means
    // the open Positions dock is intentionally empty.
    await page.setViewportSize(DESKTOP_VIEWPORTS[0]);
    await openWorkstation();
    for (const viewport of DESKTOP_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await expect(page.getByTestId('execution-center')).toBeVisible();
      await expect(chart().locator('canvas').first()).toBeVisible();
      const key = `${viewport.width}x${viewport.height}`;
      await shot(`desktop-${key}-default-empty-dock`);
      (manifest.desktop as Record<string, unknown>)[key] = await geometry();
    }

    // Desktop analytical and execution states at the canonical review width.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByTestId('execution-center')).toBeVisible();

    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('chart-indicator-options')).toBeVisible();
    await shot('desktop-1440x900-indicators-open');
    await page.keyboard.press('Escape');

    await page.getByTestId('chart-tools-trigger').click();
    await page.getByRole('button', { name: 'Ligne horizontale', exact: true }).click();
    const desktopChartBox = await chart().boundingBox();
    if (!desktopChartBox) throw new Error('desktop chart has no bounding box');
    const desktopDrawingPoint = {
      x: desktopChartBox.x + desktopChartBox.width * 0.48,
      y: desktopChartBox.y + desktopChartBox.height * 0.42,
    };
    await page.mouse.click(desktopDrawingPoint.x, desktopDrawingPoint.y);
    await expect(chart()).toHaveAttribute('data-drawing-count', /[1-9]\d*/);
    await page.mouse.click(desktopDrawingPoint.x, desktopDrawingPoint.y);
    await expect(page.getByTestId('chart-drawing-actions')).toBeVisible();
    await shot('desktop-1440x900-drawing-selected');

    await page.getByRole('radio', { name: 'Limit', exact: true }).click();
    const bid = Number(await page.getByTestId('execution-bid').textContent());
    await page.getByTestId('trigger-price-input').fill((bid - 0.005).toFixed(5));
    await page.getByTestId('stop-loss-input').fill((bid - 0.008).toFixed(5));
    await page.getByTestId('take-profit-input').fill((bid + 0.005).toFixed(5));
    await expect(page.getByTestId('protection-preview')).toBeVisible();
    await shot('desktop-1440x900-limit-order');

    await page.getByRole('radio', { name: 'Market', exact: true }).click();
    await page.getByLabel('Quantité (lots)').fill('1.00');
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('execution-rejection')).toBeVisible({ timeout: 30_000 });
    await shot('desktop-1440x900-server-rejection');
    (manifest.states as Record<string, unknown>).serverRejection = (
      await page.getByTestId('execution-rejection').textContent()
    )
      ?.replace(/\s+/g, ' ')
      .trim();

    // Required mobile chart-first baselines.
    // Start them from a clean presentation state: the desktop drawing and
    // rejection above remain valid evidence, but must not contaminate the
    // phone's default chart-first capture.
    await page.evaluate(() => window.localStorage.removeItem('wariba.warix.chart.drawings'));
    await page.setViewportSize(MOBILE_VIEWPORTS[0]);
    await page.reload();
    await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
      'data-connection',
      'open',
      { timeout: 30_000 },
    );
    await expect(page.getByTestId('mobile-market-trigger')).not.toContainText('— / —', {
      timeout: 30_000,
    });
    await expect(chart().locator('canvas').first()).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => (await historyStatus.getAttribute('data-history-status')) ?? '', {
        timeout: 120_000,
        intervals: [500],
      })
      .toMatch(/^(ready|empty)$/);
    for (const viewport of MOBILE_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await expect(page.getByTestId('mobile-action-rail')).toBeVisible();
      await expect(chart().locator('canvas').first()).toBeVisible();
      const key = `${viewport.width}x${viewport.height}`;
      await shot(`mobile-${key}-chart-first`);
      (manifest.mobile as Record<string, unknown>)[key] = await geometry();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('mobile-action-rail')).toBeVisible();

    await page.getByTestId('chart-tools-sheet-trigger').click();
    await expect(page.getByTestId('chart-tools-sheet')).toBeVisible();
    await shot('mobile-390x844-tools-sheet');
    await page.getByRole('button', { name: 'Ligne horizontale', exact: true }).click();
    const mobileChartBox = await chart().boundingBox();
    if (!mobileChartBox) throw new Error('mobile chart has no bounding box');
    await page.mouse.click(
      mobileChartBox.x + mobileChartBox.width * 0.5,
      mobileChartBox.y + mobileChartBox.height * 0.38,
    );
    await expect(chart()).toHaveAttribute('data-drawing-count', /[1-9]\d*/);
    await shot('mobile-390x844-drawing-active');

    await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    await shot('mobile-390x844-execution-sheet');
    await page.keyboard.press('Escape');

    await page.getByTestId('mobile-dock-trigger').click();
    await expect(page.getByRole('dialog', { name: 'Activité de trading' })).toBeVisible();
    await shot('mobile-390x844-activity-sheet');
    await page.keyboard.press('Escape');

    // Risk-blocked state is produced on the wire and captured last because a
    // routed WebSocket remains installed for the rest of the page lifetime.
    await page.routeWebSocket(/\/ws/, (ws) => {
      const server = ws.connectToServer();
      server.onMessage((message) => {
        const text = typeof message === 'string' ? message : message.toString();
        if (text.includes('"account.snapshot"')) {
          const envelope = JSON.parse(text) as { payload: { risk: { status: string } | null } };
          if (envelope.payload.risk) {
            envelope.payload.risk.status = 'breached';
            ws.send(JSON.stringify(envelope));
            return;
          }
        }
        ws.send(message);
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkstation();
    await expect(page.getByTestId('execution-gate')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('execution-submit-buy')).toBeDisabled();
    await shot('desktop-1440x900-risk-blocked');
    (manifest.states as Record<string, unknown>).riskBlocked = (
      await page.getByTestId('execution-gate').textContent()
    )
      ?.replace(/\s+/g, ' ')
      .trim();

    writeFileSync(
      resolve(OUT_DIR, 'evidence-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  });
});
