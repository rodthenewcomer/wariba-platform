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
  await page.waitForURL('**/hub', { timeout: 30_000 });
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
      // W2 §16 — the Payout Center's canonical home. It used to be a tab in the
      // WariX execution dock; the workflow, the command and the eligibility
      // rules are unchanged, only where they are mounted.
      await page.goto(`/payouts?account=${payoutAccount.accountId}`);

      const amount = page.getByLabel('Montant net demandé');
      await expect(amount).toBeVisible();
      await expect(page.getByText('Plafond net trader de ce cycle : 500 USD')).toBeVisible();
      await amount.fill('1000');
      await page.getByRole('button', { name: 'Demander un payout' }).click();

      // No longer scoped to a tabpanel: on its canonical route the Payout
      // Center is the page, not a dock tab.
      await expect(page.getByText('En revue')).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByText('Une demande de payout est déjà en cours de revue pour ce cycle.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Approuver' })).toHaveCount(0);
    },
  );
});
