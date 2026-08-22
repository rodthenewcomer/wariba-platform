import { readFileSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { evaluateAndApplyAccountRisk } from '@wariba/test-utils';
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

test.describe('Trader Hub', { tag: ['@auth'] }, () => {
  test(
    'shows account state, mission, and risk within a few seconds of loading',
    { tag: ['@smoke', '@critical'] },
    async ({ page }) => {
      const start = Date.now();
      await page.goto('/hub');
      await expect(page.getByText('Actif').first()).toBeVisible();
      expect(Date.now() - start).toBeLessThan(10000);

      await expect(page.getByText(/objectif de profit/i).first()).toBeVisible();
      await expect(page.getByText(/DLL restante/)).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ouvrir WariX' })).toBeVisible();

      await expect(page.getByText(/Activé le/)).toBeVisible();
      await expect(page.getByText(/Répartition après passage/)).toBeVisible();
      await expect(page.getByText('Positions ouvertes')).toBeVisible();
      await expect(page.getByText('Aucune position ouverte.')).toBeVisible();

      /*
       * The account evolution is a chart only when the read model says the
       * series is worth drawing (Product OS 1.1 §4). This used to assert a
       * canvas unconditionally, which is what kept a 220px auto-scaled flat
       * line — axis reading 9 999,95 / 10 000,00 / 10 000,05 — on the
       * dashboard of an account that had never traded.
       *
       * What is asserted now is the rule rather than one of its outcomes:
       * exactly one of chart / stated-absence renders, never both, never
       * neither, and a chart that does render has genuinely painted.
       */
      const drawn = await page.getByTestId('account-evolution').count();
      const stated = await page.getByTestId('account-evolution-empty').count();
      expect(drawn + stated).toBe(1);

      if (drawn === 1) {
        const chartCanvas = page.locator('canvas').first();
        await expect(chartCanvas).toBeVisible();
        const canvasBox = await chartCanvas.boundingBox();
        expect(canvasBox?.width).toBeGreaterThan(0);
      } else {
        await expect(page.getByTestId('account-evolution-empty')).toContainText(
          /Aucune session terminée pour le moment\.|Pas encore assez d’historique/,
        );
      }

      await page.screenshot({ path: 'test-results/visual/hub-active-1440.png', fullPage: true });

      const results = await new AxeBuilder({ page }).analyze();
      const critical = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious',
      );
      expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
    },
  );

  test(
    'mobile viewport (390px) renders the bottom navigation with no horizontal overflow',
    { tag: ['@mobile'] },
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/hub');
      await expect(page.getByRole('link', { name: 'Hub' })).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(390);
      await page.screenshot({ path: 'test-results/visual/hub-active-390.png', fullPage: true });
    },
  );

  test(
    '320px viewport (minimum supported width) has no horizontal overflow',
    { tag: ['@mobile'] },
    async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto('/hub');
      await expect(page.getByRole('link', { name: 'Hub' })).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(320);
      await page.screenshot({ path: 'test-results/visual/hub-active-320.png', fullPage: true });
    },
  );

  test.describe('a second account with one open position', () => {
    let secondary: E2eFixtureAccount;

    test.beforeAll(async () => {
      const primary = loadPrimaryFixture();
      const db = createFixtureDb();
      secondary = await createFixtureAccount(db, 'position');
      await attachFixtureAccountToUser(db, secondary, primary.userId);
      await db
        .insertInto('app.positions')
        .values({
          account_id: secondary.accountId,
          symbol: 'EURUSD',
          side: 'buy',
          opening_quantity: '0.10',
          open_quantity: '0.10',
          average_open_price: '1.08450',
          account_sequence: '1',
        })
        .execute();
      await db.destroy();
    });

    test.afterAll(async () => {
      const db = createFixtureDb();
      await deleteFixtureAccount(db, secondary);
      await db.destroy();
    });

    test('open position renders with symbol, side, and size — never a live PnL column', async ({
      page,
    }) => {
      await page.goto(`/hub?account=${secondary.accountId}`);
      await expect(page.getByText('EURUSD · Achat')).toBeVisible();
      await expect(page.getByText(/Aucune position ouverte\./)).toHaveCount(0);

      const positionsCard = page.locator('h2', { hasText: 'Positions ouvertes' }).locator('..');
      await expect(positionsCard.getByText(/pnl/i)).toHaveCount(0);
    });
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

    test(
      'multi-account isolation: switching accounts never mixes up state or risk',
      { tag: ['@smoke', '@critical', '@risk'] },
      async ({ page }) => {
        // Start from the primary explicitly. /hub defaults to accounts[0],
        // and which account that is depends on listAccountsForUser's
        // ordering — so "click the other one" is only a real switch if we
        // first pin where we are. Without this the test could land on the
        // soft-locked account already and pass while switching nothing.
        const primary = loadPrimaryFixture();
        await page.goto(`/hub?account=${primary.accountId}`);
        const selector = page.getByRole('navigation', { name: 'Changer de compte' });
        await expect(selector.getByRole('link')).toHaveCount(2);
        // The primary is active, so WariX is reachable from it — this is the
        // "before" half of the isolation assertion below.
        await expect(page.getByRole('link', { name: 'Ouvrir WariX' })).toHaveCount(1);

        // Switch through the real control a trader uses. Accounts are
        // targeted by id rather than by status label so the two can never be
        // confused for one another.
        const softLockedLink = selector.locator(`a[href="/hub?account=${secondary.accountId}"]`);
        await expect(softLockedLink).toContainText('Blocage temporaire');
        await softLockedLink.click();

        await expect(page).toHaveURL(new RegExp(`account=${secondary.accountId}`));
        // Soft-locked account: its own status, its own risk, its own -160 PnL
        // — and none of the primary's.
        await expect(page.getByText('Blocage temporaire').first()).toBeVisible();
        // The figure moved from an inline "PnL du jour : X" sentence into the
        // risk panel's own row when the dashboard was recomposed; the fact
        // asserted is unchanged — this account's PnL, not the primary's.
        await expect(page.getByTestId('risk-panel')).toContainText('-160 USD');
        await expect(page.getByRole('link', { name: 'Ouvrir WariX' })).toHaveCount(0);
        await page.screenshot({
          path: 'test-results/visual/hub-soft-locked-1440.png',
          fullPage: true,
        });

        // ...and back again, through the switcher, to prove the switch is
        // not one-way and that account A's state returns intact.
        const primaryLink = selector.locator(`a[href="/hub?account=${primary.accountId}"]`);
        await expect(primaryLink).toContainText('Actif');
        await primaryLink.click();

        await expect(page).toHaveURL(new RegExp(`account=${primary.accountId}`));
        await expect(page.getByRole('link', { name: 'Ouvrir WariX' })).toHaveCount(1);
        await expect(page.getByTestId('risk-panel')).not.toContainText('-160 USD');
      },
    );
  });
});
