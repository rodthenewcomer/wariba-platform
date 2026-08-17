import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The WX1 final-closure render harness.
 *
 * Eleven compositions, and nothing else. This is not the WX1 evidence spec —
 * that one captures thirty-odd states, measures geometry and runs Axe, which is
 * the wrong instrument for "change one control, look at it, change it again".
 * Every state here is one the human reviewer named; the assertions exist only to
 * prove the state was actually reached before the shutter fired, because a
 * screenshot of the wrong state is worse than no screenshot.
 *
 * Written into the evidence bundle rather than `test-results`: Playwright clears
 * its output directory at the start of each run, and the desktop and mobile
 * projects run separately.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-wx1-final-closure');

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

/** A loaded chart, a live connection and enough observed history to be a chart. */
async function settle(page: Page): Promise<void> {
  // The Next.js dev overlay badge floats over the bottom-left corner of every
  // dev render — over the dock's first tab and its first row. It is tooling, not
  // product, and it must not appear in evidence a human is asked to accept.
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
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
}

test.describe('WX1 final closure', { tag: ['@warix-final-closure'] }, () => {
  test('renders the desktop closure states at 1440', async ({ page, tradeAccount }) => {
    test.setTimeout(300_000);
    mkdirSync(OUT_DIR, { recursive: true });

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    // 1 — the default composition. The state word is the §4 acceptance.
    await expect(page.getByTestId('chart-market-status')).toContainText('Ouvert');
    await shot('wx1-final-1440-default');

    /*
     * 2/3 — the family disclosure, opened and then hovered. A *family* key, never
     * a single-action one: the chevron's whole contract is that it appears on
     * exactly the keys that lead somewhere.
     *
     * Captured in that order on purpose. Resting on a family key opens its
     * flyout after 260ms, so "hovered but not yet open" is a 100ms window a
     * screenshot cannot be aimed at reliably. Clicking the key while its flyout
     * is open closes it again and leaves the pointer exactly where it was — a
     * stable hover state with no flyout, which is the composition §6 is judged
     * on.
     */
    const family = page.getByTestId('chart-tool-family-lines');
    const flyout = page.getByTestId('chart-tool-flyout-lines');
    await family.hover();
    await expect(flyout).toBeVisible();
    await page.waitForTimeout(300);
    await shot('wx1-final-1440-left-family-open');

    await family.click();
    await expect(flyout).toBeHidden();
    await page.waitForTimeout(300);
    await shot('wx1-final-1440-left-family-hover');

    /*
     * The same hover state, cropped to the rail. A 32px control inside a
     * 1440×900 frame is not evidence a human can judge a 12px glyph from, and
     * the reviewer asked for the chevron itself — so the clip is taken here,
     * from the live composition, rather than reconstructed afterwards.
     */
    const railBox = await family.boundingBox();
    if (railBox) {
      await page.screenshot({
        path: resolve(OUT_DIR, 'wx1-final-1440-left-family-hover-detail.png'),
        clip: {
          x: railBox.x - 10,
          y: railBox.y - 22,
          width: railBox.width + 30,
          height: railBox.height + 44,
        },
      });
    }

    // 6 — the Trade drawer, with the close affordance it is judged on. The
    // pointer parks over the plot first: a rail tooltip left hanging over the
    // drawer would be reviewing our own hover state, not the drawer.
    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    await expect(page.getByTestId('utility-drawer-trade-close')).toBeVisible();
    await page.mouse.move(700, 20);
    await page.waitForTimeout(400);
    await shot('wx1-final-1440-trade');

    /*
     * An expanded dock has to have something in it to be visibly expanded: the
     * desktop dock hides its body when it is empty, so a shot taken against an
     * untouched account would prove nothing. One market order and one alert are
     * the smallest real content that makes both dock states legible.
     */
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('workstation-dock')).toHaveAttribute('data-empty', 'false', {
      timeout: 30_000,
    });
    await page.getByTestId('utility-drawer-trade-close').click();
    await expect(page.getByTestId('execution-center')).toBeHidden();

    // 4 — Activity expands the canonical bottom dock, on the Positions surface.
    await page.getByTestId('utility-activity').click();
    await expect(page.getByRole('tab', { name: /Positions/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.mouse.move(700, 20);
    await page.waitForTimeout(600);
    await shot('wx1-final-1440-activity-expanded');

    // 5 — Alerts expands the same dock and selects the Alerts surface. The alert
    // itself is created through the canonical alert surface, not fabricated.
    await page.getByTestId('chart-alerts-trigger').click();
    const alertsDialog = page.getByRole('dialog', { name: 'Notifications' });
    await expect(alertsDialog).toBeVisible();
    // Well above any sandbox EURUSD print, so the alert stays pending rather
    // than firing and closing itself between here and the screenshot.
    await alertsDialog.getByLabel('Prix seuil').fill('1.20000');
    await alertsDialog.getByRole('button', { name: 'Créer l’alerte' }).click();
    await page.waitForTimeout(1_500);
    await page.keyboard.press('Escape');

    await page.getByTestId('utility-alerts').click();
    await expect(page.getByRole('tab', { name: /Alerts/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.mouse.move(700, 20);
    await page.waitForTimeout(600);
    await shot('wx1-final-1440-alerts-expanded');

    // 7/8 — the legend's own collapse, proven by the two states rather than by
    // the presence of a caret.
    const legendCollapse = page.getByTestId('chart-legend-collapse');
    await expect(legendCollapse).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('chart-indicator-legend')).toBeVisible();
    await shot('wx1-final-1440-legend-expanded');

    await legendCollapse.click();
    await expect(legendCollapse).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('chart-indicator-legend')).toBeHidden();
    await shot('wx1-final-1440-legend-collapsed');
    await legendCollapse.click();

    /*
     * The two rows this run created are removed through the product's own
     * controls before the fixture tears the account down. Not politeness: a
     * surviving price alert holds a foreign key on the user row, so the fixture's
     * delete fails and the run reports red over a state the trader could clear
     * in two clicks.
     */
    const dock = page.getByTestId('workstation-dock');
    await dock.getByRole('button', { name: 'Supprimer', exact: true }).first().click();
    await expect(page.getByRole('tab', { name: /Alerts/ })).not.toContainText('1');
    await page.getByRole('tab', { name: /Positions/ }).click();
    await dock
      .getByRole('button', { name: /^Fermer EURUSD/ })
      .first()
      .click();
    await expect(page.getByTestId('workstation-dock')).toHaveAttribute('data-empty', 'true', {
      timeout: 30_000,
    });
  });

  test('renders the phone closure states @mobile', async ({ page, tradeAccount }) => {
    test.setTimeout(300_000);
    mkdirSync(OUT_DIR, { recursive: true });

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    await signIn(page, tradeAccount.email, tradeAccount.password);

    // 9 — 390: instrument, market state, intervals, chart type, ƒx and tools,
    // on one row.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);
    await expect(page.getByTestId('chart-market-status')).toContainText('Ouvert');
    await shot('wx1-final-390-toolbar');

    // 11 — the Indicators sheet: the approved catalogue, no explanation, and a
    // height taken from the content rather than from the viewport.
    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('indicator-library')).toBeVisible();
    await page.waitForTimeout(500);
    await shot('wx1-final-390-indicators');
    await page.keyboard.press('Escape');

    // 10 — 320: the intentional interval overflow, and no horizontal document
    // scroll anywhere on the page.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/trade');
    await settle(page);
    await expect(page.getByTestId('chart-timeframe-overflow')).toBeVisible();
    const overflowsSideways = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflowsSideways).toBe(false);
    await shot('wx1-final-320-toolbar');
  });
});
