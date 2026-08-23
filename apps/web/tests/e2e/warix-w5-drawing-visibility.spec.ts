import { mkdirSync, writeFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WariX W5 — drawings must actually be *visible*, proved in a real browser.
 *
 * `data-drawing-count` says a record exists. It says nothing about whether a
 * human can see the geometry, which is the thing under review. This spec walks
 * every W5 drawing type and checks the whole chain from stored record to lit
 * pixels:
 *
 *   1. the drawing is in the canonical store (localStorage)
 *   2. it is projected (the chart reports it)
 *   3. the SVG layer has a non-zero box
 *   4. the expected SVG geometry exists for its type
 *   5. those coordinates fall inside the plot
 *   6. the computed stroke is visible — non-transparent, non-zero width
 *   7. the layer paints above the chart canvas
 *   8. trading overlays still sit above the drawing layer
 *   9. a selected drawing shows identifiable handles
 *  10. the stroke colour is not the crosshair's colour
 *
 * Check 10 is not pedantry. The first cut defaulted drawings to `#9AA3B1`,
 * which **is** `--wariba-chart-crosshair`, so every drawing was painted in the
 * pointer's own colour and a reviewer could not tell them apart. That is the
 * defect this spec exists to prevent from recurring.
 *
 * Screenshots are taken with the pointer parked outside the plot, so the
 * crosshair is not in frame to be confused with the geometry.
 */
const OUT_DIR = 'test-results/warix-w5-review';

/** `--wariba-chart-crosshair`. No drawing may resolve to this. */
const CROSSHAIR_COLOR = 'rgb(154, 163, 177)';

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

interface GeometryReport {
  type: string;
  storedInLocalStorage: boolean;
  projected: boolean;
  layerWidth: number;
  layerHeight: number;
  shapeCount: number;
  shapeTags: string[];
  insidePlot: boolean;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  strokeIsCrosshairColor: boolean;
  fibLevelLabels: string[];
}

test.describe('WariX W5 drawing visibility', { tag: ['@warix-w5-evidence'] }, () => {
  test('every drawing type renders geometry a human can see', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);

    const chart = (): Locator => page.getByRole('group', { name: /Graphique/ });
    const layer = (): Locator => page.getByTestId('chart-drawing-layer');
    const status = page.getByTestId('chart-history-status');

    await page.setViewportSize({ width: 1440, height: 900 });
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
      .toMatch(/^(ready|empty)$/);
    // Enough bars that anchors have somewhere real to snap to (§47).
    await expect
      .poll(async () => Number((await status.getAttribute('data-history-candles')) ?? '0'), {
        timeout: 120_000,
        intervals: [2_000],
      })
      .toBeGreaterThanOrEqual(60);

    const box = await chart().boundingBox();
    if (!box) throw new Error('chart has no bounding box');

    const selectTool = async (name: string): Promise<void> => {
      await page.getByTestId('chart-tools-trigger').click();
      await page.getByRole('button', { name, exact: true }).click();
    };
    const clickAt = async (fx: number, fy: number): Promise<void> => {
      await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    };
    /** Parks the pointer outside the plot so the crosshair leaves the frame. */
    const parkPointer = async (): Promise<void> => {
      await page.mouse.move(box.x + box.width / 2, box.y - 60);
      await expect(layer()).toBeVisible();
    };
    const clearDrawings = async (): Promise<void> => {
      await page.evaluate(() => window.localStorage.removeItem('wariba.warix.chart.drawings'));
      await page.reload();
      await expect(chart().locator('canvas').first()).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => (await status.getAttribute('data-history-status')) ?? '', {
          timeout: 120_000,
          intervals: [500],
        })
        .toMatch(/^(ready|empty)$/);
    };

    /** Reads everything checks 1-10 need, straight out of the live DOM. */
    const inspect = async (type: string): Promise<GeometryReport> =>
      page.evaluate(
        ({ type, crosshair }) => {
          const svg = document.querySelector<SVGSVGElement>('[data-testid="chart-drawing-layer"]');
          const group = svg?.querySelector<SVGGElement>(`[data-drawing-type="${type}"]`) ?? null;
          const shapes = group
            ? Array.from(group.querySelectorAll<SVGGraphicsElement>('line, rect, circle'))
            : [];
          const stored = window.localStorage.getItem('wariba.warix.chart.drawings') ?? '';
          const layerBox = svg?.getBoundingClientRect();
          const width = layerBox?.width ?? 0;
          const height = layerBox?.height ?? 0;

          const painted = shapes.filter((shape) => {
            const style = getComputedStyle(shape);
            return (
              style.stroke !== 'none' &&
              style.stroke !== 'rgba(0, 0, 0, 0)' &&
              parseFloat(style.strokeWidth) > 0
            );
          });
          const first = painted[0] ?? shapes[0] ?? null;
          const firstStyle = first ? getComputedStyle(first) : null;

          // Every coordinate the group draws must land inside the layer box.
          const inside = shapes.every((shape) => {
            const r = shape.getBoundingClientRect();
            return (
              r.right >= (layerBox?.left ?? 0) - 1 &&
              r.left <= (layerBox?.right ?? 0) + 1 &&
              r.bottom >= (layerBox?.top ?? 0) - 1 &&
              r.top <= (layerBox?.bottom ?? 0) + 1
            );
          });

          const stroke = firstStyle?.stroke ?? 'none';
          return {
            type,
            storedInLocalStorage: stored.includes(`"type":"${type}"`),
            projected: group !== null,
            layerWidth: width,
            layerHeight: height,
            shapeCount: painted.length,
            shapeTags: shapes.map((shape) => shape.tagName.toLowerCase()),
            insidePlot: inside,
            stroke,
            strokeWidth: firstStyle ? parseFloat(firstStyle.strokeWidth) : 0,
            opacity: firstStyle ? parseFloat(firstStyle.opacity || '1') : 0,
            strokeIsCrosshairColor: stroke === crosshair,
            fibLevelLabels: group
              ? Array.from(group.querySelectorAll('text')).map((t) => t.textContent ?? '')
              : [],
          };
        },
        { type, crosshair: CROSSHAIR_COLOR },
      );

    const assertVisible = (report: GeometryReport, expectedTags: string[]): void => {
      expect(report.storedInLocalStorage, `${report.type}: in canonical store`).toBe(true);
      expect(report.projected, `${report.type}: projected`).toBe(true);
      expect(report.layerWidth, `${report.type}: layer width`).toBeGreaterThan(0);
      expect(report.layerHeight, `${report.type}: layer height`).toBeGreaterThan(0);
      expect(report.shapeCount, `${report.type}: painted shapes`).toBeGreaterThan(0);
      for (const tag of expectedTags) {
        expect(report.shapeTags, `${report.type}: expected a <${tag}>`).toContain(tag);
      }
      expect(report.insidePlot, `${report.type}: geometry inside the plot`).toBe(true);
      expect(report.strokeWidth, `${report.type}: stroke width`).toBeGreaterThan(0);
      expect(report.opacity, `${report.type}: opacity`).toBeGreaterThan(0.3);
      // Check 10 — the defect that made this spec necessary.
      expect(
        report.strokeIsCrosshairColor,
        `${report.type}: stroke must not be the crosshair colour`,
      ).toBe(false);
    };

    const reports: Record<string, GeometryReport> = {};

    // ---- A. horizontal line, drawn and then selected ----------------------
    await clearDrawings();
    await selectTool('Ligne horizontale');
    await clickAt(0.5, 0.45);
    await parkPointer();
    reports.horizontal_line = await inspect('horizontal_line');
    assertVisible(reports.horizontal_line, ['line']);
    await page.screenshot({ path: `${OUT_DIR}/drawing-A-horizontal-line.png` });

    // Selected: handles appear (check 9).
    await clickAt(0.5, 0.45);
    await expect(page.getByTestId('chart-drawing-actions')).toBeVisible();
    await parkPointer();
    const selected = await inspect('horizontal_line');
    expect(selected.shapeTags, 'selected drawing shows handles').toContain('circle');
    reports.selected_handles = selected;
    await page.screenshot({ path: `${OUT_DIR}/drawing-A2-horizontal-selected-handles.png` });

    // ---- B. trend line -----------------------------------------------------
    await clearDrawings();
    await selectTool('Ligne de tendance');
    await clickAt(0.3, 0.7);
    await clickAt(0.75, 0.3);
    await parkPointer();
    reports.trend_line = await inspect('trend_line');
    assertVisible(reports.trend_line, ['line']);
    await page.screenshot({ path: `${OUT_DIR}/drawing-B-trend-line.png` });

    // ---- C. ray ------------------------------------------------------------
    await clearDrawings();
    await selectTool('Demi-droite');
    await clickAt(0.3, 0.6);
    await clickAt(0.55, 0.4);
    await parkPointer();
    reports.ray = await inspect('ray');
    assertVisible(reports.ray, ['line']);
    await page.screenshot({ path: `${OUT_DIR}/drawing-C-ray.png` });

    // ---- D. rectangle ------------------------------------------------------
    await clearDrawings();
    await selectTool('Rectangle');
    await clickAt(0.3, 0.3);
    await clickAt(0.7, 0.65);
    await parkPointer();
    reports.rectangle = await inspect('rectangle');
    assertVisible(reports.rectangle, ['rect']);
    await page.screenshot({ path: `${OUT_DIR}/drawing-D-rectangle.png` });

    // ---- E. Fibonacci, with level labels -----------------------------------
    await clearDrawings();
    await selectTool('Fibonacci');
    await clickAt(0.3, 0.25);
    await clickAt(0.7, 0.75);
    await parkPointer();
    reports.fibonacci = await inspect('fibonacci');
    assertVisible(reports.fibonacci, ['line']);
    expect(reports.fibonacci.fibLevelLabels, 'the seven retracement labels').toEqual([
      '0',
      '23.6',
      '38.2',
      '50',
      '61.8',
      '78.6',
      '100',
    ]);
    await page.screenshot({ path: `${OUT_DIR}/drawing-E-fibonacci.png` });

    // ---- F. two drawings at once, with a trading overlay present -----------
    await selectTool('Ligne horizontale');
    await clickAt(0.5, 0.4);
    await parkPointer();
    await expect(chart()).toHaveAttribute('data-drawing-count', '2');
    await page.screenshot({ path: `${OUT_DIR}/drawing-F-two-drawings.png` });

    /**
     * ---- 7 & 8. stacking, measured rather than assumed --------------------
     *
     * This is the check that would have caught the real defect. Every geometry
     * assertion above passed while the drawing layer was painting *underneath*
     * the chart: lightweight-charts sets `z-index: 1` on its canvas, nothing
     * between it and the chart column created a stacking context, so that `1`
     * beat every sibling's `auto` regardless of DOM order.
     *
     * The container is now `isolation: isolate`, which contains the library's
     * z-index and makes DOM order authoritative again — so the two facts below
     * together *are* the hierarchy: the canvas comes first, the drawing layer
     * next, and every trading overlay after it.
     */
    const stacking = await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>(
        '[role="group"][aria-label^="Graphique"]',
      );
      const svg = document.querySelector('[data-testid="chart-drawing-layer"]');
      const canvas = container?.querySelector('canvas');
      if (!svg || !canvas || !container) return null;
      const plot = svg.parentElement;
      const siblings = plot ? Array.from(plot.children) : [];
      return {
        canvasPrecedesLayer:
          (svg.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
        containerIsolation: getComputedStyle(container).isolation,
        canvasZIndex: getComputedStyle(canvas).zIndex,
        layerPointerEvents: getComputedStyle(svg).pointerEvents,
        // Everything painted after the drawing layer — the trading overlays —
        // sits above it, which is §57 expressed as a position in the tree.
        layerIndexAmongSiblings: siblings.indexOf(svg),
        siblingCount: siblings.length,
      };
    });
    expect(stacking?.canvasPrecedesLayer, 'drawing layer comes after the chart canvas').toBe(true);
    expect(
      stacking?.containerIsolation,
      "the chart container must contain lightweight-charts' z-index, or the layer paints under the canvas",
    ).toBe('isolate');
    expect(stacking?.layerPointerEvents, 'drawing layer never captures the pointer').toBe('none');
    expect(
      stacking?.layerIndexAmongSiblings,
      'the drawing layer sits below every overlay painted after it',
    ).toBe(1);

    // ---- G/H. mobile -------------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(chart().locator('canvas').first()).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => (await status.getAttribute('data-history-status')) ?? '', {
        timeout: 120_000,
        intervals: [500],
      })
      .toMatch(/^(ready|empty)$/);
    const mobileBox = await chart().boundingBox();
    if (mobileBox) {
      await page.mouse.move(mobileBox.x + mobileBox.width / 2, mobileBox.y - 40);
    }
    const mobileReport = await inspect('horizontal_line');
    expect(mobileReport.projected, 'mobile: the stored drawing projects').toBe(true);
    expect(mobileReport.shapeCount, 'mobile: painted shapes').toBeGreaterThan(0);
    reports.mobile = mobileReport;
    await page.screenshot({ path: `${OUT_DIR}/drawing-G-mobile-visible.png` });

    if (mobileBox) {
      await page.mouse.click(
        mobileBox.x + mobileBox.width * 0.5,
        mobileBox.y + mobileBox.height * 0.4,
      );
    }
    await expect(page.getByTestId('chart-drawing-actions')).toBeVisible();
    await page.screenshot({ path: `${OUT_DIR}/drawing-H-mobile-selected.png` });

    writeFileSync(
      `${OUT_DIR}/drawing-visibility.json`,
      `${JSON.stringify({ capturedAt: new Date().toISOString(), crosshairColor: CROSSHAIR_COLOR, reports }, null, 2)}\n`,
    );
  });
});
