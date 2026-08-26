import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Fresh, tightly cropped product captures for the Help Center.
 *
 * These are deliberately regenerated from the current runtime instead of
 * copying milestone evidence: the Help asset must document the product a
 * trader sees now. Screenshots contain only fixture data and are exported as
 * source PNGs; the public WebP conversion happens after visual review.
 */
const OUT = resolve(process.cwd(), '../../docs/04-ux/evidence/wariba-help-visual-system/product');

async function signIn(page: Page, email: string, password: string) {
  // Go straight to the surface this fixture exists to capture. Loading the
  // unrelated Hub first performs its full command-centre read before the
  // browser immediately leaves it again.
  await page.goto('/login?next=/trade');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => url.pathname === '/trade', { timeout: 120_000 });
}

async function settle(page: Page) {
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
  await page.waitForTimeout(700);
}

async function shoot(locator: Locator, name: string) {
  await locator.screenshot({ path: resolve(OUT, `${name}.png`), animations: 'disabled' });
}

async function quote(page: Page) {
  const bid = Number((await page.getByTestId('execution-bid').textContent())?.match(/[\d.]+/)?.[0]);
  const ask = Number((await page.getByTestId('execution-ask').textContent())?.match(/[\d.]+/)?.[0]);
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) throw new Error('No live fixture quote');
  return { bid, ask };
}

test.describe('@help-visual-evidence current WariX product captures', () => {
  test('captures order, SL/TP, partial close and risk at desktop and mobile', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(360_000);
    mkdirSync(OUT, { recursive: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await settle(page);

    // HLP-SCR-001 — current order ticket with all real fields visible.
    await page.getByTestId('utility-trade').click();
    const execution = page.getByTestId('execution-center');
    await expect(execution).toBeVisible();
    await expect(page.getByTestId('quantity-bounds')).toBeVisible({ timeout: 30_000 });
    await shoot(execution, 'HLP-SCR-001-warix-order-ticket-desktop');

    // Open a real fixture position with valid, server-submitted protections.
    const { ask } = await quote(page);
    await page.getByTestId('stop-loss-input').fill((ask - 0.004).toFixed(5));
    await page.getByTestId('take-profit-input').fill((ask + 0.004).toFixed(5));
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('utility-drawer-trade-close').click();
    await page.waitForTimeout(900);

    // HLP-SCR-004 — expand the product's real risk control. The bare ribbon is
    // only 44 px high; its native sheet preserves the same server-authored
    // values while making the daily limit, maximum limit and reset readable in
    // a Help article.
    const riskTrigger = page.getByRole('button', { name: 'Détail des règles de risque' });
    await expect(riskTrigger).toBeVisible({ timeout: 30_000 });
    await riskTrigger.click();
    const riskDetail = page.getByRole('dialog', { name: 'Détail du risque' });
    await expect(riskDetail).toBeVisible();
    await shoot(riskDetail, 'HLP-SCR-004-warix-risk-desktop');
    await page.keyboard.press('Escape');

    // HLP-SCR-002 — only the current chart workspace, no stale outer chrome.
    await expect(page.getByTestId('chart-level-chip-stop_loss')).toBeVisible();
    await expect(page.getByTestId('chart-level-chip-take_profit')).toBeVisible();
    await shoot(page.getByTestId('chart-track'), 'HLP-SCR-002-warix-sl-tp-desktop');

    // HLP-SCR-003 — the real 50% preview, not a rebuilt form.
    await page.getByRole('tab', { name: 'Positions' }).click();
    await page
      .getByRole('button', { name: /Clôture partielle — EURUSD/ })
      .first()
      .click();
    const partial = page.getByRole('dialog', { name: /Clôture partielle/ });
    await partial.getByRole('button', { name: '50%' }).click();
    await expect(partial.getByText(/Clôturer 0\.05 sur 0\.10 lot/)).toBeVisible();
    await shoot(partial, 'HLP-SCR-003-warix-partial-close-desktop');
    await page.keyboard.press('Escape');

    // The same live account at the product's phone layout.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/trade');
    await settle(page);
    await expect(riskTrigger).toBeVisible({ timeout: 30_000 });
    await riskTrigger.click();
    await expect(riskDetail).toBeVisible();
    await shoot(riskDetail, 'HLP-SCR-004-warix-risk-mobile');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
    await expect(execution).toBeVisible();
    await shoot(execution, 'HLP-SCR-001-warix-order-ticket-mobile');
    await page.keyboard.press('Escape');

    await shoot(page.getByTestId('chart-track'), 'HLP-SCR-002-warix-sl-tp-mobile');
  });

  test('captures the real partial-close preview at the phone layout', async ({
    page,
    tradeAccount,
  }) => {
    test.setTimeout(240_000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, tradeAccount.email, tradeAccount.password);
    await settle(page);

    await page.getByRole('button', { name: /^Trader EURUSD$/ }).click();
    await page.getByTestId('execution-submit-buy').click();
    await expect(page.getByTestId('chart-position-chip')).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press('Escape');

    await page.getByTestId('mobile-dock-trigger').click();
    await page.getByRole('tab', { name: 'Positions' }).click();
    await page.getByRole('button', { name: 'Clôture %', exact: true }).click();
    const partial = page.getByRole('dialog', { name: /Clôture partielle/ });
    await partial.getByRole('button', { name: '50%' }).click();
    await expect(partial.getByText(/Clôturer 0\.05 sur 0\.10 lot/)).toBeVisible();
    await shoot(partial, 'HLP-SCR-003-warix-partial-close-mobile');
  });
});
