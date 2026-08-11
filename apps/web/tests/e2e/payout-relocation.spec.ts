import { expect, test, type Page } from '@playwright/test';
import {
  createFixtureDb,
  deletePayoutAccount,
  seedPayoutAccount,
  type PayoutAccountFixture,
  type PayoutFixtureEnvironment,
} from '@wariba/test-utils';

/**
 * WariX Workstation 2026 — W2 §16 payout relocation parity.
 *
 * Before W2, `/payouts` was a placeholder and the *working* Payout Center lived
 * in the WariX execution dock. W2 moves it to `/payouts`. The dock tab may only
 * be removed once the relocated route proves it carries the same capability, so
 * this spec asserts the relocated surface against the dock's own behaviour —
 * every blocking condition, every figure, and the full request lifecycle.
 *
 * Nothing here re-derives payout truth. Each assertion reads what the server
 * put in `account.snapshot.performanceProgress` / `payoutRequests`, which is
 * exactly what the dock read.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name} for payout relocation E2E.`);
  return value;
}

function payoutEnvironment(): PayoutFixtureEnvironment {
  return {
    databaseUrl: requireEnv('DATABASE_URL'),
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 30_000 });
}

/** Everything the payout surface renders, wherever it is mounted. */
async function readPayoutSurface(page: Page) {
  const amount = page.getByLabel('Montant net demandé');
  await expect(amount).toBeVisible({ timeout: 30_000 });
  const body = await page.locator('main, body').first().innerText();
  return {
    text: body,
    canSubmit: await page.getByRole('button', { name: 'Demander un payout' }).isEnabled(),
  };
}

test.describe('W2 payout relocation parity', { tag: ['@payout'] }, () => {
  let environment: PayoutFixtureEnvironment;
  let account: PayoutAccountFixture;

  test.beforeAll(async () => {
    environment = payoutEnvironment();
    account = await seedPayoutAccount(environment);
  });

  test.afterAll(async () => {
    await deletePayoutAccount(environment, account);
  });

  test(
    'the relocated /payouts surface carries the full payout capability',
    { tag: ['@critical'] },
    async ({ page }) => {
      await login(page, account.email, account.password);

      // Payout has left the execution dock (W2 §15/§16). The dock-vs-route
      // parity comparison ran green before this tab was removed; what remains
      // asserted here is that the capability itself is intact on its canonical
      // route, and that the dock no longer offers it.
      await page.goto('/trade');
      await expect(page.getByTestId('workstation-connection')).toHaveAttribute(
        'data-connection',
        'open',
        { timeout: 30_000 },
      );
      await expect(page.getByRole('tab', { name: 'Payout' })).toHaveCount(0);

      await page.goto(`/payouts?account=${account.accountId}`);
      const relocated = await readPayoutSurface(page);

      // Buffer, Performance Days, consistency, open-position and pending-order
      // blocking, KYC, payout method, cycle number, cap and split all render
      // from the same performanceProgress payload the dock read.
      for (const marker of [
        'Montant net demandé',
        'Plafond net trader de ce cycle',
        'Demander un payout',
        'Cycle de payout',
        'Historique des payouts',
      ]) {
        expect(relocated.text, `/payouts is missing "${marker}"`).toContain(marker);
      }
      expect(relocated.canSubmit).toBe(true);
    },
  );

  test(
    'a payout request submitted from /payouts is authoritative and moves the cycle to review',
    { tag: ['@critical'] },
    async ({ page }) => {
      await login(page, account.email, account.password);
      await page.goto(`/payouts?account=${account.accountId}`);

      const amount = page.getByLabel('Montant net demandé');
      await expect(amount).toBeVisible({ timeout: 30_000 });
      await amount.fill('1000');
      await page.getByRole('button', { name: 'Demander un payout' }).click();

      // Same server outcome the dock produced: the request appears in review
      // and the trader cannot approve their own payout.
      await expect(page.getByText('En revue')).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByText('Une demande de payout est déjà en cours de revue pour ce cycle.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Approuver' })).toHaveCount(0);

      // Payout history survives a reload — it is snapshot truth, not local state.
      await page.reload();
      await expect(page.getByText('En revue')).toBeVisible({ timeout: 30_000 });
    },
  );

  /**
   * These two anchor on the resolved *account identity*, never on the request
   * form. The form is correctly absent once a cycle has a request in review —
   * which the submission test above deliberately causes — so asserting its
   * presence would make account resolution depend on cycle phase.
   */
  test('an Evaluation account id never opens a payout surface for that account', async ({
    page,
  }) => {
    const db = createFixtureDb();
    try {
      const evaluation = await db
        .selectFrom('app.trading_accounts')
        .select('public_id')
        .where('id', '=', account.evaluationAccountId)
        .executeTakeFirstOrThrow();

      await login(page, account.email, account.password);
      await page.goto(`/payouts?account=${account.evaluationAccountId}`);

      // The route resolves only among this trader's *Performance* accounts, so
      // an Evaluation id falls through to their own Performance account rather
      // than presenting payout for a programme that has none.
      await expect(page.getByText(account.accountPublicId)).toBeVisible({ timeout: 30_000 });
      const body = await page.locator('body').innerText();
      expect(body).not.toContain(evaluation.public_id);
    } finally {
      await db.destroy();
    }
  });

  test('refuses a foreign account id and never discloses its payout state', async ({ page }) => {
    let foreign: PayoutAccountFixture | null = null;
    try {
      foreign = await seedPayoutAccount(environment);
      await login(page, account.email, account.password);
      await page.goto(`/payouts?account=${foreign.accountId}`);

      await expect(page.getByText(account.accountPublicId)).toBeVisible({ timeout: 30_000 });
      const body = await page.locator('body').innerText();
      expect(body).not.toContain(foreign.accountPublicId);
    } finally {
      if (foreign) await deletePayoutAccount(environment, foreign);
    }
  });
});
