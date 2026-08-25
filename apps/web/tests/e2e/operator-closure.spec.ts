import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { submitContestation, submitSupportTicket } from '@wariba/application';
import {
  createStaffFixtureDb,
  deleteLifecycleFixture,
  deletePayoutAccount,
  deleteStaffFixtureUser,
  seedBreachEvidence,
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

const OUT = '../../docs/04-ux/evidence/wariba-phase-3-3-operator-closure';
const DAY_MS = 24 * 60 * 60 * 1000;
const DESKTOP = { width: 1440, height: 900 };

type Page = import('@playwright/test').Page;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/hub', { timeout: 60_000 });
}

async function shoot(page: Page, name: string): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true, animations: 'disabled' });
}

async function assertNoPageOverflow(page: Page): Promise<void> {
  const state = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    return {
      clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll<HTMLElement>('body *')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            testId: element.dataset.testid ?? null,
            className: element.className.toString().slice(0, 160),
            text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 100),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter((element) => element.right > clientWidth + 1 || element.left < -1)
        .slice(-12),
    };
  });
  expect(state.scrollWidth, JSON.stringify(state, null, 2)).toBeLessThanOrEqual(state.clientWidth);
}

async function assertNoCriticalOrSeriousA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const violations = results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
  expect(violations, JSON.stringify(violations, null, 2)).toHaveLength(0);
}

/**
 * Evidence-only state for the Evaluation attached to the real payout fixture.
 *
 * Production still owns every calculation. The fixture writes the two
 * finalized day records and ledger entries the canonical risk projection
 * reads, then poses the already-supported terminal lifecycle. No application
 * package can import this code, and teardown removes every synthetic row.
 */
async function prepareCompletedPassReview(db: Db, fixture: PayoutAccountFixture): Promise<void> {
  const account = await db
    .selectFrom('app.trading_accounts')
    .select(['policy_version_id', 'nominal_balance', 'currency'])
    .where('id', '=', fixture.evaluationAccountId)
    .executeTakeFirstOrThrow();
  const now = new Date();
  const days = [
    {
      instant: new Date(now.getTime() - 2 * DAY_MS),
      sod: '10000.00',
      eod: '10500.00',
      floorBefore: '9000.00',
      floorAfter: '9500.00',
    },
    {
      instant: new Date(now.getTime() - DAY_MS),
      sod: '10500.00',
      eod: '11000.00',
      floorBefore: '9500.00',
      floorAfter: '10000.00',
    },
  ];

  for (const day of days) {
    await db
      .insertInto('app.trading_ledger_entries')
      .values({
        account_id: fixture.evaluationAccountId,
        entry_type: 'realized_pnl',
        amount: '500.00',
        currency: account.currency,
        reference_type: 'operator_closure_evidence_fixture',
        reference_id: randomUUID(),
        occurred_at: day.instant,
      })
      .execute();
    await db
      .insertInto('app.account_daily_snapshots')
      .values({
        account_id: fixture.evaluationAccountId,
        trading_day: day.instant.toISOString().slice(0, 10),
        policy_version_id: account.policy_version_id,
        status: 'finalized',
        sod_balance: day.sod,
        sod_equity: day.sod,
        program_sod_balance: day.sod,
        daily_reference: day.sod,
        maximum_loss_floor_before: day.floorBefore,
        eod_balance: day.eod,
        eod_equity: day.eod,
        program_eod_balance: day.eod,
        maximum_loss_floor_after: day.floorAfter,
        highest_eod_balance_after: day.eod,
        highest_program_eod_balance_after: day.eod,
        realized_net_profit_for_day: '500.00',
        eligible_realized_net_profit_for_day: '500.00',
        finalized_at: day.instant,
      })
      .execute();
  }

  await db
    .updateTable('app.trading_accounts')
    .set({ status: 'passed', updated_at: now })
    .where('id', '=', fixture.evaluationAccountId)
    .execute();
  await db
    .insertInto('app.account_state_transitions')
    .values([
      {
        account_id: fixture.evaluationAccountId,
        from_status: 'active',
        to_status: 'pass_pending',
        reason: 'evaluation_target_reached',
        occurred_at: new Date(now.getTime() - 60_000),
      },
      {
        account_id: fixture.evaluationAccountId,
        from_status: 'pass_pending',
        to_status: 'passed',
        reason: 'evaluation_pass_finalized',
        occurred_at: now,
      },
    ])
    .execute();
}

test.describe('@critical @operator-closure Phase 3.3 evidence', () => {
  let db: Db;
  let admin: StaffFixtureUser;
  let support: StaffFixtureUser;
  let payout: PayoutAccountFixture | null = null;
  let breached: LifecycleFixture | null = null;

  test.beforeAll(async () => {
    db = createStaffFixtureDb();
    admin = await seedStaffUser(db, 'admin');
    support = await seedStaffUser(db, 'support');
  });

  test.afterAll(async () => {
    if (breached) await deleteLifecycleFixture(lifecycleEnv(), breached);
    if (payout) await deletePayoutAccount(lifecycleEnv(), payout);
    await deleteStaffFixtureUser(db, support);
    await deleteStaffFixtureUser(db, admin);
    await db.destroy();
  });

  test('captures real empty, populated, authorized, stale and trader states', async ({
    browser,
  }) => {
    test.setTimeout(420_000);
    const adminContext = await browser.newContext({ viewport: DESKTOP });
    const supportContext = await browser.newContext({ viewport: DESKTOP });
    const payoutContext = await browser.newContext({ viewport: DESKTOP });
    const breachedContext = await browser.newContext({ viewport: DESKTOP });

    try {
      const adminPage = await adminContext.newPage();
      await signIn(adminPage, admin.email, STAFF_E2E_TEST_PASSWORD);
      await adminPage.goto('/control');
      await expect(adminPage.getByRole('heading', { name: 'Vue d’ensemble' })).toBeVisible();
      await shoot(adminPage, '02-control-overview-empty-1440');

      payout = await seedPayoutAccount(lifecycleEnv(), { kycVerified: false });
      breached = await seedLifecycleFixture(lifecycleEnv(), 'breached');
      const breachEvidence = await seedBreachEvidence(db, {
        accountId: breached.accountId as string,
      });
      await prepareCompletedPassReview(db, payout);

      const supportCase = await submitSupportTicket(db, {
        userId: breached.userId,
        accountId: breached.accountId,
        category: 'breach',
        subject: 'Comprendre la décision sur mon compte',
        body: 'Je souhaite comprendre les éléments qui ont conduit à la fin de mon évaluation.',
        correlationId: randomUUID(),
      });
      const contestation = await submitContestation(db, {
        userId: breached.userId,
        accountId: breached.accountId as string,
        targetId: breachEvidence.riskViolationId,
        reasonCategory: 'rule_misapplied',
        traderStatement:
          'Le plancher de perte maximale affiché avant la décision ne correspondait pas à mon relevé.',
        correlationId: randomUUID(),
      });

      const payoutPage = await payoutContext.newPage();
      await signIn(payoutPage, payout.email, payout.password);
      await payoutPage.goto('/verification-identite');
      await payoutPage.getByTestId('kyc-action').click();
      await payoutPage.waitForURL('**/verification-identite?demande=recue');
      await expect(
        payoutPage.getByRole('status').getByText('Demande reçue', { exact: true }),
      ).toBeVisible();

      const identity = await db
        .selectFrom('app.identity_review_cases')
        .select('public_id')
        .where('account_id', '=', payout.accountId)
        .executeTakeFirstOrThrow();

      const supportPage = await supportContext.newPage();
      await signIn(supportPage, support.email, STAFF_E2E_TEST_PASSWORD);
      await supportPage.goto(`/control/support/${supportCase.publicId}`);
      await expect(supportPage.getByTestId('control-ticket-assign')).toBeVisible();

      await adminPage.goto(`/control/support/${supportCase.publicId}`);
      await assertNoCriticalOrSeriousA11y(adminPage);
      await adminPage.getByTestId('control-ticket-assign').click();
      await expect(adminPage.getByTestId('control-ticket-assign')).toContainText('Affectée à vous');
      await supportPage.getByTestId('control-ticket-assign').click();
      await expect(supportPage.getByTestId('control-ticket-error')).toContainText(
        'Ce dossier a changé',
      );
      await shoot(supportPage, '12-control-stale-case-1440');

      await adminPage
        .getByTestId('control-reply-body')
        .fill(
          'Nous examinons les éléments enregistrés. Aucun événement financier ne sera modifié.',
        );
      await adminPage.getByTestId('control-reply-request-info').click();
      await expect(adminPage.getByTestId('control-ticket-message')).toHaveCount(2);
      await shoot(adminPage, '08-control-support-case-1440');
      await adminPage.goto('/control/support');
      await expect(adminPage.getByRole('link', { name: supportCase.publicId })).toBeVisible();
      await shoot(adminPage, '07-control-support-queue-1440');

      await adminPage.goto(`/control/identity/${identity.public_id}`);
      await assertNoCriticalOrSeriousA11y(adminPage);
      await adminPage.getByRole('button', { name: 'Prendre en charge' }).click();
      await expect(adminPage.getByRole('button', { name: 'Affectée à vous' })).toBeVisible();
      await adminPage
        .getByLabel('Motif interne de la décision')
        .fill('La référence externe doit encore être rapprochée du compte Performance.');
      await adminPage
        .getByLabel('Message visible par le trader')
        .fill('Votre demande est en cours d’examen. Aucune action n’est requise pour le moment.');
      await adminPage.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(adminPage.getByText('Examen mis à jour')).toBeVisible();
      await shoot(adminPage, '06-control-identity-case-1440');
      await adminPage.goto('/control/identity');
      await expect(adminPage.getByRole('link', { name: identity.public_id })).toBeVisible();
      await shoot(adminPage, '05-control-identity-queue-1440');

      await adminPage.goto(`/control/contestations/${contestation.contestationPublicId}`);
      await assertNoCriticalOrSeriousA11y(adminPage);
      await adminPage.getByTestId('contestation-assign').click();
      await expect(adminPage.getByTestId('contestation-assign')).toContainText('Affectée à vous');
      await adminPage
        .getByTestId('contestation-decision-reason')
        .fill('Les preuves d’origine sont conservées pendant l’examen du dossier.');
      await adminPage.getByTestId('contestation-take-review').click();
      await expect(adminPage.getByText('Prise en examen')).toBeVisible();
      await shoot(adminPage, '10-control-contestation-case-1440');
      await adminPage.goto('/control/contestations');
      await expect(
        adminPage.getByRole('link', { name: contestation.contestationPublicId }),
      ).toBeVisible();
      await shoot(adminPage, '09-control-contestations-queue-1440');

      await supportPage.goto(`/control/contestations/${contestation.contestationPublicId}`);
      await expect(supportPage.getByText(/Lecture seule/)).toBeVisible();
      await expect(supportPage.getByTestId('contestation-decision-confirm')).toHaveCount(0);
      await shoot(supportPage, '11-control-permission-read-only-1440');

      await adminPage.goto('/control/pass-reviews');
      await expect(adminPage.getByRole('link', { name: payout.accountPublicId })).toHaveCount(0);
      const evaluation = await db
        .selectFrom('app.trading_accounts')
        .select('public_id')
        .where('id', '=', payout.evaluationAccountId)
        .executeTakeFirstOrThrow();
      await expect(adminPage.getByRole('link', { name: evaluation.public_id })).toBeVisible();
      await shoot(adminPage, '03-control-pass-review-queue-1440');
      await adminPage.goto(`/control/pass-reviews/${evaluation.public_id}`);
      await expect(adminPage.getByText('Le passage est déjà finalisé')).toBeVisible();
      await assertNoCriticalOrSeriousA11y(adminPage);
      await shoot(adminPage, '04-control-pass-review-case-1440');

      await adminPage.goto('/control');
      await expect(adminPage.getByText('Décisions opérateur récentes')).toBeVisible();
      await assertNoCriticalOrSeriousA11y(adminPage);
      await shoot(adminPage, '01-control-overview-populated-1440');
      await adminPage.setViewportSize({ width: 1024, height: 768 });
      await assertNoPageOverflow(adminPage);
      await shoot(adminPage, '17-control-overview-1024');

      await payoutPage.setViewportSize({ width: 1440, height: 900 });
      await payoutPage.goto(`/hub?account=${payout.evaluationAccountId}`);
      await expect(payoutPage.getByText('Évaluation réussie').first()).toBeVisible();
      await assertNoCriticalOrSeriousA11y(payoutPage);
      await shoot(payoutPage, '13-trader-pass-review-1440');
      await payoutPage.goto('/verification-identite');
      await expect(payoutPage.getByTestId('kyc-state')).toContainText('Vérification requise');
      await expect(payoutPage.getByTestId('identity-review-state')).toContainText(
        'En cours d’examen',
      );
      await assertNoCriticalOrSeriousA11y(payoutPage);
      await shoot(payoutPage, '14-trader-identity-1440');

      const breachedPage = await breachedContext.newPage();
      await signIn(breachedPage, breached.email, breached.password);
      await breachedPage.goto(`/support/demandes/${supportCase.publicId}`);
      await expect(breachedPage.getByTestId('ticket-next-action')).toContainText(
        'besoin d’une précision',
      );
      await assertNoCriticalOrSeriousA11y(breachedPage);
      await shoot(breachedPage, '15-trader-support-1440');
      await breachedPage.goto(`/support/contestations/${contestation.contestationPublicId}`);
      await expect(breachedPage.getByTestId('contestation-next-action')).toContainText(
        'examine la décision',
      );
      await assertNoCriticalOrSeriousA11y(breachedPage);
      await shoot(breachedPage, '16-trader-contestation-1440');

      for (const width of [390, 320]) {
        await payoutPage.setViewportSize({ width, height: width === 390 ? 844 : 568 });
        await payoutPage.goto(`/hub?account=${payout.evaluationAccountId}`);
        await assertNoPageOverflow(payoutPage);
        await shoot(payoutPage, `18-trader-pass-review-${width}`);
        await payoutPage.goto('/verification-identite');
        await assertNoPageOverflow(payoutPage);
        await shoot(payoutPage, `19-trader-identity-${width}`);

        await breachedPage.setViewportSize({ width, height: width === 390 ? 844 : 568 });
        await breachedPage.goto(`/support/demandes/${supportCase.publicId}`);
        await assertNoPageOverflow(breachedPage);
        await shoot(breachedPage, `20-trader-support-${width}`);
        await breachedPage.goto(`/support/contestations/${contestation.contestationPublicId}`);
        await assertNoPageOverflow(breachedPage);
        await shoot(breachedPage, `21-trader-contestation-${width}`);
      }
    } finally {
      await adminContext.close();
      await supportContext.close();
      await payoutContext.close();
      await breachedContext.close();
    }
  });
});
