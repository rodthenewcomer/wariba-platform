import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The VX1-C.1 patch harness — status cleanup, the destination icon family, and
 * the focus treatment.
 *
 * Eleven states, no more (§23). The specimen sheet is composed from the
 * *rendered* rail rather than from the source SVGs, so what a reviewer judges
 * is the glyph as it actually paints at its shipping size, on its shipping
 * surface.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-vx1c1-icons');

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(27, 600);
}

async function hideDevOverlay(page: Page): Promise<void> {
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
}

async function settle(page: Page): Promise<void> {
  await hideDevOverlay(page);
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
}

async function boxOf(locator: Locator): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('expected a rendered box');
  return box;
}

/**
 * Collapse the dock, whatever state it is already in.
 *
 * Activity is *genuinely* an active destination while the dock is expanded on
 * Positions, so every rail frame is taken with it closed — otherwise the idle
 * treatment and the active one are photographed on the same rail and neither is
 * settled. The collapse survives a reload, which is exactly why this reads
 * `aria-expanded` instead of clicking: a second unconditional click reopened
 * the dock and put Activity back in the specimen sheet.
 */
async function collapseDock(page: Page): Promise<void> {
  const toggle = page.getByTestId('workstation-dock-collapse');
  if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await parkPointer(page);
  await page.waitForTimeout(400);
}

/** The rail, photographed as a column: the shot the silhouette test is made on. */
async function railShot(page: Page, file: string): Promise<void> {
  const rail = await boxOf(page.getByTestId('right-utility-rail'));
  await page.screenshot({
    path: resolve(OUT_DIR, file),
    clip: { x: rail.x - 14, y: rail.y, width: rail.width + 16, height: rail.height },
  });
}

test.describe('VX1-C.1 status and icons', { tag: ['@warix-vx1c1'] }, () => {
  test('renders the cleaned status chrome and the destination rail', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(420_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);
    await parkPointer(page);

    // 1 — the full workstation, with no OUVERT and one feed indicator.
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1c1-1440-01-workstation.png') });

    /*
     * The cleanup is asserted, not merely photographed.
     *
     * The three status claims §1/§2 struck out, checked where a reviewer would
     * otherwise have to trust a screenshot: no market-status word or chip in
     * the toolbar, no dot ahead of the programme name in the account pill, and
     * no mint mark on a working instrument row.
     */
    await expect(page.getByTestId('chart-toolbar')).not.toContainText('OUVERT');
    await expect(page.getByTestId('chart-market-status')).toHaveCount(0);
    await expect(page.getByTestId('workstation-account-switcher')).not.toContainText('OUVERT');
    await expect(
      page.getByTestId('workstation-account-switcher').locator('summary span.rounded-full'),
    ).toHaveCount(0);

    // 2 — the header, close enough to count what is left in it.
    await page.screenshot({
      path: resolve(OUT_DIR, 'vx1c1-1440-02-header.png'),
      clip: { x: 0, y: 0, width: 1440, height: 44 },
    });

    /*
     * 3 — the rail at rest.
     *
     * The dock is collapsed first, and stays collapsed for every rail frame
     * below. Activity is *genuinely* active whenever the dock is expanded on
     * Positions, so a shot taken with the workspace in its default state shows
     * two lit destinations and settles nothing about either the idle treatment
     * or the active one. The full workstation above keeps the default.
     */
    await collapseDock(page);
    await railShot(page, 'vx1c1-1440-03-rail-idle.png');

    // 4/5 — the active destination treatment, on two different destinations.
    await page.getByTestId('utility-markets').click();
    await expect(page.getByTestId('utility-drawer-markets')).toBeVisible();
    await parkPointer(page);
    await page.waitForTimeout(400);
    await railShot(page, 'vx1c1-1440-04-rail-markets-active.png');
    // §5 — a working instrument row spends no ink. Asserted inside the open
    // drawer, where five of them are on screen at once.
    await expect(
      page
        .getByTestId('market-navigator')
        .locator(
          'span.rounded-full.bg-\\[color\\:var\\(--wariba-component-workstation-text-financial-positive\\)\\]',
        ),
    ).toHaveCount(0);
    await page.getByTestId('utility-drawer-markets-close').click();

    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    await parkPointer(page);
    await page.waitForTimeout(400);
    await railShot(page, 'vx1c1-1440-05-rail-trade-active.png');
    await page.getByTestId('utility-drawer-trade-close').click();

    // 7 — the healthy feed signal, close enough to read the bars.
    const header = page.getByTestId('workstation-connection');
    await expect(header).toHaveText('');
    const healthy = await boxOf(header);
    await page.screenshot({
      path: resolve(OUT_DIR, 'vx1c1-1440-07-feed-healthy.png'),
      clip: { x: healthy.x - 120, y: 0, width: 260, height: 44 },
    });

    /*
     * 8 — the degraded signal. The link is genuinely taken away: the route
     * closes the socket, the client runs its own ladder, and the header reports
     * what the transport actually is.
     */
    let refusing = true;
    await page.routeWebSocket(/\/ws/, (ws) => {
      if (refusing) {
        ws.close({ code: 1006, reason: 'evidence: transport interrupted' });
        return;
      }
      ws.connectToServer();
    });
    await page.reload();
    await hideDevOverlay(page);
    await expect(header).not.toHaveAttribute('data-connection', 'open', { timeout: 30_000 });
    await page.waitForTimeout(500);
    // §4 — the degraded header is the glyph and its colour, and no words at
    // all: the sentence lives in the tooltip, and the chart carries the one
    // local notice.
    await expect(header).toHaveText('');
    const degraded = await boxOf(header);
    await page.screenshot({
      path: resolve(OUT_DIR, 'vx1c1-1440-08-feed-degraded.png'),
      clip: { x: degraded.x - 120, y: 0, width: 260, height: 44 },
    });
    // And the chart says it once, not twice: exactly one of the plot veil and
    // the history chip is on screen while the transport is down.
    const localNotices = await page
      .getByText(/Reconnexion…|Resynchronisation…|Connexion au flux…/)
      .count();
    expect(localNotices).toBeLessThanOrEqual(1);
    refusing = false;
    await expect(header).toHaveAttribute('data-connection', 'open', { timeout: 60_000 });

    /*
     * 6 — the specimen sheet.
     *
     * Each destination is shot from the live rail at its shipping size, then the
     * frames are composed side by side by the report step. Photographing the
     * rendered component rather than the source SVG is the point: a glyph that
     * only reads well in a design file is not the glyph a trader gets.
     */
    // The reload above restored the dock, so it is collapsed again: an expanded
    // dock lights Activity, and a specimen sheet has to show every glyph in the
    // same state or it compares nothing.
    await collapseDock(page);

    for (const [name, testId] of [
      ['markets', 'utility-markets'],
      ['trade', 'utility-trade'],
      ['activity', 'utility-activity'],
      ['alerts', 'utility-alerts'],
      ['calendar', 'utility-calendar'],
      ['journal', 'utility-notifications'],
      ['help', 'utility-help'],
    ] as const) {
      await page.getByTestId(testId).screenshot({
        path: resolve(OUT_DIR, `specimen-${name}.png`),
      });
    }
  });

  test('renders the cleaned phone header and the focused searches @mobile', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(300_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    // 9 — the phone's own header and single-row toolbar.
    await expect(page.getByTestId('chart-toolbar')).not.toContainText('OUVERT');
    await expect(page.getByTestId('workstation-connection')).toHaveText('');
    await page.screenshot({
      path: resolve(OUT_DIR, 'vx1c1-390-09-header-toolbar.png'),
      clip: { x: 0, y: 0, width: 390, height: 140 },
    });

    /*
     * 10/11 — the focus treatment, on the two searches §19 named.
     *
     * Photographed on a phone on purpose: these wells run the full width of a
     * 390px sheet, which is where a 3px cobalt spread welded to a 1px cobalt
     * border read as a debug ring. The keyboard is what puts focus there, so
     * the harness presses Tab rather than clicking — a click on a touch device
     * would not raise `:focus-visible` at all, and the shot would prove
     * nothing.
     */
    /*
     * The searches live in bottom sheets, so the clip is measured from the
     * *field* rather than from the top of the viewport — a fixed top-of-screen
     * crop photographs the blurred backdrop and proves nothing about the ring.
     */
    const aroundField = async (locator: Locator, file: string): Promise<void> => {
      const field = await boxOf(locator);
      await page.screenshot({
        path: resolve(OUT_DIR, file),
        clip: {
          x: 0,
          y: Math.max(0, field.y - 56),
          width: 390,
          height: Math.min(260, 844 - Math.max(0, field.y - 56)),
        },
      });
    };

    await page.getByTestId('chart-symbol-search-trigger').click();
    await expect(page.getByRole('dialog', { name: 'Marchés' })).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('market-search').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(300);
    await aroundField(page.getByTestId('market-search'), 'vx1c1-390-10-markets-search-focused.png');
    await page.keyboard.press('Escape');

    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('indicator-library')).toBeVisible();
    await page.getByTestId('indicator-search').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(300);
    await aroundField(
      page.getByTestId('indicator-search'),
      'vx1c1-390-11-indicators-search-focused.png',
    );
  });
});
