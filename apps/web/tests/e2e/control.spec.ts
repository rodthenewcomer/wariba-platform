import AxeBuilder from '@axe-core/playwright';
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
  seedStaffAuditEvents,
  deleteStaffAuditEvents,
  evaluateReserveStatus,
  STAFF_E2E_TEST_PASSWORD,
  type Db,
  type PayoutAccountFixture,
  type PayoutFixtureEnvironment,
  type StaffAuditFixture,
  type StaffFixtureUser,
} from '@wariba/test-utils';

/**
 * Prompt 7 Appendix 07-B, gate 4/5 — /control's real authorization
 * boundary, end to end through the actual redirect behavior a browser
 * session experiences (not just the DB-level RLS covered by
 * packages/database/tests/staff-rls.integration.test.ts).
 */
type BrowserCookies = Awaited<ReturnType<import('@playwright/test').BrowserContext['cookies']>>;

/**
 * One real sign-in per fixture user, captured once in beforeAll.
 *
 * Supabase caps sign-ins at `sign_in_sign_ups = 30` per five minutes per IP
 * (supabase/config.toml). This spec exercises ~50 role checks; authenticating
 * for each one exceeded that limit and GoTrue started rejecting logins, which
 * surfaced as a login that never reached /hub — indistinguishable from an
 * authorization failure, and moving from test to test as the suite's timing
 * shifted. The limit is a real protection and is not raised here: the suite
 * simply stops asking for 50 sessions when it needs six.
 */
const sessions = new Map<string, BrowserCookies>();

async function captureSession(
  browser: import('@playwright/test').Browser,
  email: string,
): Promise<void> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(STAFF_E2E_TEST_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/hub', { timeout: 30_000 });

    // Landing on /hub is not proof the session is usable by the next
    // navigation: the redirect can complete before the auth cookie is
    // committed to the jar. Waiting for the cookie is a real state check —
    // it is the thing every later request will actually carry.
    await expect
      .poll(async () => (await context.cookies()).some((c) => c.name.includes('auth-token')), {
        timeout: 15_000,
      })
      .toBe(true);
    sessions.set(email, await context.cookies());
  } finally {
    await context.close();
  }
}

/** Adopts a captured session. No network sign-in, so no rate-limit budget. */
async function actAs(page: import('@playwright/test').Page, email: string): Promise<void> {
  const cookies = sessions.get(email);
  if (!cookies) throw new Error(`No captured session for ${email}.`);
  await page.context().clearCookies();
  await page.context().addCookies(cookies);
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
  let auditFixture: StaffAuditFixture;
  const createdVarianceRunIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
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
    // The audit explorer builds its filter options from recorded data. On a
    // freshly reset database there is none, so the tests seed exactly the
    // events they assert against rather than depending on whichever staff
    // action happened to run first.
    auditFixture = await seedStaffAuditEvents(db, adminStaff.userId);

    // Six sign-ins for the whole file — sequential, so the burst stays well
    // inside Supabase's per-IP sign-in limit.
    for (const user of [
      trader,
      supportStaff,
      financeStaff,
      complianceStaff,
      riskStaff,
      adminStaff,
    ]) {
      await captureSession(browser, user.email);
    }
  });

  test.afterAll(async () => {
    // Before the staff users: a variance run references its executor.
    await deleteActuarialVarianceRuns(db, scenarioRunId);
    await deleteStaffAuditEvents(db, auditFixture);
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
      await actAs(page, trader.email);

      await page.goto('/control');
      await page.waitForURL('**/hub', { timeout: 30_000 });
    },
  );

  test('a support staff member reaches the Overview and Users sections', async ({ page }) => {
    await actAs(page, supportStaff.email);

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
      await actAs(page, supportStaff.email);

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
    await actAs(page, financeStaff.email);

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
    await actAs(page, adminStaff.email);

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
    await actAs(page, complianceStaff.email);

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
    await actAs(page, supportStaff.email);

    // Support reads accounts and the payout queue; it holds none of the
    // seven Prompt 09 read authorities, so each of these is a server-side
    // refusal, independent of what the sidebar renders.
    for (const { path } of AREA_CASES) {
      await page.goto(path);
      await expect(page, `${path} must be refused for support`).toHaveURL(/\/control$/);
    }
  });

  test('an admin reaches every Prompt 09 operating area @control', async ({ page }) => {
    await actAs(page, adminStaff.email);

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
    await actAs(page, supportStaff.email);
    await page.goto('/control');

    const nav = page.getByRole('navigation').first();
    await expect(nav.getByRole('link', { name: 'Users' })).toBeVisible();
    // Menu filtering is usability, not the boundary — but it must still not
    // advertise a surface this role would be refused at.
    await expect(nav.getByRole('link', { name: 'Audit' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Treasury' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Team Access' })).toHaveCount(0);

    // Phase 3.2 — support holds `support.read` and `dispute.read`, so both new
    // areas are advertised. Reading a contestation is first-line work;
    // deciding one is not, and that split is enforced at the actions rather
    // than by hiding the queue.
    await expect(nav.getByRole('link', { name: 'Support' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Contestations' })).toBeVisible();
  });

  test('the audit trail is read-only — no mutating control is offered @control', async ({
    page,
  }) => {
    await actAs(page, adminStaff.email);
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
    await actAs(page, adminStaff.email);
    await page.goto('/control/audit');

    // Options come from recorded data, not a hard-coded list — these are the
    // roles this suite's own audit fixture wrote.
    const roleSelect = page.getByLabel('Rôle');
    await expect(roleSelect).toBeVisible();
    await expect(roleSelect.locator('option', { hasText: 'finance' })).toHaveCount(1);

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
    await actAs(page, adminStaff.email);
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
    await actAs(page, adminStaff.email);
    // A malformed UUID would be a Postgres error against a uuid column, and
    // a negative page would be a negative OFFSET — both must be dropped.
    await page.goto(
      '/control/audit?actor=not-a-uuid&target=123&from=yesterday&page=-5&pageSize=999999',
    );
    await expect(page.getByRole('heading', { name: 'Audit' })).toBeVisible();
    // Normalised, not failed: the unfiltered trail still renders, and the
    // fixture's own events are in it.
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'payout.approved' })).not.toHaveCount(0);
  });

  test('the Users explorer searches server-side and masks addresses in the list @control', async ({
    page,
  }) => {
    await actAs(page, supportStaff.email);
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
    await actAs(page, supportStaff.email);
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
    await actAs(page, adminStaff.email);

    // A non-UUID would be a Postgres error against a uuid column.
    await page.goto('/control/users/not-a-uuid');
    await expect(page.getByText(/introuvable|not found|404/i).first()).toBeVisible();

    await page.goto('/control/users/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/introuvable|not found|404/i).first()).toBeVisible();
  });

  test('finance cannot reach the Users explorer or a user detail page @control', async ({
    page,
  }) => {
    await actAs(page, financeStaff.email);

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
    await actAs(page, supportStaff.email);
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
    await actAs(page, supportStaff.email);
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
      await actAs(page, staff.email);
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
    await actAs(page, supportStaff.email);
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
    await actAs(page, adminStaff.email);
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
    await actAs(page, adminStaff.email);
    await page.goto('/control/accounts/not-a-uuid');
    await expect(page.getByText(/introuvable|not found|404/i).first()).toBeVisible();
  });

  test('the Incidents console is readable by risk and finance, and offers no resolution @control', async ({
    page,
  }) => {
    for (const staff of [riskStaff, financeStaff]) {
      await actAs(page, staff.email);
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
    await actAs(page, riskStaff.email);
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
      await actAs(page, staff.email);
      await page.goto('/control/incidents');
      await expect(page, `${staff.email} must be refused Incidents`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  test('Market Ops shows structured operational truth and exposes no controls @control', async ({
    page,
  }) => {
    await actAs(page, riskStaff.email);
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
    await actAs(page, riskStaff.email);
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
      await actAs(page, staff.email);
      await page.goto('/control/market-operations');
      await expect(page, `${staff.email} must be refused Market Ops`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  test('Risk & Integrity is the risk operator’s route to an account @control', async ({ page }) => {
    await actAs(page, riskStaff.email);
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
    await actAs(page, riskStaff.email);
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
    await actAs(page, supportStaff.email);
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
    await actAs(page, financeStaff.email);
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

    await actAs(page, financeStaff.email);
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
    await actAs(page, supportStaff.email);
    await page.goto(`/control/payouts/${payoutRequestId}`);
    await expect(page.getByRole('heading', { name: 'Demande' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Réconciliation' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Audit' })).toHaveCount(0);
    await page.context().clearCookies();

    // finance adds reconciliation.view — and still not audit_evidence.view.
    await actAs(page, financeStaff.email);
    await page.goto(`/control/payouts/${payoutRequestId}`);
    await expect(page.getByRole('heading', { name: 'Réconciliation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Audit' })).toHaveCount(0);
    await page.context().clearCookies();

    await actAs(page, adminStaff.email);
    await page.goto(`/control/payouts/${payoutRequestId}`);
    await expect(page.getByRole('heading', { name: 'Réconciliation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Audit' })).toBeVisible();
  });

  test('risk and compliance are refused the payout queue and a payout’s evidence @control', async ({
    page,
  }) => {
    const payoutRequestId = payoutAccount.payoutRequestId as string;
    for (const staff of [riskStaff, complianceStaff]) {
      await actAs(page, staff.email);
      await page.goto('/control/payouts');
      await expect(page, `${staff.email} must be refused the payout queue`).toHaveURL(/\/control$/);
      await page.goto(`/control/payouts/${payoutRequestId}`);
      await expect(page, `${staff.email} must be refused payout evidence`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  test('a malformed payout id is a 404, never a database error @control', async ({ page }) => {
    await actAs(page, financeStaff.email);
    await page.goto('/control/payouts/not-a-uuid');
    await expect(page.getByText(/introuvable|not found|404/i).first()).toBeVisible();
  });

  test('the Treasury cockpit keeps cash, projection and simulated balances apart @control', async ({
    page,
  }) => {
    await actAs(page, financeStaff.email);
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
      await actAs(page, staff.email);
      await page.goto('/control/treasury');
      await expect(page, `${staff.email} must be refused Treasury`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  test('the Actuarial console separates MODEL, ACTUAL and VARIANCE @control', async ({ page }) => {
    await actAs(page, riskStaff.email);
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
    await actAs(page, riskStaff.email);
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
      await actAs(page, staff.email);
      await page.goto('/control/actuarial');
      await expect(page, `${staff.email} must be refused Actuarial`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  /**
   * Prompt 09 milestone 5 — the governance surfaces.
   *
   * All three are read-only, and the tests assert that as an absence of
   * controls rather than as a disabled button: the corresponding server
   * operations do not exist, so there is nothing for the page to hide.
   */
  test('Policies shows one version in force per program, by database truth @control', async ({
    page,
  }) => {
    // The seed deliberately holds two `published` WARIBA_ONE rows, both with
    // retired_at NULL. Only the newest by created_at is what the engine
    // pins accounts to — a surface that read "published and not retired"
    // would claim two policies are in force at once.
    const published = await db
      .selectFrom('app.policy_versions')
      .select(['semantic_version', 'created_at'])
      .where('program', '=', 'WARIBA_ONE')
      .where('status', '=', 'published')
      .orderBy('created_at', 'desc')
      .execute();
    expect(published.length).toBeGreaterThan(1);
    const inForce = published[0]?.semantic_version as string;
    const alsoPublished = published[1]?.semantic_version as string;

    await actAs(page, riskStaff.email);
    await page.goto('/control/policies?program=WARIBA_ONE');

    await expect(page.getByRole('heading', { name: 'Policies' })).toBeVisible();
    const forceRow = page.getByRole('row').filter({ hasText: inForce });
    await expect(forceRow.getByText('En vigueur')).toBeVisible();
    const otherRow = page.getByRole('row').filter({ hasText: alsoPublished });
    await expect(otherRow.getByText('En vigueur')).toHaveCount(0);
  });

  test('a policy version is inspectable and offers no lifecycle control @control', async ({
    page,
  }) => {
    const policy = await db
      .selectFrom('app.policy_versions')
      .select(['id', 'semantic_version', 'machine_hash', 'human_document_hash'])
      .where('program', '=', 'WARIBA_PERFORMANCE')
      .where('status', '=', 'published')
      .orderBy('created_at', 'desc')
      .executeTakeFirstOrThrow();

    await actAs(page, complianceStaff.email);
    await page.goto(`/control/policies/${policy.id}`);

    for (const heading of ['Identité', 'Intégrité', 'Usage opérationnel', 'Paramètres']) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
    // Hashes are shown as stored, not recomputed for display.
    if (policy.machine_hash) {
      await expect(page.locator('body')).toContainText(policy.machine_hash);
    }

    // Read-only: no editable parameters, no save, no lifecycle transition.
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.locator('textarea')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /publier|approuver|retirer|enregistrer|modifier/i }),
    ).toHaveCount(0);
  });

  test('Policies filters server-side and drops unknown values @control', async ({ page }) => {
    await actAs(page, riskStaff.email);
    await page.goto('/control/policies');

    await page.getByLabel('Programme').selectOption('WARIBA_PERFORMANCE');
    await page.getByRole('button', { name: 'Filtrer' }).click();
    await expect(page).toHaveURL(/[?&]program=WARIBA_PERFORMANCE/);
    await expect(page.getByLabel('Programme')).toHaveValue('WARIBA_PERFORMANCE');

    await page.goto('/control/policies?program=WARIBA_SECRET&status=live&version=latest');
    await expect(page.getByText('Filtres ignorés')).toBeVisible();
    await expect(page.getByLabel('Programme')).toHaveValue('');
    await expect(page.getByLabel('Statut')).toHaveValue('');
  });

  test('support and finance are refused Policies @control', async ({ page }) => {
    const policy = await db
      .selectFrom('app.policy_versions')
      .select('id')
      .executeTakeFirstOrThrow();
    for (const staff of [supportStaff, financeStaff]) {
      await actAs(page, staff.email);
      await page.goto('/control/policies');
      await expect(page, `${staff.email} must be refused Policies`).toHaveURL(/\/control$/);
      // Direct URL entry to a detail page is refused by the same guard.
      await page.goto(`/control/policies/${policy.id}`);
      await expect(page, `${staff.email} must be refused a policy detail`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  test('Commercial reports flag state and reserve zone as separate facts @control', async ({
    page,
  }) => {
    const products = await db.selectFrom('app.products').select('code').execute();

    await actAs(page, adminStaff.email);
    await page.goto('/control/commercial');

    await expect(page.getByRole('heading', { name: 'Commercial' })).toBeVisible();
    for (const product of products) {
      await expect(
        page.getByRole('heading', { name: product.code, exact: true }),
        `${product.code} must be listed from the database`,
      ).toBeVisible();
    }

    // A flag key is an identifier. The page must name its canonical source
    // and the fact that it is a build-time constant, not a runtime service.
    await expect(page.getByText('SANDBOX_PRODUCT_FEATURE_FLAGS')).toBeVisible();
    await expect(page.getByText('Constante de build')).toBeVisible();
    // The two halves of availability are reported separately. Which way the
    // reserve half resolves is data — a fresh database with a pending payout
    // and no reserve is genuinely `critical` — so this asserts the page
    // agrees with the canonical engine rather than pinning a value.
    const reserve = await evaluateReserveStatus(db);
    await expect(page.getByText(`Zone de réserve : ${reserve.zone}`)).toBeVisible();
    const zoneBadge = reserve.zone === 'critical' ? 'Zone suspend' : 'Zone autorise';
    await expect(page.getByText(zoneBadge).first()).toBeVisible();
    await expect(page.getByText(/FOUNDER_COHORT_GATE = NON IMPLÉMENTÉ/)).toBeVisible();

    // Read-only: no canonical commercial mutation exists to surface.
    await expect(page.locator('form')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /enregistrer|modifier|retirer|activer|désactiver/i }),
    ).toHaveCount(0);
  });

  test('scoped roles are refused Commercial @control', async ({ page }) => {
    for (const staff of [supportStaff, riskStaff, financeStaff, complianceStaff]) {
      await actAs(page, staff.email);
      await page.goto('/control/commercial');
      await expect(page, `${staff.email} must be refused Commercial`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  test('Team Access lists granted authority and offers no mutation @control', async ({ page }) => {
    await actAs(page, adminStaff.email);
    await page.goto('/control/team');

    await expect(page.getByRole('heading', { name: 'Team Access' })).toBeVisible();
    // Scoped to the fixtures this suite created, not "some row exists".
    for (const staff of [riskStaff, financeStaff, complianceStaff, supportStaff]) {
      const row = page.getByRole('row').filter({ hasText: staff.email });
      await expect(row, `${staff.email} must appear in the directory`).toHaveCount(1);
      await expect(row.getByText(staff.role as string, { exact: true })).toBeVisible();
    }
    // A trader has an auth identity and no grant — identity is not authority.
    await expect(page.locator('body')).not.toContainText(trader.email);

    await expect(page.getByText('La gestion des accès est en lecture seule')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Autorité et identité historique' }),
    ).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: /changer|ajouter|retirer|supprimer|désactiver|promouvoir|réinitialiser|usurper/i,
      }),
    ).toHaveCount(0);
    // The only form is the GET filter — never a mutation.
    const forms = page.locator('form');
    await expect(forms).toHaveCount(1);
    await expect(forms.first()).toHaveAttribute('method', /get/i);
  });

  test('Team Access filters by role server-side and drops unknown roles @control', async ({
    page,
  }) => {
    await actAs(page, adminStaff.email);
    await page.goto('/control/team');

    await page.getByLabel('Rôle').selectOption('risk');
    await page.getByRole('button', { name: 'Filtrer' }).click();
    await expect(page).toHaveURL(/[?&]role=risk/);
    await expect(page.getByRole('row').filter({ hasText: riskStaff.email })).toHaveCount(1);
    await expect(page.getByRole('row').filter({ hasText: financeStaff.email })).toHaveCount(0);

    await page.goto('/control/team?role=owner');
    await expect(page.getByText('Filtres ignorés')).toBeVisible();
    await expect(page.getByLabel('Rôle')).toHaveValue('');
  });

  test('scoped roles are refused Team Access @control', async ({ page }) => {
    for (const staff of [supportStaff, riskStaff, financeStaff, complianceStaff]) {
      await actAs(page, staff.email);
      await page.goto('/control/team');
      await expect(page, `${staff.email} must be refused Team Access`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });
  /**
   * Prompt 09 milestone 6 — the Trading area, the last Prompt 09-owned
   * surface to carry a placeholder.
   */
  test('Trading inspects platform-wide orders and writes nothing @control', async ({ page }) => {
    await actAs(page, supportStaff.email);
    await page.goto('/control/trading');

    await expect(page.getByRole('heading', { name: 'Trading' })).toBeVisible();
    for (const tile of [
      'Positions ouvertes',
      'Ordres en attente actifs',
      'Rejets (24 h)',
      'Réductions en file',
    ]) {
      await expect(page.getByText(tile)).toBeVisible();
    }

    // Orders are execution evidence: nothing here replays, cancels or edits.
    await expect(
      page.getByRole('button', { name: /annuler|rejouer|modifier|supprimer|forcer/i }),
    ).toHaveCount(0);
    const forms = page.locator('form');
    await expect(forms).toHaveCount(1);
    await expect(forms.first()).toHaveAttribute('method', /get/i);
  });

  test('Trading filters server-side and drops unknown values @control', async ({ page }) => {
    await actAs(page, supportStaff.email);
    await page.goto('/control/trading');

    await page.getByLabel('Statut').selectOption('rejected');
    await page.getByRole('button', { name: 'Filtrer' }).click();
    await expect(page).toHaveURL(/[?&]status=rejected/);
    await expect(page.getByLabel('Statut')).toHaveValue('rejected');

    // BTCUSD is not a WARIBA symbol and must never reach a typed column.
    await page.goto('/control/trading?status=settled&symbol=BTCUSD&type=martingale');
    await expect(page.getByText('Filtres ignorés')).toBeVisible();
    await expect(page.getByLabel('Statut')).toHaveValue('');
    await expect(page.getByLabel('Symbole')).toHaveValue('');
  });

  test('risk, finance and compliance are refused Trading @control', async ({ page }) => {
    for (const staff of [riskStaff, financeStaff, complianceStaff]) {
      await actAs(page, staff.email);
      await page.goto('/control/trading');
      await expect(page, `${staff.email} must be refused Trading`).toHaveURL(/\/control$/);
      await page.context().clearCookies();
    }
  });

  /**
   * Prompt 09 milestone 6 — no Control area may still be a placeholder.
   *
   * Asserted as a property over the whole navigation rather than page by
   * page, so a future area added to CONTROL_AREAS without an implementation
   * fails here instead of shipping as an announcement.
   */
  test('no Control area renders a "coming in a later milestone" placeholder @control', async ({
    page,
  }) => {
    await actAs(page, adminStaff.email);
    const areas = [
      '/control',
      '/control/users',
      '/control/accounts',
      '/control/trading',
      '/control/integrity',
      '/control/payouts',
      // Phase 3.2 — the two areas Support + Contestations added. Listed here
      // for the same reason the rest are: the property this test asserts is
      // about the whole navigation, and an area missing from the list is an
      // area the property silently stops covering.
      '/control/support',
      '/control/contestations',
      '/control/market-operations',
      '/control/incidents',
      '/control/treasury',
      '/control/actuarial',
      '/control/policies',
      '/control/commercial',
      '/control/audit',
      '/control/team',
    ];
    for (const area of areas) {
      await page.goto(area);
      await expect(page, `${area} must be reachable by admin`).toHaveURL(
        new RegExp(`${area.replace(/\//g, '\\/')}$`),
      );
      await expect(page.locator('body'), `${area} must not be a placeholder`).not.toContainText(
        /arrive(nt)? avec le jalon/,
      );
    }
  });

  /**
   * Accessibility regression check — not a WCAG certification.
   *
   * Scoped to critical Control surfaces at the severity the repository
   * already gates on elsewhere (critical + serious).
   */
  test('critical Control surfaces have no critical or serious axe violations @control', async ({
    page,
  }) => {
    await actAs(page, adminStaff.email);
    for (const area of [
      '/control',
      '/control/payouts',
      '/control/incidents',
      '/control/policies',
      '/control/team',
      '/control/trading',
    ]) {
      await page.goto(area);
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious',
      );
      if (serious.length > 0) {
        console.error(
          `axe violations on ${area}:`,
          serious.map((v) => `${v.id}: ${v.description} (${v.nodes.length} node(s))`).join('\n'),
        );
      }
      expect(serious, `${area} must have no critical or serious axe violations`).toHaveLength(0);
    }
  });
});

/**
 * Prompt 09 milestone 6 — mobile usability of the read-critical Control
 * surfaces.
 *
 * Control is desktop-first and Prompt 09 does not optimise every operator
 * workflow for a phone. What must hold is that an operator paged at night
 * can still reach a surface, read its status, and not meet a page that
 * scrolls sideways. Wide tables are allowed to scroll — inside their own
 * container, never by moving the document.
 */
test.describe('WariX Control — mobile', { tag: ['@control', '@mobile'] }, () => {
  let db: Db;
  let adminStaff: StaffFixtureUser;

  test.beforeAll(async ({ browser }) => {
    db = createStaffFixtureDb();
    adminStaff = await seedStaffUser(db, 'admin');
    await captureSession(browser, adminStaff.email);
  });

  test.afterAll(async () => {
    await deleteStaffFixtureUser(db, adminStaff);
    await db.destroy();
  });

  const READ_CRITICAL_AREAS = [
    '/control',
    '/control/payouts',
    '/control/incidents',
    '/control/integrity',
    '/control/treasury',
    '/control/policies',
    '/control/team',
  ];

  test('read-critical Control surfaces never scroll the document sideways', async ({ page }) => {
    await actAs(page, adminStaff.email);
    for (const area of READ_CRITICAL_AREAS) {
      await page.goto(area);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      // A wide table scrolling inside its own container is deliberate; the
      // document scrolling is the defect — it moves the navigation and the
      // headings off-screen too.
      expect(
        overflow.scrollWidth,
        `${area} overflows horizontally (${overflow.scrollWidth}px > ${overflow.clientWidth}px)`,
      ).toBeLessThanOrEqual(overflow.clientWidth);
    }
  });

  test('Control navigation is reachable on a phone', async ({ page }) => {
    await actAs(page, adminStaff.email);
    await page.goto('/control');
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    // Every authorized area must be navigable without a pointer-only affordance.
    const nav = page.getByRole('navigation');
    await expect(nav.first()).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Payouts' }).first()).toBeVisible();
  });

  test('a payout stays inspectable on a phone', async ({ page }) => {
    await actAs(page, adminStaff.email);
    await page.goto('/control/payouts');
    await expect(page.getByRole('heading', { name: 'Payout queue' })).toBeVisible();
    // Status must survive the narrow viewport — it is the reason to open
    // this page at 3am.
    await expect(page.getByLabel('Statut')).toBeVisible();
  });

  test('governance reads stay usable on a phone', async ({ page }) => {
    await actAs(page, adminStaff.email);
    await page.goto('/control/policies');
    await expect(page.getByRole('heading', { name: 'Policies' })).toBeVisible();
    await expect(page.getByText('Lecture seule').first()).toBeVisible();

    await page.goto('/control/team');
    await expect(page.getByRole('heading', { name: 'Team Access' })).toBeVisible();
    await expect(page.getByText('La gestion des accès est en lecture seule')).toBeVisible();
  });
});
