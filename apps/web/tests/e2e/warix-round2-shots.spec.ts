import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const OUT = resolve(process.cwd(), '../../docs/04-ux/evidence/warix-wx1-round2');

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
  ).toBeVisible();
  await expect(page.getByTestId('chart-bottom-bar')).toBeVisible();
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.waitForTimeout(1500);
}

test.describe('WX1 Round 2 rendered checkpoint', { tag: ['@warix-round2'] }, () => {
  test('desktop rail, legend and complete bottom band', async ({ page, tradeAccount }) => {
    test.setTimeout(180_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await page.goto('/trade');
    await settle(page);

    await page.screenshot({ path: `${OUT}/desktop-1440-full.png` });
    await page
      .getByTestId('chart-tools-trigger')
      .screenshot({ path: `${OUT}/desktop-1440-rail-compact.png` });
    await page
      .getByTestId('chart-status-line')
      .screenshot({ path: `${OUT}/desktop-1440-legend-open.png` });
    await page
      .getByTestId('chart-bottom-bar')
      .screenshot({ path: `${OUT}/desktop-1440-footer-complete.png` });

    await page.getByTestId('chart-symbol-search-trigger').click();
    await expect(page.getByTestId('symbol-search-modal')).toBeVisible();
    await page
      .getByTestId('symbol-search-modal')
      .screenshot({ path: `${OUT}/desktop-1440-symbol-search.png` });
    await page.getByTestId('symbol-search-modal').getByTestId('chart-modal-close').click();

    await page.getByTestId('chart-settings-trigger').click();
    await expect(page.getByTestId('chart-settings-modal')).toBeVisible();
    await page
      .getByTestId('chart-settings-modal')
      .screenshot({ path: `${OUT}/desktop-1440-settings-controls-only.png` });
    await page.getByTestId('chart-settings-cancel').click();

    const collapse = page.getByTestId('chart-legend-collapse');
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await collapse.click();
    await expect(collapse).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('chart-indicator-legend')).toHaveCount(0);
    await expect(page.getByTestId('chart-identity-line')).toContainText('EURUSD');
    await page.screenshot({ path: `${OUT}/desktop-1440-legend-closed.png` });
  });
});
