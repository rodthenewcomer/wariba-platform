import { test, expect } from './fixtures';
import {
  createStaffFixtureDb,
  seedStaffUser,
  seedTraderUser,
  deleteStaffFixtureUser,
  seedPayoutAccount,
  deletePayoutAccount,
  seedActuarialScenarioRun,
  deleteActuarialVarianceRuns,
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
  let riskStaff: StaffFixtureUser;
  let adminStaff: StaffFixtureUser;
  let scenarioRunId: string;
  const createdVarianceRunIds: string[] = [];

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
    riskStaff = await seedStaffUser(db, 'risk');
    adminStaff = await seedStaffUser(db, 'admin');
    payoutAccount = await seedPayoutAccount(payoutEnvironment, { createPendingRequest: true });
    ({ scenarioRunId } = await seedActuarialScenarioRun(db));
  });

  test.afterAll(async () => {
    // Before the staff users: a variance run references its executor.
    await deleteActuarialVarianceRuns(db, scenarioRunId);
    for (const id of createdVarianceRunIds) {
      await db.deleteFrom('app.actuarial_variance_runs').where('id', '=', id).execute();
    }
    for (const user of [
      trader,
      supportStaff,
      financeStaff,
      complianceStaff,
      riskStaff,
      adminStaff,
    ]) {
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
    // Scoped to the fixture's own row: the queue is shared state, so
    // "a button exists somewhere on the page" would pass for the wrong
    // payout and fail whenever a second pending request is present.
    const fixtureRow = page.getByRole('row').filter({ hasText: payoutAccount.accountPublicId });
    await expect(fixtureRow.getByRole('button', { name: 'Approuver' })).toBeVisible();
    await expect(fixtureRow.getByRole('button', { name: 'Refuser' })).toBeVisible();

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
    // Immutable evidence: the only form on the page is the GET filter form,
    // so there is no Server Action and nothing to press that could edit,
    // delete or backfill a record.
    await expect(page.getByRole('button', { name: /supprimer|delete|modifier|edit/i })).toHaveCount(
      0,
    );
    const forms = page.locator('form');
    await expect(forms).toHaveCount(1);
    await expect(forms.first()).toHaveAttribute('method', /get/i);
  });

  test('audit filters are server-driven and survive in the URL @control', async ({ page }) => {
    await login(page, adminStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/audit');

    // Options come from recorded data, not a hard-coded list — the fixtures
    // above have produced staff audit events by this point.
    const roleSelect = page.getByLabel('Rôle');
    await expect(roleSelect).toBeVisible();

    // One filter, applied by the server: submitting navigates, and the
    // choice is legible in the URL so the view can be shared and reloaded.
    await roleSelect.selectOption('finance');
    await page.getByRole('button', { name: 'Filtrer' }).click();
    await expect(page).toHaveURL(/[?&]role=finance/);
    await expect(page.getByRole('heading', { name: 'Audit' })).toBeVisible();
    await expect(page.getByLabel('Rôle')).toHaveValue('finance');

    // Combined filters travel together.
    await page.getByLabel('Type de cible').selectOption('payout_request');
    await page.getByRole('button', { name: 'Filtrer' }).click();
    await expect(page).toHaveURL(/[?&]role=finance/);
    await expect(page).toHaveURL(/[?&]targetType=payout_request/);

    // Reset returns to the unfiltered trail.
    await page.getByRole('link', { name: 'Réinitialiser' }).click();
    await expect(page).toHaveURL(/\/control\/audit$/);
  });

  test('audit pagination keeps its filters and never exceeds the page size @control', async ({
    page,
  }) => {
    await login(page, adminStaff.email);
    await page.waitForURL('**/hub');
    // Smallest page size makes paging reachable with the handful of events
    // this suite's own sensitive actions have written.
    await page.goto('/control/audit?pageSize=25');
    await expect(page.getByRole('heading', { name: 'Audit' })).toBeVisible();

    const rows = page.locator('tbody tr');
    expect(await rows.count()).toBeLessThanOrEqual(25);

    const next = page.getByRole('link', { name: 'Suivant' });
    if ((await next.count()) > 0) {
      await next.click();
      await expect(page).toHaveURL(/[?&]page=2/);
      // Paging must not silently drop the page size the operator chose.
      await expect(page).toHaveURL(/[?&]pageSize=25/);
      await expect(page.getByRole('link', { name: 'Précédent' })).toBeVisible();
    }
  });

  test('a hostile audit query normalises instead of failing @control', async ({ page }) => {
    await login(page, adminStaff.email);
    await page.waitForURL('**/hub');
    // A malformed UUID would be a Postgres error against a uuid column, and
    // a negative page would be a negative OFFSET — both must be dropped.
    await page.goto(
      '/control/audit?actor=not-a-uuid&target=123&from=yesterday&page=-5&pageSize=999999',
    );
    await expect(page.getByRole('heading', { name: 'Audit' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('the Users explorer searches server-side and masks addresses in the list @control', async ({
    page,
  }) => {
    await login(page, supportStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

    // The seeded payout account's owner exists, so the roster is not empty.
    await expect(page.getByRole('table')).toBeVisible();
    // Bulk exposure is what masking exists to prevent: no full address may
    // appear in the list, only the masked form.
    await expect(page.getByRole('table')).toContainText('•••@');

    // Searching is a read: it navigates, and the query survives in the URL.
    await page.getByRole('searchbox').fill('no-such-user-anywhere');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page).toHaveURL(/[?&]q=no-such-user-anywhere/);
    await expect(
      page.getByText('Aucun utilisateur ne correspond à cette recherche.'),
    ).toBeVisible();
  });

  test('a user detail page shows the full address and stays read-only @control', async ({
    page,
  }) => {
    await login(page, supportStaff.email);
    await page.waitForURL('**/hub');
    await page.goto(`/control/users/${payoutAccount.userId}`);

    // Targeted, single-subject lookup — the address is shown in full here.
    await expect(page.getByText(payoutAccount.email)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Comptes' })).toBeVisible();
    // Read-only: nothing on this page can change a user.
    await expect(page.locator('form')).toHaveCount(0);
  });

  test('a malformed or unknown user id is a 404, never a database error @control', async ({
    page,
  }) => {
    await login(page, adminStaff.email);
    await page.waitForURL('**/hub');

    // A non-UUID would be a Postgres error against a uuid column.
    await page.goto('/control/users/not-a-uuid');
    await expect(page.getByText(/introuvable|not found|404/i).first()).toBeVisible();

    await page.goto('/control/users/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/introuvable|not found|404/i).first()).toBeVisible();
  });

  test('finance cannot reach the Users explorer or a user detail page @control', async ({
    page,
  }) => {
    await login(page, financeStaff.email);
    await page.waitForURL('**/hub');

    // Refused server-side at both the list and the detail route — a direct
    // URL must not be a way around the area boundary.
    await page.goto('/control/users');
    await expect(page).toHaveURL(/\/control$/);
    await page.goto(`/control/users/${payoutAccount.userId}`);
    await expect(page).toHaveURL(/\/control$/);
  });

  test('the Accounts explorer filters server-side and reports rejected values @control', async ({
    page,
  }) => {
    await login(page, supportStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/accounts');
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    // Bulk exposure is masked here too.
    await expect(page.getByRole('table')).toContainText('•••@');

    await page.getByLabel('Programme').selectOption('WARIBA_PERFORMANCE');
    await page.getByRole('button', { name: 'Filtrer' }).click();
    await expect(page).toHaveURL(/[?&]program=WARIBA_PERFORMANCE/);

    // A rejected value must never sit in the form looking applied.
    await page.goto('/control/accounts?status=not-a-status&nominal=abc');
    await expect(page.getByText('Filtres ignorés')).toBeVisible();
    await expect(page.getByLabel('Statut')).toHaveValue('');
    await expect(page.getByLabel('Nominal')).toHaveValue('');
  });

  test('support opens an account and receives Overview and Trading only @control', async ({
    page,
  }) => {
    await login(page, supportStaff.email);
    await page.waitForURL('**/hub');
    await page.goto(`/control/accounts/${payoutAccount.accountId}`);

    // Authorized sections are present...
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trading' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Payout' })).toBeVisible();

    // ...and the rest were never queried, so nothing renders for them. This
    // asserts the server response, not a hidden tab.
    await expect(page.getByRole('heading', { name: 'Risk & Integrity' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Réconciliation financière' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Incidents' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Audit' })).toHaveCount(0);
  });

  test('risk and compliance are refused the Accounts area itself @control', async ({ page }) => {
    // Opening the Accounts explorer is gated on account.view, which neither
    // role holds. Their section authorities (risk.view, audit_evidence.view)
    // govern what a page they *can* open may return — they are not a way in.
    for (const staff of [riskStaff, complianceStaff]) {
      await login(page, staff.email);
      await page.waitForURL('**/hub');
      await page.goto('/control/accounts');
      await expect(page, `${staff.email} must be refused the Accounts list`).toHaveURL(
        /\/control$/,
      );
      await page.goto(`/control/accounts/${payoutAccount.accountId}`);
      await expect(page, `${staff.email} must be refused an account detail`).toHaveURL(
        /\/control$/,
      );
      await page.context().clearCookies();
    }
  });

  test('an unauthorized section cannot be revealed by URL manipulation @control', async ({
    page,
  }) => {
    await login(page, supportStaff.email);
    await page.waitForURL('**/hub');
    // The section set is derived from the role alone; nothing in the query
    // string participates in that decision.
    await page.goto(
      `/control/accounts/${payoutAccount.accountId}?section=risk&sections=all&reconciliation=1`,
    );
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Risk & Integrity' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Réconciliation financière' })).toHaveCount(0);
  });

  test('an admin receives every account section @control', async ({ page }) => {
    await login(page, adminStaff.email);
    await page.waitForURL('**/hub');
    await page.goto(`/control/accounts/${payoutAccount.accountId}`);

    for (const heading of [
      'Overview',
      'Trading',
      'Risk & Integrity',
      'Payout',
      'Réconciliation financière',
      'Incidents',
      'Audit',
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });

  test('a malformed account id is a 404, never a database error @control', async ({ page }) => {
    await login(page, adminStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/accounts/not-a-uuid');
    await expect(page.getByText(/introuvable|not found|404/i).first()).toBeVisible();
  });

  test('the Incidents console is readable by risk and finance, and offers no resolution @control', async ({
    page,
  }) => {
    for (const staff of [riskStaff, financeStaff]) {
      await login(page, staff.email);
      await page.waitForURL('**/hub');
      await page.goto('/control/incidents');
      await expect(page.getByRole('heading', { name: 'Incidents' })).toBeVisible();

      // Resolution belongs to the domain that owns the rule — an integrity
      // hold cannot clear while reconciliation fails, and a platform alert
      // closes itself. A manual button here would be a third path knowing
      // neither, so none exists.
      await expect(page.getByRole('button', { name: /résoudre|resolve|clore|close/i })).toHaveCount(
        0,
      );
      const forms = page.locator('form');
      await expect(forms).toHaveCount(1);
      await expect(forms.first()).toHaveAttribute('method', /get/i);

      await page.context().clearCookies();
    }
  });

  test('Incidents filters are server-driven and drop unknown values @control', async ({ page }) => {
    await login(page, riskStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/incidents');

    await page.getByLabel('Statut').selectOption('open');
    await page.getByRole('button', { name: 'Filtrer' }).click();
    await expect(page).toHaveURL(/[?&]status=open/);
    await expect(page.getByLabel('Statut')).toHaveValue('open');

    // An unknown value must not reach a checked column, and must not sit in
    // the control looking applied.
    await page.goto('/control/incidents?status=bogus&severity=nope&scope=elsewhere');
    await expect(page.getByRole('heading', { name: 'Incidents' })).toBeVisible();
    await expect(page.getByLabel('Statut')).toHaveValue('');
    await expect(page.getByLabel('Sévérité')).toHaveValue('');
  });

  test('support and compliance are refused the Incidents console @control', async ({ page }) => {
    for (const staff of [supportStaff, complianceStaff]) {
      await login(page, staff.email);
      await page.waitForURL('**/hub');
      await page.goto('/control/incidents');
      await expect(page, `${staff.email} must be refused Incidents`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  test('Market Ops shows structured operational truth and exposes no controls @control', async ({
    page,
  }) => {
    await login(page, riskStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/market-operations');

    await expect(page.getByRole('heading', { name: 'Market Ops' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Leadership realtime' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Haute disponibilité' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Feed de marché' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Processus' })).toBeVisible();

    // Structured fields, not raw JSON for an operator to decode.
    for (const term of [
      'Epoch de fencing',
      'Standby prêt',
      'Symboles périmés',
      'Symboles en panne',
      'Âge du dernier tick valide',
      'Ticks rejetés',
      'Reconnexions',
      'Durée de la dernière reprise',
    ]) {
      await expect(
        page.getByRole('term').filter({ hasText: term }),
        `${term} must be a labelled field`,
      ).toHaveCount(1);
    }

    // Leadership is arbitrated by a PostgreSQL lease; a promote/failover
    // control here would be a second, unfenced writer.
    await expect(
      page.getByRole('button', { name: /promouvoir|promote|failover|redémarrer|restart/i }),
    ).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
    // No credential may ever render on this page.
    await expect(page.locator('body')).not.toContainText('SUPABASE_SERVICE_ROLE_KEY');
    await expect(page.locator('body')).not.toContainText('eyJhbGciOi');
  });

  test('Market Ops says "inconnu" rather than healthy when realtime is unreachable @control', async ({
    page,
  }) => {
    await login(page, riskStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/market-operations');

    // The Playwright stack runs one realtime instance with no standby, so
    // whichever way the probe resolves, the page must never present an
    // unmeasured datum as healthy. Last-valid-tick age has no authoritative
    // source at all and is therefore always unknown.
    const tickAge = page
      .getByRole('term')
      .filter({ hasText: 'Âge du dernier tick valide' })
      .locator('xpath=following-sibling::dd[1]');
    await expect(tickAge).toHaveText('inconnu');

    // Persisted leadership stays exact regardless of the probe.
    await expect(page.getByRole('term').filter({ hasText: 'Epoch de fencing' })).toHaveCount(1);
  });

  test('support, finance and compliance are refused Market Ops @control', async ({ page }) => {
    for (const staff of [supportStaff, financeStaff, complianceStaff]) {
      await login(page, staff.email);
      await page.waitForURL('**/hub');
      await page.goto('/control/market-operations');
      await expect(page, `${staff.email} must be refused Market Ops`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  test('Risk & Integrity is the risk operator’s route to an account @control', async ({ page }) => {
    await login(page, riskStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/integrity');

    await expect(page.getByRole('heading', { name: 'Dossiers d’intégrité' })).toBeVisible();
    // Risk holds no account.view, so the generic explorer stays closed to it
    // — this surface is the sanctioned way in.
    await page.goto('/control/accounts');
    await expect(page).toHaveURL(/\/control$/);
  });

  test('a risk investigation carries evidence but not trader identity @control', async ({
    page,
  }) => {
    await login(page, riskStaff.email);
    await page.waitForURL('**/hub');
    await page.goto(`/control/integrity/${payoutAccount.accountId}`);

    await expect(page.getByRole('heading', { name: 'Intégrité' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Réconciliation financière' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Incidents liés' })).toBeVisible();

    // Minimum necessary identity: the account, never the person behind it.
    await expect(page.locator('body')).not.toContainText(payoutAccount.email);
    // Payout and audit evidence belong to other authorities entirely.
    await expect(page.getByRole('heading', { name: 'Payout' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Audit' })).toHaveCount(0);
  });

  test('support cannot reach the risk investigation surface @control', async ({ page }) => {
    await login(page, supportStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/integrity');
    await expect(page).toHaveURL(/\/control$/);
    await page.goto(`/control/integrity/${payoutAccount.accountId}`);
    await expect(page).toHaveURL(/\/control$/);
  });

  /**
   * Prompt 09 milestone 4 — the financial operations surfaces.
   *
   * These assert the three properties the money surfaces have to hold: the
   * server does the filtering, the figures shown are the ones the engines
   * persisted, and reading evidence never becomes authority to change it.
   */
  test('the payout queue filters in the database and reports what it could not apply @control', async ({
    page,
  }) => {
    await login(page, financeStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/payouts');

    await page.getByLabel('Statut').selectOption('pending_review');
    await page.getByRole('button', { name: 'Filtrer' }).click();
    await expect(page).toHaveURL(/[?&]status=pending_review/);
    await expect(page.getByLabel('Statut')).toHaveValue('pending_review');
    await expect(page.getByText(payoutAccount.accountPublicId).first()).toBeVisible();

    // A value the checked column cannot hold must not reach SQL, and must
    // not sit in the control looking applied — an operator who filters and
    // is silently given everything has been shown the wrong answer.
    await page.goto('/control/payouts?status=bogus&cycle=9&nominal=1e5&kyc=maybe');
    await expect(page.getByText('Filtres ignorés')).toBeVisible();
    await expect(page.getByLabel('Statut')).toHaveValue('');
    await expect(page.getByLabel('Cycle')).toHaveValue('');
    await expect(page.getByLabel('KYC')).toHaveValue('');
  });

  test('a payout’s evidence page shows persisted figures and offers no edit @control', async ({
    page,
  }) => {
    const payoutRequestId = payoutAccount.payoutRequestId as string;
    const stored = await db
      .selectFrom('app.payout_requests')
      .select(['cap_applied', 'trader_split_rate', 'requested_net_trader_cash'])
      .where('id', '=', payoutRequestId)
      .executeTakeFirstOrThrow();

    await login(page, financeStaff.email);
    await page.waitForURL('**/hub');
    await page.goto(`/control/payouts/${payoutRequestId}`);

    for (const heading of [
      'Demande',
      'Calcul autoritatif',
      'Instantané d’éligibilité',
      'Gates',
      'Cycle de vie',
      'Provider',
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }

    // Byte-identical to what the payout engine wrote. A figure re-derived
    // for display could disagree with the binding one, and the operator
    // would have no way to tell which was which.
    await expect(page.locator('body')).toContainText(stored.cap_applied);
    await expect(page.locator('body')).toContainText(stored.trader_split_rate);
    await expect(page.locator('body')).toContainText(stored.requested_net_trader_cash);

    // Read-only: approving, rejecting, settling and reversing stay on the
    // queue behind their own finance authorities.
    await expect(page.locator('form')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /approuver|refuser|régler|annuler|modifier/i }),
    ).toHaveCount(0);
  });

  test('payout evidence carries no cross-domain evidence the role cannot read @control', async ({
    page,
  }) => {
    const payoutRequestId = payoutAccount.payoutRequestId as string;

    // support holds payout.view and nothing else here.
    await login(page, supportStaff.email);
    await page.waitForURL('**/hub');
    await page.goto(`/control/payouts/${payoutRequestId}`);
    await expect(page.getByRole('heading', { name: 'Demande' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Réconciliation' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Audit' })).toHaveCount(0);
    await page.context().clearCookies();

    // finance adds reconciliation.view — and still not audit_evidence.view.
    await login(page, financeStaff.email);
    await page.waitForURL('**/hub');
    await page.goto(`/control/payouts/${payoutRequestId}`);
    await expect(page.getByRole('heading', { name: 'Réconciliation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Audit' })).toHaveCount(0);
    await page.context().clearCookies();

    await login(page, adminStaff.email);
    await page.waitForURL('**/hub');
    await page.goto(`/control/payouts/${payoutRequestId}`);
    await expect(page.getByRole('heading', { name: 'Réconciliation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Audit' })).toBeVisible();
  });

  test('risk and compliance are refused the payout queue and a payout’s evidence @control', async ({
    page,
  }) => {
    const payoutRequestId = payoutAccount.payoutRequestId as string;
    for (const staff of [riskStaff, complianceStaff]) {
      await login(page, staff.email);
      await page.waitForURL('**/hub');
      await page.goto('/control/payouts');
      await expect(page, `${staff.email} must be refused the payout queue`).toHaveURL(/\/control$/);
      await page.goto(`/control/payouts/${payoutRequestId}`);
      await expect(page, `${staff.email} must be refused payout evidence`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  test('a malformed payout id is a 404, never a database error @control', async ({ page }) => {
    await login(page, financeStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/payouts/not-a-uuid');
    await expect(page.getByText(/introuvable|not found|404/i).first()).toBeVisible();
  });

  test('the Treasury cockpit keeps cash, projection and simulated balances apart @control', async ({
    page,
  }) => {
    await login(page, financeStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/treasury');

    await expect(page.getByRole('heading', { name: 'Treasury' })).toBeVisible();
    for (const heading of [
      'Composition de la réserve',
      'Engagements',
      'Hors réserve — soldes simulés',
      'Historique des écritures',
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }

    // Simulated trader nominal is not WARIBA cash; a projection is not cash
    // either. Both are reported beside the reserve, never folded into it.
    await expect(page.getByText('Nominal simulé cumulé')).toBeVisible();
    await expect(page.getByText('Réserve disponible (cash)')).toBeVisible();
    await expect(page.getByText('Projection payouts 30 j')).toBeVisible();

    // Buckets the data model does not have are named, not rendered as zero
    // balances that would read as real money.
    await expect(page.getByText('Poches non modélisées')).toBeVisible();
    await expect(page.getByText('Fonds opérationnels')).toBeVisible();
  });

  test('support, risk and compliance are refused Treasury @control', async ({ page }) => {
    for (const staff of [supportStaff, riskStaff, complianceStaff]) {
      await login(page, staff.email);
      await page.waitForURL('**/hub');
      await page.goto('/control/treasury');
      await expect(page, `${staff.email} must be refused Treasury`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  test('the Actuarial console separates MODEL, ACTUAL and VARIANCE @control', async ({ page }) => {
    await login(page, riskStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/actuarial');

    await expect(page.getByRole('heading', { name: 'Actuarial' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'RÉEL — mesuré depuis les opérations persistées' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'MODÈLE — hypothèses et exécutions' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'ÉCART — dernière comparaison enregistrée' }),
    ).toBeVisible();

    // The one claim this surface must never make.
    await expect(page.getByText('Modèle NON VALIDÉ')).toBeVisible();
  });

  test('a recorded comparison is labelled by its coverage, never as validation @control', async ({
    page,
  }) => {
    await login(page, riskStaff.email);
    await page.waitForURL('**/hub');
    await page.goto('/control/actuarial');

    // Which model run sits in the first row is not this test's business:
    // `app.actuarial_scenario_runs` is immutable, so every earlier suite
    // that executed one leaves it there forever. The assertion is about the
    // comparison the operator just triggered, identified by being the one
    // that did not exist beforehand.
    const before = new Set(
      (await db.selectFrom('app.actuarial_variance_runs').select('id').execute()).map(
        (run) => run.id,
      ),
    );

    // Comparing writes a third artifact; it edits neither the run's snapshot
    // nor the measured actuals.
    const row = page
      .getByRole('row')
      .filter({ has: page.getByRole('button', { name: 'Comparer' }) });
    await expect(row.first()).toBeVisible();
    await row.first().getByRole('button', { name: 'Comparer' }).click();

    const COVERAGE_LABEL = {
      insufficient_data: 'Données insuffisantes',
      partial: 'Partielle',
      comparable: 'Comparable',
    } as const;

    await expect
      .poll(
        async () => {
          const rows = await db.selectFrom('app.actuarial_variance_runs').select('id').execute();
          return rows.some((run) => !before.has(run.id));
        },
        { timeout: 30_000 },
      )
      .toBe(true);

    const latest = await db
      .selectFrom('app.actuarial_variance_runs')
      .select(['id', 'coverage', 'actual_sample_size', 'executed_by'])
      .orderBy('executed_at', 'desc')
      .limit(1)
      .executeTakeFirstOrThrow();
    expect(before.has(latest.id)).toBe(false);
    // Deleted in afterAll before the staff users: executed_by references
    // auth.users, and a lingering comparison would pin this operator.
    createdVarianceRunIds.push(latest.id);
    // Attributed to the operator who ran it, not to whoever the page said.
    expect(latest.executed_by).toBe(riskStaff.userId);

    await expect(page.getByText(COVERAGE_LABEL[latest.coverage]).first()).toBeVisible({
      timeout: 30_000,
    });
    // Whatever the coverage says, the model is still not validated —
    // sample sufficiency is not correctness.
    await expect(page.getByText('Modèle NON VALIDÉ')).toBeVisible();
    if (latest.coverage !== 'comparable') {
      await expect(page.getByText('Comparaison non concluante')).toBeVisible();
    }
    // The comparison table shows both sides side by side, labelled.
    await expect(page.getByRole('columnheader', { name: 'Modèle', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Réel', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Écart', exact: true })).toBeVisible();
  });

  test('support and compliance are refused the Actuarial console @control', async ({ page }) => {
    for (const staff of [supportStaff, complianceStaff]) {
      await login(page, staff.email);
      await page.waitForURL('**/hub');
      await page.goto('/control/actuarial');
      await expect(page, `${staff.email} must be refused Actuarial`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });
});
