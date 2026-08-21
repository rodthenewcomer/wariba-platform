import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser, Page } from '@playwright/test';
import { expect, test } from './fixtures';

const OUT_DIR = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-vx1-right-rail');
const BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

async function settleTrade(page: Page): Promise<void> {
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
  await page.waitForTimeout(500);
}

async function collapseDock(page: Page): Promise<void> {
  const toggle = page.getByTestId('workstation-dock-collapse');
  if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
}

async function capture(page: Page, file: string, parkPointer = true): Promise<void> {
  if (parkPointer) await page.mouse.move(24, 500);
  await page.waitForTimeout(260);
  await page.screenshot({ path: resolve(OUT_DIR, file), animations: 'allow' });
}

async function recordMotion(
  browser: Browser,
  account: { email: string; password: string },
): Promise<void> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT_DIR, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const video = page.video();
  if (!video) throw new Error('motion evidence recorder unavailable');

  await signIn(page, account.email, account.password);
  await page.goto('/trade');
  await settleTrade(page);
  await collapseDock(page);

  for (const destination of ['markets', 'trade'] as const) {
    await page.getByTestId(`utility-${destination}`).hover();
    await page.waitForTimeout(500);
    await page.getByTestId(`utility-${destination}`).click();
    await expect(page.getByTestId(`utility-drawer-${destination}`)).toBeVisible();
    await page.waitForTimeout(850);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  }

  await page.getByTestId('utility-activity').hover();
  await page.waitForTimeout(450);
  await page.getByTestId('utility-activity').click();
  await page.waitForTimeout(850);

  await page.getByTestId('utility-alerts').hover();
  await page.waitForTimeout(450);
  await page.getByTestId('utility-alerts').click();
  await page.waitForTimeout(850);

  await page.getByTestId('utility-calendar').hover();
  await page.waitForTimeout(450);
  await page.getByTestId('utility-calendar').click();
  await expect(page.getByTestId('utility-drawer-calendar')).toBeVisible();
  await page.waitForTimeout(850);

  await page.getByTestId('utility-journal').hover();
  await page.waitForTimeout(450);
  await page.getByTestId('utility-journal').click();
  await page.waitForTimeout(850);

  await page.getByTestId('utility-help').hover();
  await page.waitForTimeout(650);
  await page.getByTestId('utility-help').click();
  await expect(page.getByTestId('utility-drawer-help')).toBeVisible();
  await page.waitForTimeout(1_000);

  await page.close();
  await video.saveAs(resolve(OUT_DIR, 'RIGHT_RAIL_SYMBOL_MOTION.webm'));
  await context.close();
}

test.describe('VX1 right rail symbol evidence', { tag: ['@warix-vx1-symbols'] }, () => {
  test('captures the seven desktop states and the two specimen scales', async ({
    browser,
    page,
    tradeAccount,
  }) => {
    test.setTimeout(420_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/trade');
    await settleTrade(page);
    await collapseDock(page);

    const rail = page.getByTestId('right-utility-rail');
    await expect(rail.locator('button')).toHaveCount(7);
    await capture(page, '03-1440-right-rail-idle.png');

    await page.getByTestId('utility-markets').click();
    await expect(page.getByTestId('utility-drawer-markets')).toBeVisible();
    await expect(page.getByTestId('utility-markets')).toHaveAttribute('aria-pressed', 'true');
    await capture(page, '04-1440-markets-active-drawer.png');
    await page.keyboard.press('Escape');

    await page.getByTestId('utility-trade').click();
    await expect(page.getByTestId('utility-drawer-trade')).toBeVisible();
    await expect(page.getByTestId('utility-trade')).toHaveAttribute('aria-pressed', 'true');
    await capture(page, '05-1440-trade-active-drawer.png');
    await page.keyboard.press('Escape');

    await page.getByTestId('utility-activity').click();
    await expect(page.getByRole('tab', { name: /Positions/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('utility-activity')).toHaveAttribute('aria-pressed', 'true');
    await capture(page, '06-1440-activity-active.png');

    await page.getByTestId('utility-alerts').click();
    await expect(page.getByRole('tab', { name: /Alerts/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('utility-alerts')).toHaveAttribute('aria-pressed', 'true');
    await capture(page, '07-1440-alerts-active.png');

    await page.getByTestId('utility-calendar').click();
    await expect(page.getByTestId('utility-drawer-calendar')).toBeVisible();
    await expect(page.getByTestId('utility-calendar')).toHaveAttribute('aria-pressed', 'true');
    await capture(page, '08-1440-calendar-active.png');

    await page.getByTestId('utility-journal').click();
    await expect(page.getByRole('tab', { name: 'Trades' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('utility-journal')).toHaveAttribute('aria-pressed', 'true');
    await capture(page, '09-1440-journal-active.png');

    await collapseDock(page);
    await page.getByTestId('utility-help').hover();
    await capture(page, '10-1440-help-hover.png', false);

    await page.getByTestId('utility-markets').focus();
    await expect(page.getByTestId('utility-markets')).toBeFocused();
    const symbolsContained = await rail.locator('button').evaluateAll((buttons) =>
      buttons.every((button) => {
        const symbol = button.querySelector('svg');
        if (!symbol) return false;
        const keyBox = button.getBoundingClientRect();
        const symbolBox = symbol.getBoundingClientRect();
        return (
          symbolBox.left >= keyBox.left &&
          symbolBox.right <= keyBox.right &&
          symbolBox.top >= keyBox.top &&
          symbolBox.bottom <= keyBox.bottom
        );
      }),
    );
    expect(symbolsContained).toBe(true);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reducedTransition = await page
      .getByTestId('utility-markets')
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
    expect(reducedTransition).toBeLessThanOrEqual(0.001);

    await page.goto('/catalog');
    await expect(page.getByTestId('warix-symbol-specimen')).toBeVisible();
    await page.getByTestId('warix-symbol-family-native').screenshot({
      path: resolve(OUT_DIR, '11-symbol-specimen-native.png'),
    });
    await page.getByTestId('warix-symbol-family-4x').screenshot({
      path: resolve(OUT_DIR, '12-symbol-specimen-4x.png'),
    });

    await recordMotion(browser, tradeAccount);
  });

  test('reuses the destination language on the canonical 390 mobile chrome @mobile', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(300_000);
    mkdirSync(OUT_DIR, { recursive: true });

    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settleTrade(page);

    const actionRail = page.getByTestId('mobile-action-rail');
    await expect(actionRail.locator('[data-warix-symbol="trade"]')).toHaveCount(1);
    await expect(actionRail.locator('[data-warix-symbol="activity"]')).toHaveCount(1);
    await expect(actionRail.locator('[data-warix-symbol="calendar"]')).toHaveCount(1);
    await expect(actionRail.locator('[data-warix-symbol="help"]')).toHaveCount(1);
    const searchTrigger = page.getByTestId('chart-symbol-search-trigger');
    await expect(searchTrigger.locator('[data-warix-action="search"]')).toHaveCount(1);
    await expect(searchTrigger.locator('[data-warix-symbol="markets"]')).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page.screenshot({ path: resolve(OUT_DIR, '13-390-mobile-symbol-reuse.png') });
  });
});
