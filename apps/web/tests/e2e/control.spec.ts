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
  let complianceStaff: StaffFixtureUser;
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
    complianceStaff = await seedStaffUser(db, 'compliance');
    adminStaff = await seedStaffUser(db, 'admin');
    payoutAccount = await seedPayoutAccount(payoutEnvironment, { createPendingRequest: true });
  });

  test.afterAll(async () => {
    for (const user of [trader, supportStaff, financeStaff, complianceStaff, adminStaff]) {
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

  /**
   * Prompt 09 milestone 1 — every operating area proven in both directions
   * through the real browser session: the authorized role reaches it, and
   * the unauthorized role is turned away by the server, not by a hidden
   * menu item. Each case names the area's declared read authority.
   */
  const AREA_CASES = [
    { path: '/control/audit', authority: 'audit_evidence.view' },
    { path: '/control/incidents', authority: 'incident.view' },
    { path: '/control/market-operations', authority: 'market_operations.view' },
    { path: '/control/team', authority: 'staff_directory.view' },
    { path: '/control/commercial', authority: 'commercial_product.view' },
  ] as const;

  test('a compliance staff member reaches Audit but not the areas outside their scope @control', async ({
    page,
  }) => {
    await login(page, complianceStaff.email);
    await page.waitForURL('**/hub');

    await page.goto('/control/audit');
    await expect(page).toHaveURL(/\/control\/audit$/);
    await expect(page.getByRole('heading', { name: 'Audit' })).toBeVisible();

    // Compliance holds audit_evidence.view and policy.view — and nothing
    // that would open money, integrity or staff-management surfaces.
    for (const path of ['/control/treasury', '/control/market-operations', '/control/team']) {
      await page.goto(path);
      await expect(page, `${path} must be refused for compliance`).toHaveURL(/\/control$/);
    }
  });

  test('a support staff member is refused every area outside support scope @control', async ({
    page,
  }) => {
    await login(page, supportStaff.email);
    await page.waitForURL('**/hub');

    // Support reads accounts and the payout queue; it holds none of the
    // seven Prompt 09 read authorities, so each of these is a server-side
    // refusal, independent of what the sidebar renders.
    for (const { path } of AREA_CASES) {
      await page.goto(path);
      await expect(page, `${path} must be refused for support`).toHaveURL(/\/control$/);
    }
  });

  test('an admin reaches every Prompt 09 operating area @control', async ({ page }) => {
    await login(page, adminStaff.email);
    await page.waitForURL('**/hub');

    for (const { path } of AREA_CASES) {
      await page.goto(path);
      await expect(page, `${path} must be reachable for admin`).toHaveURL(
        new RegExp(`${path.replace(/\//g, '\\/')}$`),
      );
    }
  });

  test('Control navigation only advertises areas the operator can open @control', async ({
    page,
  }) => {
    await login(page, supportStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control');

    const nav = page.getByRole('navigation').first();
    await expect(nav.getByRole('link', { name: 'Users' })).toBeVisible();
    // Menu filtering is usability, not the boundary — but it must still not
    // advertise a surface this role would be refused at.
    await expect(nav.getByRole('link', { name: 'Audit' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Treasury' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Team Access' })).toHaveCount(0);
  });

  test('the audit trail is read-only — no mutating control is offered @control', async ({
    page,
  }) => {
    await login(page, adminStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/audit');

    await expect(page.getByRole('heading', { name: 'Audit' })).toBeVisible();
    // Immutable evidence: the page exposes no Server Action at all, so there
    // is nothing to press that could edit, delete or backfill a record.
    await expect(page.getByRole('button', { name: /supprimer|delete|modifier|edit/i })).toHaveCount(
      0,
    );
  });
});
