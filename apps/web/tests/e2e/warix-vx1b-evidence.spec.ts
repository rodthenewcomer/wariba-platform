import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The VX1-B propagation harness.
 *
 * Sixteen states and six clips — the compact set §41-§43 asks for, no evidence
 * matrix. Every state is reached through the product's own controls against a
 * live account, so what is photographed is the workstation a trader would have
 * in front of them, including the numbers.
 *
 * It doubles as the iteration tool: the desktop test alone renders the ten
 * desktop states in about a minute, which is what makes "implement → render →
 * look → correct" affordable between propagation groups.
 */
const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-vx1b-propagation');
const VIDEO_DIR = resolve(OUT_DIR, 'motion');

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

/** The product rail's empty stretch: inert at every layout this harness renders. */
async function parkPointer(page: Page): Promise<void> {
  await page.mouse.move(27, 600);
}

async function settle(page: Page): Promise<void> {
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
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
  await page.waitForTimeout(2_000);
}

/**
 * Leaves the account as it was found: no open positions, no live alerts.
 *
 * Not politeness — a surviving price alert holds a foreign key on the user row,
 * so the fixture's teardown fails and the run reports red over state the trader
 * could clear in two clicks.
 */
async function resetAccount(page: Page): Promise<void> {
  const dock = page.getByTestId('workstation-dock');
  await page.getByTestId('utility-alerts').click();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const remove = dock.getByRole('button', { name: 'Supprimer', exact: true }).first();
    if ((await remove.count()) === 0) break;
    await remove.click();
    await page.waitForTimeout(1_500);
  }
  await page.getByTestId('utility-activity').click();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const close = dock.getByRole('button', { name: /^Fermer EURUSD/ }).first();
    if ((await close.count()) === 0) break;
    await close.click();
    await page.waitForTimeout(2_500);
    if ((await dock.getAttribute('data-empty')) === 'true') break;
  }
}

async function record(
  browser: Browser,
  storageState: string,
  name: string,
  scene: (page: Page) => Promise<void>,
  viewport = { width: 1440, height: 900 },
): Promise<void> {
  const context = await browser.newContext({
    storageState,
    viewport,
    recordVideo: { dir: VIDEO_DIR, size: viewport },
  });
  const page = await context.newPage();
  try {
    await page.goto('/trade');
    await settle(page);
    await scene(page);
  } finally {
    await context.close();
  }
  const written = readdirSync(VIDEO_DIR)
    .filter((file) => file.endsWith('.webm') && !file.startsWith('vx1b-'))
    .map((file) => resolve(VIDEO_DIR, file));
  const latest = written.at(-1);
  if (latest) renameSync(latest, resolve(VIDEO_DIR, `${name}.webm`));
  for (const stray of readdirSync(VIDEO_DIR).filter(
    (file) => file.endsWith('.webm') && !file.startsWith('vx1b-'),
  )) {
    rmSync(resolve(VIDEO_DIR, stray), { force: true });
  }
}

/** Opens a bracketed long, the state most of the desktop evidence is judged on. */
async function openBracketedPosition(page: Page): Promise<void> {
  await page.getByTestId('utility-trade').click();
  await expect(page.getByTestId('execution-center')).toBeVisible();
  const bid = Number(await page.getByTestId('execution-bid').textContent());
  expect(Number.isFinite(bid)).toBe(true);
  await page.getByTestId('stop-loss-input').fill((bid - 0.0016).toFixed(5));
  await page.getByTestId('take-profit-input').fill((bid + 0.002).toFixed(5));
  await page.getByTestId('execution-submit-buy').click();
  await expect(page.getByTestId('workstation-dock')).toHaveAttribute('data-empty', 'false', {
    timeout: 30_000,
  });
}

test.describe('VX1-B propagation', { tag: ['@warix-vx1b'] }, () => {
  test('renders the propagated desktop workstation at 1440', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(VIDEO_DIR, { recursive: true });

    const shot = async (name: string): Promise<void> => {
      await parkPointer(page);
      await page.waitForTimeout(400);
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settle(page);

    // 1 — the default workstation.
    await shot('vx1b-1440-01-default');

    // 10 — a tool family flyout, on the propagated rail.
    const family = page.getByTestId('chart-tool-family-lines');
    await family.hover();
    await expect(page.getByTestId('chart-tool-flyout-lines')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1b-1440-10-tool-flyout.png') });
    await page.keyboard.press('Escape');

    // 9 — symbol search.
    await page.getByTestId('chart-symbol-search-trigger').click();
    await expect(page.getByTestId('symbol-search-modal')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1b-1440-09-symbol-search.png') });
    await page.keyboard.press('Escape');

    // 7 — indicators.
    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('indicator-library')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1b-1440-07-indicators.png') });
    await page.keyboard.press('Escape');

    // 8 — preferences.
    await page.getByTestId('chart-settings-trigger').click();
    await expect(page.getByTestId('chart-settings-modal')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(OUT_DIR, 'vx1b-1440-08-preferences.png') });
    await page.keyboard.press('Escape');

    // 4 — Markets drawer.
    await page.getByTestId('utility-markets').click();
    await expect(page.getByTestId('utility-drawer-markets')).toBeVisible();
    await page.waitForTimeout(600);
    await shot('vx1b-1440-04-markets-drawer');
    await page.getByTestId('utility-drawer-markets-close').click();

    // 3 — Trade drawer, with a fully exercised ticket.
    await openBracketedPosition(page);
    await shot('vx1b-1440-03-trade-drawer');
    await page.getByTestId('utility-drawer-trade-close').click();

    // 2 — the live trade on the chart.
    await expect(page.getByTestId('chart-position-chip')).toBeVisible();
    await shot('vx1b-1440-02-active-position');

    // 5 — Activity, expanded on Positions.
    await page.getByTestId('utility-activity').click();
    await expect(page.getByRole('tab', { name: /Positions/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await shot('vx1b-1440-05-activity-positions');

    // 6 — Alerts, expanded and selected, with a real alert on the account.
    await page.getByTestId('chart-alerts-trigger').click();
    const alertsDialog = page.getByRole('dialog', { name: 'Notifications' });
    await expect(alertsDialog).toBeVisible();
    await alertsDialog.getByLabel('Prix seuil').fill('1.20000');
    await alertsDialog.getByRole('button', { name: 'Créer l’alerte' }).click();
    await page.waitForTimeout(1_200);
    await page.keyboard.press('Escape');
    await page.getByTestId('utility-alerts').click();
    await expect(page.getByRole('tab', { name: /Alerts/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await shot('vx1b-1440-06-alerts');

    /*
     * §43 A–E — the desktop motion, recorded in its own contexts so each clip is
     * the interaction rather than the session around it.
     */
    const storageState = test.info().outputPath('vx1b-storage-state.json');
    await page.context().storageState({ path: storageState });
    const browser = page.context().browser();
    if (browser) {
      await record(browser, storageState, 'vx1b-motion-a-toolbar-timeframe', async (scene) => {
        for (const interval of ['3m', '5m', '15m', '1m']) {
          await scene.getByRole('radio', { name: interval, exact: true }).click();
          await scene.waitForTimeout(1_100);
        }
        await scene.getByTestId('chart-type-trigger').click();
        await scene.waitForTimeout(1_200);
        await scene.keyboard.press('Escape');
      });

      await record(browser, storageState, 'vx1b-motion-b-utility-drawer', async (scene) => {
        await scene.getByTestId('utility-markets').click();
        await scene.waitForTimeout(1_600);
        await scene.getByTestId('utility-drawer-markets-close').click();
        await scene.waitForTimeout(900);
        await scene.getByTestId('utility-help').click();
        await scene.waitForTimeout(1_500);
        await scene.getByTestId('utility-drawer-help-close').click();
        await scene.waitForTimeout(900);
      });

      await record(browser, storageState, 'vx1b-motion-c-execution', async (scene) => {
        await scene.getByTestId('utility-trade').click();
        await expect(scene.getByTestId('execution-center')).toBeVisible();
        await scene.waitForTimeout(700);
        await scene.getByRole('radio', { name: 'Limit', exact: true }).click();
        await scene.waitForTimeout(900);
        await scene.getByRole('radio', { name: 'Stop', exact: true }).click();
        await scene.waitForTimeout(900);
        await scene.getByRole('radio', { name: 'Market', exact: true }).click();
        await scene.waitForTimeout(700);
        await scene.getByTestId('quantity-increment').click();
        await scene.waitForTimeout(500);
        await scene.getByTestId('quantity-increment').click();
        await scene.waitForTimeout(1_400);
      });

      await record(browser, storageState, 'vx1b-motion-d-activity-dock', async (scene) => {
        await scene.getByTestId('utility-activity').click();
        await scene.waitForTimeout(900);
        for (const tab of ['Orders', 'Trades', 'Alerts', 'Positions']) {
          await scene.getByRole('tab', { name: new RegExp(tab) }).click();
          await scene.waitForTimeout(1_000);
        }
      });

      await record(browser, storageState, 'vx1b-motion-e-markets-quotes', async (scene) => {
        await scene.getByTestId('utility-markets').click();
        await expect(scene.getByTestId('utility-drawer-markets')).toBeVisible();
        await scene.waitForTimeout(6_500);
      });
    }

    await resetAccount(page);
  });

  test('renders the propagated phone workstation @mobile', async ({ page, tradeAccount }) => {
    test.setTimeout(600_000);
    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(VIDEO_DIR, { recursive: true });

    const shot = async (name: string): Promise<void> => {
      await page.waitForTimeout(400);
      await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`), fullPage: false });
    };

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);

    // 11 — the default phone chart.
    await shot('vx1b-390-11-default');

    // 13 — Indicators sheet.
    await page.getByTestId('chart-indicators-trigger').click();
    await expect(page.getByTestId('indicator-library')).toBeVisible();
    await shot('vx1b-390-13-indicators');
    await page.keyboard.press('Escape');

    // 15 — the markets surface a phone reaches through the instrument chip.
    await page.getByTestId('chart-symbol-search-trigger').click();
    await expect(page.getByRole('dialog', { name: 'Marchés' })).toBeVisible({ timeout: 15_000 });
    await shot('vx1b-390-15-markets');
    await page.keyboard.press('Escape');

    // 14 — the execution sheet.
    await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
    await expect(page.getByTestId('execution-center')).toBeVisible();
    const bid = Number(await page.getByTestId('execution-bid').textContent());
    await page.getByTestId('stop-loss-input').fill((bid - 0.0016).toFixed(5));
    await page.getByTestId('take-profit-input').fill((bid + 0.002).toFixed(5));
    await shot('vx1b-390-14-trade');

    // 12 — the live trade, in the compact chip presentation.
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1_500);
    await shot('vx1b-390-12-active-trade');

    // 16 — the compact toolbar at the minimum supported width.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.waitForTimeout(1_500);
    await shot('vx1b-320-16-toolbar');
    await page.setViewportSize({ width: 390, height: 844 });

    // §43 F — a phone sheet, opening and closing.
    const storageState = test.info().outputPath('vx1b-mobile-storage-state.json');
    await page.context().storageState({ path: storageState });
    const browser = page.context().browser();
    if (browser) {
      await record(
        browser,
        storageState,
        'vx1b-motion-f-mobile-sheet',
        async (scene) => {
          await scene.getByTestId('chart-indicators-trigger').click();
          await scene.waitForTimeout(1_800);
          await scene.keyboard.press('Escape');
          await scene.waitForTimeout(900);
          await scene.getByRole('button', { name: /^Trader EURUSD$/ }).click();
          await scene.waitForTimeout(2_000);
          await scene.keyboard.press('Escape');
          await scene.waitForTimeout(900);
        },
        { width: 390, height: 844 },
      );
    }

    // Same cleanup contract: the phone dock's card action is named "Fermer".
    await page.getByTestId('mobile-dock-trigger').click();
    const sheet = page.getByRole('dialog', { name: 'Activité de trading' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Fermer', exact: true }).first().click();
    await page.waitForTimeout(3_000);
  });
});
