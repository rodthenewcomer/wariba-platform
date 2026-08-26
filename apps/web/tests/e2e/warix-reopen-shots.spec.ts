import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * FAST BUILD MODE render harness for the WX1 reopen pass.
 *
 * Not a certification spec and not evidence: it asserts almost nothing. Its only
 * job is to drive the workstation into each of the states §40 asks for and write
 * a PNG, fast enough that a visual correction and a re-render are one command.
 */
const OUT = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-wx1-reopen');

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

async function settle(page: Page): Promise<void> {
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
  await page.waitForTimeout(2500);
}

/** Capture floating layers only after their restrained presence transition is complete. */
async function settleLayer(page: Page): Promise<void> {
  await page.waitForTimeout(250);
}

test.describe('WX1 reopen renders', { tag: ['@warix-reopen'] }, () => {
  test('desktop 1440 states', async ({ page, tradeAccount }) => {
    test.setTimeout(300_000);
    mkdirSync(OUT, { recursive: true });
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    const shot = (name: string) => page.screenshot({ path: `${OUT}/${name}.png` });

    await shot('desktop-1440-default');

    // Crosshair over the plot.
    const plot = page.getByRole('group', { name: /^Graphique / });
    const box = await plot.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.42);
      await page.waitForTimeout(600);
      await shot('desktop-1440-crosshair');
    }

    // Cursor modes — real cross/dot/arrow/eraser behaviours.
    await page.getByTestId('chart-tool-select').click();
    await expect(page.getByTestId('chart-cursor-flyout')).toBeVisible();
    await settleLayer(page);
    await shot('desktop-1440-cursor-menu');
    await page.keyboard.press('Escape');

    // Drawing family flyout.
    await page.getByTestId('chart-tool-family-lines').click();
    await expect(page.getByTestId('chart-tool-flyout-lines')).toBeVisible();
    await settleLayer(page);
    await shot('desktop-1440-flyout-lines');
    await page.keyboard.press('Escape');

    await page.getByTestId('chart-tool-family-fibonacci').click();
    await expect(page.getByTestId('chart-tool-flyout-fibonacci')).toBeVisible();
    await settleLayer(page);
    await shot('desktop-1440-flyout-fibonacci');
    await page.keyboard.press('Escape');

    /*
     * `shapes` became four families, and `measure` left the rail.
     *
     * The catalogue was a single "shapes" drawer; it is now `channels`,
     * `brushes`, `annotations` and `markers`, each with its own flyout, and
     * `DrawingToolRail` deliberately filters `measure` out of the analysis
     * families. The evidence this captures is "a family flyout opens and
     * draws", so it captures one of the families that actually exists.
     */
    await page.getByTestId('chart-tool-family-channels').click();
    await expect(page.getByTestId('chart-tool-flyout-channels')).toBeVisible();
    await settleLayer(page);
    await shot('desktop-1440-flyout-channels');
    await page.keyboard.press('Escape');

    // Visibility submenu.
    await page.getByTestId('chart-visibility-trigger').click();
    await expect(page.getByTestId('chart-visibility-flyout')).toBeVisible();
    await settleLayer(page);
    await shot('desktop-1440-visibility');
    await page.keyboard.press('Escape');

    // Indicators library.
    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('chart-indicators-modal')).toBeVisible();
    await settleLayer(page);
    await shot('desktop-1440-indicators');
    await page.getByTestId('chart-indicators-modal').getByTestId('chart-modal-close').click();

    // Settings, one shot per section.
    await page.getByTestId('chart-settings-trigger').click();
    await expect(page.getByTestId('chart-settings-modal')).toBeVisible();
    await settleLayer(page);
    for (const section of ['symbol', 'statusLine', 'scales', 'canvas'] as const) {
      await page.getByTestId(`chart-settings-section-${section}`).click();
      await settleLayer(page);
      await shot(`desktop-1440-settings-${section}`);
    }
    await page.getByTestId('chart-settings-cancel').click();

    // Right-click context menu.
    if (box) {
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45, {
        button: 'right',
      });
      await expect(page.getByTestId('chart-context-menu')).toBeVisible();
      await settleLayer(page);
      await shot('desktop-1440-context-menu');
      await page.keyboard.press('Escape');
    }

    // Object tree.
    await page.getByTestId('chart-object-tree-trigger').click();
    await expect(page.getByTestId('chart-object-tree')).toBeVisible();
    await settleLayer(page);
    await shot('desktop-1440-object-tree');
    await page.getByTestId('chart-object-tree').getByTestId('chart-modal-close').click();
  });

  test('expanded tools draw and persist', async ({ page, tradeAccount }) => {
    test.setTimeout(180_000);
    mkdirSync(OUT, { recursive: true });
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    const plot = page.getByRole('group', { name: /^Graphique / });
    const box = await plot.boundingBox();
    if (!box) throw new Error('Chart plot did not expose a measurable box.');

    const draw = async (
      family: string,
      tool: string,
      points: readonly { x: number; y: number }[],
      expectedCount: number,
    ) => {
      await page.getByTestId(`chart-tool-family-${family}`).click();
      await page.getByTestId(`chart-tool-${tool}`).click();
      await expect(plot).toHaveAttribute('data-chart-tool', tool);
      for (const point of points) {
        await page.mouse.click(box.x + box.width * point.x, box.y + box.height * point.y);
        await page.waitForTimeout(100);
      }
      await expect(plot).toHaveAttribute('data-drawing-count', String(expectedCount));
    };

    // `info_line` sits in Annotations, not Lines — the catalog groups it with
    // the arrow and the marker it is used alongside.
    await draw(
      'annotations',
      'info_line',
      [
        { x: 0.26, y: 0.62 },
        { x: 0.48, y: 0.42 },
      ],
      1,
    );
    await draw(
      'fibonacci',
      'fib_extension',
      [
        { x: 0.36, y: 0.68 },
        { x: 0.54, y: 0.46 },
        { x: 0.62, y: 0.6 },
      ],
      2,
    );
    // `rotated_rectangle` lives in `brushes` since the catalogue split.
    await draw(
      'brushes',
      'rotated_rectangle',
      [
        { x: 0.57, y: 0.7 },
        { x: 0.75, y: 0.58 },
        { x: 0.68, y: 0.42 },
      ],
      3,
    );

    await page.keyboard.press('Escape');
    await page.screenshot({ path: `${OUT}/desktop-1440-expanded-drawings.png` });

    await page.reload();
    await settle(page);
    await expect(page.getByRole('group', { name: /^Graphique / })).toHaveAttribute(
      'data-drawing-count',
      '3',
    );
  });

  test('mobile 390 states', async ({ page, tradeAccount }) => {
    test.setTimeout(300_000);
    mkdirSync(OUT, { recursive: true });
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    const shot = (name: string) => page.screenshot({ path: `${OUT}/${name}.png` });
    await shot('mobile-390-chart-first');

    await page.getByTestId('chart-tools-sheet-trigger').click();
    await expect(page.getByTestId('chart-tools-sheet')).toBeVisible();
    await shot('mobile-390-tools');
    await page.getByTestId('chart-tool-family-cursor').click();
    await page.waitForTimeout(300);
    await shot('mobile-390-tools-cursor');
    await page.keyboard.press('Escape');

    await page.getByTestId('chart-tools-sheet-trigger').click();
    await page.getByTestId('chart-tool-family-lines').click();
    await page.waitForTimeout(300);
    await shot('mobile-390-tools-lines');
    await page.keyboard.press('Escape');

    await page.getByTestId('chart-tools-sheet-trigger').click();
    await page.getByTestId('chart-tool-family-channels').click();
    await page.waitForTimeout(300);
    await shot('mobile-390-tools-channels');
    await page.keyboard.press('Escape');

    await page.getByTestId('chart-tools-sheet-trigger').click();
    await page.getByTestId('chart-indicators-trigger-mobile').click();
    await expect(page.getByTestId('indicator-library')).toBeVisible();
    await shot('mobile-390-indicators');
    await page.keyboard.press('Escape');

    await page.setViewportSize({ width: 320, height: 844 });
    await page.waitForTimeout(1200);
    await shot('mobile-320-sanity');
  });
});
