import { readFileSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { evaluateAndApplyAccountRisk } from '@wariba/database';
import {
  attachFixtureAccountToUser,
  createFixtureAccount,
  createFixtureDb,
  deleteFixtureAccount,
  type E2eFixtureAccount,
} from './fixtures';
import { FIXTURE_FILE, STORAGE_STATE_FILE } from './global-setup';

test.use({ storageState: STORAGE_STATE_FILE });

function loadPrimaryFixture(): E2eFixtureAccount {
  return JSON.parse(readFileSync(FIXTURE_FILE, 'utf-8')) as E2eFixtureAccount;
}

test.describe('Trader Hub', () => {
  test('shows account state, mission, and risk within a few seconds of loading', async ({ page }) => {
    const start = Date.now();
    await page.goto('/hub');
    await expect(page.getByText('Actif').first()).toBeVisible();
    expect(Date.now() - start).toBeLessThan(10000);

    await expect(page.getByText(/objectif de profit/i).first()).toBeVisible();
    await expect(page.getByText(/DLL restante/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ouvrir WariX' })).toBeVisible();

    await page.screenshot({ path: 'test-results/visual/hub-active-1440.png', fullPage: true });

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );
    expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
  });

  test('mobile viewport (390px) renders the bottom navigation with no horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/hub');
    await expect(page.getByRole('link', { name: 'Hub' })).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
    await page.screenshot({ path: 'test-results/visual/hub-active-390.png', fullPage: true });
  });

  test('320px viewport (minimum supported width) has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/hub');
    await expect(page.getByRole('link', { name: 'Hub' })).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(320);
    await page.screenshot({ path: 'test-results/visual/hub-active-320.png', fullPage: true });
  });

  test.describe('a second, soft-locked account under the same user', () => {
    let secondary: E2eFixtureAccount;

    test.beforeAll(async () => {
      const primary = loadPrimaryFixture();
      const db = createFixtureDb();
      secondary = await createFixtureAccount(db, 'secondary');
      await attachFixtureAccountToUser(db, secondary, primary.userId);
      // 5K nominal, 3% DLL rate -> floor budget is 150 USD; -160 crosses it.
      await db
        .insertInto('app.trading_ledger_entries')
        .values({ account_id: secondary.accountId, entry_type: 'realized_pnl', amount: '-160.00' })
        .execute();
      await evaluateAndApplyAccountRisk(db, {
        accountId: secondary.accountId,
        now: new Date(),
        marketBySymbol: {},
        triggerEventType: 'manual_review',
      });
      await db.destroy();
    });

    test.afterAll(async () => {
      const db = createFixtureDb();
      await deleteFixtureAccount(db, secondary);
      await db.destroy();
    });

    test('multi-account isolation: switching accounts never mixes up state or risk', async ({
      page,
    }) => {
      await page.goto('/hub');
      const selector = page.getByRole('navigation', { name: 'Changer de compte' });
      await expect(selector.getByRole('link')).toHaveCount(2);

      await selector.getByText('Blocage temporaire').click();
      await expect(page).toHaveURL(new RegExp(`account=${secondary.accountId}`));
      await expect(page.getByText('Blocage temporaire').first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ouvrir WariX' })).toHaveCount(0);
      await page.screenshot({ path: 'test-results/visual/hub-soft-locked-1440.png', fullPage: true });
    });
  });
});
