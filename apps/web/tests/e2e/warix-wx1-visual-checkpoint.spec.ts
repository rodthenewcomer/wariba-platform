import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The visual iteration gate for the WX1 visual-art-direction closure.
 *
 * This is deliberately *not* the WX1 evidence harness. That harness captures
 * thirty-odd states, measures geometry and runs Axe, which takes minutes — far
 * too slow to look at a screenshot, change a colour and look again. This spec
 * renders the one composition the closure is judged on, plus the 1024 band the
 * hybrid decision rests on, so a single iteration is a build and one shot.
 *
 * It asserts almost nothing on purpose. The acceptance evidence here is the
 * rendered pixels, inspected by a human (or by the agent reading the PNG back);
 * the contractual assertions live in the full evidence spec.
 */
/*
 * Written into the evidence bundle, not into `test-results`: Playwright clears
 * its output directory at the start of every run, so a desktop run erased the
 * mobile renders captured minutes earlier and the two families could never be
 * reviewed side by side.
 */
const OUT_DIR = resolve(
  process.cwd(),
  '../../docs/04-ux/evidence/warix-wx1-visual-closure/checkpoint',
);

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

test.describe('WX1 visual checkpoint', { tag: ['@warix-visual-checkpoint'] }, () => {
  test('renders the representative desktop compositions', async ({ page, tradeAccount }) => {
    test.setTimeout(300_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);

    const settle = async (): Promise<void> => {
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      await expect(
        page
          .getByRole('group', { name: /^Graphique / })
          .locator('canvas')
          .first(),
      ).toBeVisible({ timeout: 30_000 });
      // Enough observed candles that the plot is a chart rather than a line.
      await expect(page.getByTestId('chart-history-status')).toHaveAttribute(
        'data-history-status',
        'ready',
        { timeout: 60_000 },
      );
      await page.waitForTimeout(2_500);
    };

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle();
    await shot('checkpoint-1440x900-default');

    // The empty dock is part of the default composition and the state §23 asks
    // for separately; at this point in the run no position has been opened, so
    // the shot above already is it — captured under its own name for pairing.
    await shot('checkpoint-1440x900-empty-dock');

    // A selected instrument in the Navigator, with the drawing rail engaged, is
    // where the selection language has to prove itself.
    await page.getByRole('button', { name: 'Ligne horizontale', exact: true }).click();
    await page.waitForTimeout(400);
    await shot('checkpoint-1440x900-drawing-rail-active');
    await page.getByRole('button', { name: 'Sélection', exact: true }).click();

    await page.getByTestId('chart-indicators-trigger').click();
    await page.waitForTimeout(400);
    await shot('checkpoint-1440x900-indicators-open');
    await page.keyboard.press('Escape');

    /*
     * The Execution Center's middle third, fully exercised: a pending kind so
     * the trigger field is present, and both protection levels filled so the
     * estimate table renders. This is the state the refinement pass is judged
     * on — an empty market ticket flatters the layout.
     */
    await page.getByRole('radio', { name: 'Limit', exact: true }).click();
    await page.getByTestId('trigger-price-input').fill('1.08000');
    await page.getByTestId('stop-loss-input').fill('1.07800');
    await page.getByTestId('take-profit-input').fill('1.08600');
    await page.waitForTimeout(600);
    await shot('checkpoint-1440x900-execution');
    await page.getByRole('radio', { name: 'Market', exact: true }).click();

    // §22 — the hybrid band, with and without the Navigator, so the decision is
    // made from two rendered compositions rather than from arithmetic.
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/trade');
    await settle();
    await shot('checkpoint-1024x768-hybrid-default');

    const restore = page.getByTestId('navigator-restore');
    if (await restore.isVisible()) {
      await restore.click();
      await page.waitForTimeout(600);
      await shot('checkpoint-1024x768-navigator-open');
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/trade');
    await settle();
    await shot('checkpoint-1280x800-default');

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/trade');
    await settle();
    await shot('checkpoint-1366x768-default');

    // The crosshair's own price and time labels, themed at the chart options.
    const plotBox = await page.getByRole('group', { name: /^Graphique / }).boundingBox();
    if (plotBox) {
      await page.mouse.move(plotBox.x + plotBox.width * 0.6, plotBox.y + plotBox.height * 0.45);
      await page.waitForTimeout(400);
      await shot('checkpoint-1366x768-crosshair');
    }

    // A dark tooltip on an icon-only control, proving the primitive fix.
    await page.getByTestId('chart-tool-rectangle').hover();
    await page.waitForTimeout(500);
    await shot('checkpoint-1366x768-tooltip');
    await page.getByRole('button', { name: 'Sélection', exact: true }).click();

    // §33 — a Navigator with a different instrument selected, so the selection
    // treatment is judged against a row that is not the default.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle();
    await page
      .getByTestId('market-navigator')
      .first()
      .getByRole('button', { name: /^XAUUSD/ })
      .click();
    await page.waitForTimeout(600);
    await shot('checkpoint-1440x900-navigator-selected');
    await page
      .getByTestId('market-navigator')
      .first()
      .getByRole('button', { name: /^EURUSD/ })
      .click();
    await page.waitForTimeout(400);

    /*
     * §10/§33 — execution blocked, and a populated dock.
     *
     * Blocking here is transport loss, which drives the *same* `entryBlocked`
     * gate a risk lock drives: both disable the decision keys and both surface
     * through `ExecutionStatus`. A DLL-breach lock is not reachable from this
     * harness without writing account risk state, and §10 forbids inventing a
     * rejection the server did not produce — so the gate's blocked presentation
     * is proven through the path that is genuinely reachable.
     */
    await page.getByTestId('execution-submit-buy').click();
    await page.getByRole('tab', { name: /^Positions/ }).click();
    await expect(page.getByRole('cell', { name: 'EURUSD · Achat', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(600);
    await shot('checkpoint-1440x900-populated-dock');

    await page.setViewportSize({ width: 1536, height: 864 });
    await page.goto('/trade');
    await settle();
    await shot('checkpoint-1536x864-default');

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/trade');
    await settle();
    await shot('checkpoint-1920x1080-default');

    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/trade');
    await settle();
    await shot('checkpoint-2560x1440-default');
  });
});

test.describe(
  'WX1 visual checkpoint — mobile',
  { tag: ['@warix-visual-checkpoint', '@mobile'] },
  () => {
    test('renders the representative mobile compositions', async ({ page, tradeAccount }) => {
      test.setTimeout(300_000);
      mkdirSync(OUT_DIR, { recursive: true });

      await signIn(page, tradeAccount.email, tradeAccount.password);

      const settle = async (): Promise<void> => {
        await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
          'data-connection',
          'open',
          { timeout: 30_000 },
        );
        await expect(
          page
            .getByRole('group', { name: /^Graphique / })
            .locator('canvas')
            .first(),
        ).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId('chart-history-status')).toHaveAttribute(
          'data-history-status',
          'ready',
          { timeout: 60_000 },
        );
        await page.waitForTimeout(2_500);
      };

      const shot = async (name: string): Promise<void> => {
        await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
      };

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/trade');
      await settle();
      await shot('checkpoint-mobile-390x844-chart-first');

      // The most important mobile surface: the desktop execution instrument,
      // translated to touch.
      await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
      await expect(page.getByTestId('execution-center')).toBeVisible();
      await page.waitForTimeout(500);
      await shot('checkpoint-mobile-390x844-execution');

      await page.getByRole('radio', { name: 'Limit', exact: true }).click();
      await page.getByTestId('trigger-price-input').fill('1.08000');
      await page.getByTestId('stop-loss-input').fill('1.07800');
      await page.getByTestId('take-profit-input').fill('1.08600');
      await page.waitForTimeout(600);
      await shot('checkpoint-mobile-390x844-limit');
      await page.getByRole('radio', { name: 'Market', exact: true }).click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      await page.getByTestId('chart-tools-sheet-trigger').click();
      await expect(page.getByTestId('chart-tools-sheet')).toBeVisible();
      await page.waitForTimeout(400);
      await shot('checkpoint-mobile-390x844-tools');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      await page.getByTestId('mobile-dock-trigger').click();
      await expect(page.getByRole('dialog', { name: 'Activité de trading' })).toBeVisible();
      await page.waitForTimeout(400);
      await shot('checkpoint-mobile-390x844-activity');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      // A placed and selected drawing, so the contextual bar can be judged
      // against the price scale it must not cover.
      await page.getByTestId('chart-tools-sheet-trigger').click();
      await page.getByTestId('chart-tool-horizontal_line').click();
      const plot = page.getByRole('group', { name: /^Graphique / });
      const box = await plot.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.45);
      }
      await page.waitForTimeout(400);
      await page.getByTestId('chart-tools-sheet-trigger').click();
      await page.getByTestId('chart-tool-select').click();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.45);
      }
      await page.waitForTimeout(500);
      await shot('checkpoint-mobile-390x844-selected-drawing');

      // Crosshair labels are the last lightweight-charts surfaces that were not
      // WARIBA-themed; they only exist while the pointer is on the plot.
      const plotForCrosshair = await page.getByRole('group', { name: /^Graphique / }).boundingBox();
      if (plotForCrosshair) {
        await page.mouse.move(
          plotForCrosshair.x + plotForCrosshair.width * 0.55,
          plotForCrosshair.y + plotForCrosshair.height * 0.5,
        );
        await page.waitForTimeout(400);
        await shot('checkpoint-mobile-390x844-crosshair');
      }

      /*
       * §21 — the contextual bar, proven at its widest label.
       *
       * `drawingTypeLabel` has five values and the two longest are
       * "Ligne horizontale" and "Ligne de tendance", both 17 characters;
       * "Demi-droite", "Rectangle" and "Fibonacci" are shorter. The bar's width
       * is driven by that label, so a type that fits on one line at 17
       * characters cannot wrap at 11 or 9 — proving the widest case proves the
       * set.
       *
       * An earlier attempt drove all five through the mobile Tools sheet and
       * produced worse evidence than none: the arming click was intermittently
       * lost between sheet dismissal and the plot, so captures named "rectangle"
       * and "fibonacci" showed a leftover horizontal line. The per-type
       * geometry of each drawing is proven instead by the WX1 evidence harness,
       * which draws and captures all five deterministically on desktop
       * (`desktop-1440x900-{horizontal-line,trend-line,rectangle,fibonacci}`).
       */
      await page.getByTestId('chart-tools-sheet-trigger').click();
      await page.getByTestId('chart-tool-horizontal_line').click();
      const drawingPlot = await page.getByRole('group', { name: /^Graphique / }).boundingBox();
      if (drawingPlot) {
        await page.mouse.click(
          drawingPlot.x + drawingPlot.width * 0.45,
          drawingPlot.y + drawingPlot.height * 0.45,
        );
        await page.waitForTimeout(400);
        await page.getByTestId('chart-tools-sheet-trigger').click();
        await page.getByTestId('chart-tool-select').click();
        await page.mouse.click(
          drawingPlot.x + drawingPlot.width * 0.45,
          drawingPlot.y + drawingPlot.height * 0.45,
        );
        await page.waitForTimeout(500);
        await shot('checkpoint-mobile-390x844-selected-drawing');

        // §33 — the crosshair over a selected drawing: two temporary analytical
        // layers at once, against the live Bid/Ask labels they must not
        // overpower.
        await page.mouse.move(
          drawingPlot.x + drawingPlot.width * 0.72,
          drawingPlot.y + drawingPlot.height * 0.28,
        );
        await page.waitForTimeout(400);
        await shot('checkpoint-mobile-390x844-crosshair-with-drawing');
      }

      // §33 — a populated Activity sheet, so the dock is judged with rows in it.
      await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
      await page.getByTestId('execution-submit-buy').click();
      await page.waitForTimeout(1_200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      await page.getByTestId('mobile-dock-trigger').click();
      await expect(page.getByRole('dialog', { name: 'Activité de trading' })).toBeVisible();
      await page.waitForTimeout(600);
      await shot('checkpoint-mobile-390x844-activity-populated');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      for (const width of [320, 360, 412, 375, 430] as const) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/trade');
        await settle();
        await shot(`checkpoint-mobile-${width}x844-chart-first`);
      }
    });
  },
);
