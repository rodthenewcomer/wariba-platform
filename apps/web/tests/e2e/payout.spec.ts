import { expect, test } from '@playwright/test';
import {
  deletePayoutAccount,
  seedPayoutAccount,
  type PayoutAccountFixture,
  type PayoutFixtureEnvironment,
} from '@wariba/test-utils';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name} for payout E2E.`);
  return value;
}

function payoutEnvironment(): PayoutFixtureEnvironment {
  return {
    databaseUrl: requireEnv('DATABASE_URL'),
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

async function login(page: import('@playwright/test').Page, fixture: PayoutAccountFixture) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(fixture.email);
  await page.getByLabel('Mot de passe').fill(fixture.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 15_000 });
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible({
    timeout: 30_000,
  });
}

test.describe('Performance payout request', { tag: ['@payout'] }, () => {
  let environment: PayoutFixtureEnvironment;
  let payoutAccount: PayoutAccountFixture;

  test.beforeAll(async () => {
    environment = payoutEnvironment();
    payoutAccount = await seedPayoutAccount(environment);
  });

  test.afterAll(async () => {
    await deletePayoutAccount(environment, payoutAccount);
  });

  test(
    'an eligible trader submits one authoritative request and cannot approve it',
    { tag: ['@smoke', '@critical'] },
    async ({ page }) => {
      await login(page, payoutAccount);
      await page.goto('/trade');
      await expect(page.getByText('Connecté')).toBeVisible({ timeout: 30_000 });
      await page.getByRole('tab', { name: 'Payout' }).click();

      const amount = page.getByLabel('Montant net demandé');
      await expect(amount).toBeVisible();
      await expect(page.getByText('Plafond net trader de ce cycle : 500 USD')).toBeVisible();
      await amount.fill('1000');
      await page.getByRole('button', { name: 'Demander un payout' }).click();

      const payoutPanel = page.getByRole('tabpanel');
      await expect(payoutPanel.getByText('En revue')).toBeVisible({ timeout: 30_000 });
      await expect(
        payoutPanel.getByText('Une demande de payout est déjà en cours de revue pour ce cycle.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Approuver' })).toHaveCount(0);
    },
  );
});
