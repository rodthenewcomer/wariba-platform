import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  activatePerformanceAccountInTransaction,
  createStaffFixtureDb,
  deleteLifecycleFixture,
  deletePayoutAccount,
  deleteStaffFixtureUser,
  seedLifecycleFixture,
  seedPayoutAccount,
  seedStaffUser,
  STAFF_E2E_TEST_PASSWORD,
  type Db,
  type LifecycleFixture,
  type PayoutAccountFixture,
  type StaffFixtureUser,
} from '@wariba/test-utils';
import { lifecycleEnv } from './fixtures';

const OUT = '../../docs/04-ux/evidence/wariba-phase-3-3-1-evaluation-performance-handoff';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const MOBILE_MIN = { width: 320, height: 760 };

type Page = import('@playwright/test').Page;
type Browser = import('@playwright/test').Browser;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), null, {
    timeout: 60_000,
  });
}

async function screenshot(page: Page, filename: string, fullPage = true): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({
    path: `${OUT}/${filename}.png`,
    fullPage,
    animations: 'disabled',
  });
}

async function assertNoOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function assertAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    ),
  ).toHaveLength(0);
}

async function newSignedPage(
  browser: Browser,
  fixture: Pick<LifecycleFixture | PayoutAccountFixture, 'email' | 'password'>,
  viewport = DESKTOP,
): Promise<{ context: import('@playwright/test').BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await signIn(page, fixture.email, fixture.password);
  return { context, page };
}

test.describe('@phase-3-3-1 Evaluation to Performance handoff', () => {
  let db: Db;
  let objective: LifecycleFixture;
  let finalizing: LifecycleFixture;
  let provisioning: LifecycleFixture;
  let emptyPerformanceOwner: LifecycleFixture;
  let emptyPerformance: { id: string; publicId: string };
  let populated: PayoutAccountFixture;
  let operator: StaffFixtureUser;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    db = createStaffFixtureDb();
    // GoTrue's local admin endpoint is deliberately exercised serially here.
    // Parallel creation occasionally returned a user whose password was not
    // immediately usable, which made the visual gate test auth timing rather
    // than the lifecycle under review.
    objective = await seedLifecycleFixture(lifecycleEnv(), 'objective_reached');
    finalizing = await seedLifecycleFixture(lifecycleEnv(), 'under_review');
    provisioning = await seedLifecycleFixture(lifecycleEnv(), 'passed');
    emptyPerformanceOwner = await seedLifecycleFixture(lifecycleEnv(), 'passed');
    populated = await seedPayoutAccount(lifecycleEnv());
    // `account.view` belongs to Support in the current RBAC table. The
    // lifecycle linkage is read-only account context, so use that minimum
    // authority rather than an admin/super-admin fixture.
    operator = await seedStaffUser(db, 'support');
    emptyPerformance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: emptyPerformanceOwner.accountId as string,
    });
    await db
      .insertInto('app.account_state_transitions')
      .values([
        {
          account_id: emptyPerformanceOwner.accountId as string,
          from_status: 'active',
          to_status: 'pass_pending',
          reason: 'profit_target_reached',
          occurred_at: new Date(Date.now() - 2_000),
        },
        {
          account_id: emptyPerformanceOwner.accountId as string,
          from_status: 'pass_pending',
          to_status: 'passed',
          reason: 'evaluation_pass_finalized',
          occurred_at: new Date(Date.now() - 1_000),
        },
      ])
      .execute();
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    await db.deleteFrom('audit.audit_events').where('actor_id', '=', operator.userId).execute();
    await deleteStaffFixtureUser(db, operator);
    await deletePayoutAccount(lifecycleEnv(), populated);
    await deleteLifecycleFixture(lifecycleEnv(), objective);
    await deleteLifecycleFixture(lifecycleEnv(), finalizing);
    await deleteLifecycleFixture(lifecycleEnv(), provisioning);
    await deleteLifecycleFixture(lifecycleEnv(), emptyPerformanceOwner);
    await db.destroy();
  });

  test('runs the complete trader handoff, isolation and WariX context', async ({ browser }) => {
    test.setTimeout(360_000);

    const objectiveSession = await newSignedPage(browser, objective);
    const finalizingSession = await newSignedPage(browser, finalizing);
    const provisioningSession = await newSignedPage(browser, provisioning);
    const performanceSession = await newSignedPage(browser, emptyPerformanceOwner);
    const populatedSession = await newSignedPage(browser, populated);
    const controlContext = await browser.newContext({ viewport: DESKTOP });
    const control = await controlContext.newPage();

    try {
      await objectiveSession.page.goto(`/hub?account=${objective.accountId}`);
      await expect(objectiveSession.page.getByTestId('lifecycle-banner')).toHaveAttribute(
        'data-state',
        'objective_reached',
      );
      await expect(
        objectiveSession.page.getByText('Objectif atteint', { exact: true }).first(),
      ).toBeVisible();
      await expect(
        objectiveSession.page.getByRole('link', { name: 'Ouvrir WariX' }).first(),
      ).toHaveAttribute('href', `/trade?account=${objective.accountId}`);
      await assertAccessible(objectiveSession.page);
      await screenshot(objectiveSession.page, '01-objective-reached-1440');

      await finalizingSession.page.goto(`/hub?account=${finalizing.accountId}`);
      await expect(finalizingSession.page.getByTestId('lifecycle-banner')).toHaveAttribute(
        'data-state',
        'under_review',
      );
      await expect(
        finalizingSession.page.getByText(
          'La session est clôturée. Nous vérifions le respect des règles.',
        ),
      ).toBeVisible();
      await assertAccessible(finalizingSession.page);
      await screenshot(finalizingSession.page, '02-finalization-review-1440');

      await provisioningSession.page.goto(`/hub?account=${provisioning.accountId}`);
      await expect(provisioningSession.page.getByTestId('performance-handoff')).toHaveAttribute(
        'data-stage',
        'performance_provisioning',
      );
      await screenshot(provisioningSession.page, '03-evaluation-passed-1440');
      await provisioningSession.page.goto(
        `/comptes/${provisioning.accountPublicId}/bienvenue-performance`,
      );
      await expect(provisioningSession.page.getByText('toujours en préparation')).toBeVisible();
      await screenshot(provisioningSession.page, '04-performance-provisioning-1440');

      const performance = performanceSession.page;
      await performance.goto(`/trade?account=${emptyPerformance.id}`);
      await expect(performance.getByTestId('warix-gate')).toBeVisible();
      await expect(performance.getByRole('link', { name: 'Voir mes règles' })).toHaveAttribute(
        'href',
        `/comptes/${emptyPerformance.publicId}/bienvenue-performance`,
      );
      await performance.setViewportSize(MOBILE);
      await assertNoOverflow(performance);
      await screenshot(performance, '20-warix-gate-390');
      await performance.setViewportSize(DESKTOP);

      await performance.goto(`/comptes/${emptyPerformance.publicId}/bienvenue-performance`);
      await expect(performance.getByTestId('performance-handoff')).toHaveAttribute(
        'data-stage',
        'rules_onboarding',
      );
      await expect(performance.getByText(emptyPerformance.publicId).first()).toBeVisible();
      await assertAccessible(performance);
      await screenshot(performance, '06-one-performance-comparison-1440');
      await performance
        .getByTestId('performance-buffer')
        .screenshot({ path: `${OUT}/07-buffer-visual-1440.png`, animations: 'disabled' });
      await performance
        .getByTestId('performance-payout-path')
        .screenshot({ path: `${OUT}/08-payout-path-1440.png`, animations: 'disabled' });

      await performance.setViewportSize(MOBILE);
      await assertNoOverflow(performance);
      await screenshot(performance, '18-performance-onboarding-390');
      await performance
        .getByTestId('performance-payout-path')
        .screenshot({ path: `${OUT}/21-payout-path-390.png`, animations: 'disabled' });

      await performance.setViewportSize(MOBILE_MIN);
      await assertNoOverflow(performance);
      await screenshot(performance, '26-performance-onboarding-320');

      await performance.setViewportSize(DESKTOP);

      await performance.getByRole('checkbox').check();
      await performance.getByTestId('performance-rules-submit').click();
      await performance.waitForURL('**/bienvenue-performance?etat=pret');
      await expect(performance.getByTestId('performance-handoff')).toHaveAttribute(
        'data-stage',
        'performance_ready',
      );
      await performance.evaluate(() => window.scrollTo(0, 0));
      await screenshot(performance, '05-performance-ready-1440');

      await performance.goto(`/hub?account=${emptyPerformance.id}`);
      await expect(performance.getByTestId('payout-summary')).toBeVisible();
      await screenshot(performance, '09-performance-dashboard-empty-1440');

      await populatedSession.page.goto(`/hub?account=${populated.accountId}`);
      await expect(populatedSession.page.getByTestId('payout-summary')).toBeVisible();
      await screenshot(populatedSession.page, '10-performance-dashboard-populated-1440');

      await performance.goto('/comptes');
      await expect(
        performance.getByText(`Issu de ${emptyPerformanceOwner.accountPublicId}`),
      ).toBeVisible();
      await expect(
        performance.getByText(`Compte créé : ${emptyPerformance.publicId}`),
      ).toBeVisible();
      await screenshot(performance, '11-accounts-parent-child-1440');

      await performance.goto(`/hub?account=${emptyPerformanceOwner.accountId}`);
      await expect(
        performance.getByText('Évaluation réussie', { exact: true }).first(),
      ).toBeVisible();
      await expect(performance.getByText(emptyPerformance.publicId).first()).toBeVisible();
      await screenshot(performance, '12-evaluation-archived-1440');

      await performance.goto(`/trade?account=${emptyPerformance.id}`);
      await expect(performance.getByTestId('workstation-shell')).toBeVisible({ timeout: 60_000 });
      await expect(performance.getByTestId('chart-history-status')).toHaveAttribute(
        'data-history-status',
        'ready',
        { timeout: 30_000 },
      );
      await expect(
        performance.getByTestId('workstation-account-switcher').locator('summary'),
      ).toHaveAttribute('aria-label', new RegExp(`Compte actif.*${emptyPerformance.publicId}`));
      await screenshot(performance, '13-warix-performance-context-1440', false);

      await performance.goto(`/trade?account=${emptyPerformanceOwner.accountId}`);
      await expect(performance.getByTestId('warix-gate')).toBeVisible();
      await expect(performance.getByText('Votre évaluation est réussie')).toBeVisible();

      await performance.goto(`/comptes/${emptyPerformance.publicId}/regles`);
      await expect(performance.getByTestId('account-rules-page')).toBeVisible();
      await expect(performance.getByText(/Version 1\./)).toBeVisible();
      await assertAccessible(performance);
      await screenshot(performance, '14-account-rules-version-1440');

      const foreign = objectiveSession.page;
      await foreign.goto(`/comptes/${emptyPerformance.publicId}/bienvenue-performance`);
      await expect(foreign.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();

      await signIn(control, operator.email, STAFF_E2E_TEST_PASSWORD);
      await control.goto(`/control/accounts/${emptyPerformance.id}`);
      await expect(control.getByText('Évaluation d’origine')).toBeVisible();
      await expect(
        control.getByText(emptyPerformanceOwner.accountPublicId as string),
      ).toBeVisible();
      await assertAccessible(control);
      await screenshot(control, '15-control-lifecycle-link-1440');

      await objectiveSession.page.setViewportSize(MOBILE);
      await objectiveSession.page.goto(`/hub?account=${objective.accountId}`);
      await assertNoOverflow(objectiveSession.page);
      await screenshot(objectiveSession.page, '16-objective-reached-390');

      await provisioningSession.page.setViewportSize(MOBILE);
      await provisioningSession.page.goto(`/hub?account=${provisioning.accountId}`);
      await assertNoOverflow(provisioningSession.page);
      await screenshot(provisioningSession.page, '17-evaluation-passed-390');

      await performance.setViewportSize(MOBILE);
      await performance.goto(`/comptes/${emptyPerformance.publicId}/regles`);
      await assertNoOverflow(performance);
      await screenshot(performance, '19-rules-version-390');
      await performance.goto(`/comptes/${emptyPerformance.publicId}/bienvenue-performance`);
      await screenshot(performance, '22-performance-ready-390');
      await performance.goto(`/hub?account=${emptyPerformance.id}`);
      await screenshot(performance, '23-performance-dashboard-390');
      await performance.goto('/comptes');
      await screenshot(performance, '24-accounts-parent-child-390');

      await performance.setViewportSize(MOBILE_MIN);
      await performance.goto(`/comptes/${emptyPerformance.publicId}/bienvenue-performance`);
      await assertNoOverflow(performance);
      await screenshot(performance, '25-performance-ready-320');
      await performance.goto(`/hub?account=${emptyPerformance.id}`);
      await assertNoOverflow(performance);
      await screenshot(performance, '27-performance-dashboard-320');
      await performance.goto(`/comptes/${emptyPerformance.publicId}/bienvenue-performance`);
      await performance.getByTestId('performance-ready-actions').scrollIntoViewIfNeeded();
      await screenshot(performance, '28-cta-not-overlapped-320', false);
      await performance.goto(`/hub?account=${emptyPerformanceOwner.accountId}`);
      await assertNoOverflow(performance);
      await screenshot(performance, '29-evaluation-archived-320');
    } finally {
      await objectiveSession.context.close();
      await finalizingSession.context.close();
      await provisioningSession.context.close();
      await performanceSession.context.close();
      await populatedSession.context.close();
      await controlContext.close();
    }
  });
});
