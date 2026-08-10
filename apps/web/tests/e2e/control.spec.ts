import { test, expect } from './fixtures';
import {
  createStaffFixtureDb,
  seedStaffUser,
  seedTraderUser,
  deleteStaffFixtureUser,
  seedPayoutAccount,
  deletePayoutAccount,
  STAFF_E2E_TEST_PASSWORD,
  type Db,
  type PayoutAccountFixture,
  type PayoutFixtureEnvironment,
  type StaffFixtureUser,
} from '@wariba/test-utils';

/**
 * Prompt 7 Appendix 07-B, gate 4/5 — /control's real authorization
 * boundary, end to end through the actual redirect behavior a browser
 * session experiences (not just the DB-level RLS covered by
 * packages/database/tests/staff-rls.integration.test.ts).
 */
async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(STAFF_E2E_TEST_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

test.describe('WariX Control — role-based authorization', { tag: ['@control'] }, () => {
  let db: Db;
  let payoutEnvironment: PayoutFixtureEnvironment;
  let payoutAccount: PayoutAccountFixture;
  let trader: StaffFixtureUser;
  let supportStaff: StaffFixtureUser;
  let financeStaff: StaffFixtureUser;
  let adminStaff: StaffFixtureUser;

  test.beforeAll(async () => {
    db = createStaffFixtureDb();
    payoutEnvironment = {
      databaseUrl: process.env.DATABASE_URL as string,
      supabaseUrl: process.env.SUPABASE_URL as string,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    };
    trader = await seedTraderUser();
    supportStaff = await seedStaffUser(db, 'support');
    financeStaff = await seedStaffUser(db, 'finance');
    adminStaff = await seedStaffUser(db, 'admin');
    payoutAccount = await seedPayoutAccount(payoutEnvironment, { createPendingRequest: true });
  });

  test.afterAll(async () => {
    for (const user of [trader, supportStaff, financeStaff, adminStaff]) {
      await deleteStaffFixtureUser(db, user);
    }
    await deletePayoutAccount(payoutEnvironment, payoutAccount);
    await db.destroy();
  });

  test(
    'a regular trader (no staff role) is redirected away from /control to /hub',
    { tag: ['@smoke', '@critical'] },
    async ({ page }) => {
      await login(page, trader.email);
      await page.waitForURL('**/hub', { timeout: 30_000 });

      await page.goto('/control');
      await page.waitForURL('**/hub', { timeout: 30_000 });
    },
  );

  test('a support staff member reaches the Overview and Users sections', async ({ page }) => {
    await login(page, supportStaff.email);
    await page.waitForURL('**/hub', { timeout: 30_000 });

    await page.goto('/control');
    await expect(page).toHaveURL(/\/control$/);
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

    await page.goto('/control/users');
    await expect(page).toHaveURL(/\/control\/users$/);
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });

  test(
    'a support staff member can inspect the Payout queue without gaining finance-only controls',
    { tag: ['@smoke', '@critical'] },
    async ({ page }) => {
      await login(page, supportStaff.email);
      await page.waitForURL('**/hub', { timeout: 30_000 });

      await page.goto('/control/payouts');
      await expect(page).toHaveURL(/\/control\/payouts$/);
      await expect(page.getByRole('heading', { name: 'Payout queue' })).toBeVisible();
      await expect(page.getByText(payoutAccount.accountPublicId)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Approuver' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Refuser' })).toHaveCount(0);
    },
  );

  test('a finance staff member reaches Payouts but is redirected away from the support-only Users section', async ({
    page,
  }) => {
    await login(page, financeStaff.email);
    await page.waitForURL('**/hub', { timeout: 30_000 });

    await page.goto('/control/payouts');
    await expect(page).toHaveURL(/\/control\/payouts$/);
    await expect(page.getByRole('heading', { name: 'Payout queue' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approuver' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refuser' })).toBeVisible();

    await page.goto('/control/users');
    await page.waitForURL('**/control', { timeout: 15_000 });
  });

  test('an admin reaches every section, including finance- and support-scoped ones', async ({
    page,
  }) => {
    await login(page, adminStaff.email);
    await page.waitForURL('**/hub', { timeout: 30_000 });

    await page.goto('/control/users');
    await expect(page).toHaveURL(/\/control\/users$/);

    await page.goto('/control/payouts');
    await expect(page).toHaveURL(/\/control\/payouts$/);

    await page.goto('/control/integrity');
    await expect(page).toHaveURL(/\/control\/integrity$/);
  });
});
