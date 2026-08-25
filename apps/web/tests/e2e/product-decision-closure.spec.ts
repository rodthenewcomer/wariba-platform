import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { submitContestation } from '@wariba/application';
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

const OUT = '../../docs/04-ux/evidence/wariba-phase-3-3-product-decision-closure';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const DAY_MS = 24 * 60 * 60 * 1000;

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
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
}

async function assertAccessible(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    ),
  ).toHaveLength(0);
}

async function assertNoOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function assertTraderCopyHasNoInternalTerms(page: Page): Promise<void> {
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(
    /\b(policy|server|state machine|remediation|compensating action|breach|correlation|reason code|CORRECTION_REQUIRED|FINANCE_COMPLIANCE_REVIEW|source_contestation_id|decision_corrected)\b/i,
  );
}

async function preparePassedEvaluation(db: Db, fixture: PayoutAccountFixture): Promise<string> {
  const account = await db
    .selectFrom('app.trading_accounts')
    .select(['public_id', 'policy_version_id', 'currency'])
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
        reference_type: 'product_decision_closure_evidence',
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
  return account.public_id;
}

test.describe('@product-decision-closure Phase 3.3 locked decisions', () => {
  let db: Db;
  let risk: StaffFixtureUser;
  let payout: PayoutAccountFixture;
  let breached: LifecycleFixture;
  let evaluationPublicId: string;
  let contestationPublicId: string;

  test.beforeAll(async () => {
    test.setTimeout(90_000);
    db = createStaffFixtureDb();
    risk = await seedStaffUser(db, 'risk');
    payout = await seedPayoutAccount(lifecycleEnv());
    evaluationPublicId = await preparePassedEvaluation(db, payout);
    breached = await seedLifecycleFixture(lifecycleEnv(), 'breached');
    const evidence = await seedBreachEvidence(db, { accountId: breached.accountId as string });
    contestationPublicId = (
      await submitContestation(db, {
        userId: breached.userId,
        accountId: breached.accountId as string,
        targetId: evidence.riskViolationId,
        reasonCategory: 'rule_misapplied',
        traderStatement: 'La décision ne correspond pas aux éléments enregistrés sur mon compte.',
        correlationId: randomUUID(),
      })
    ).contestationPublicId;
  });

  test.afterAll(async () => {
    await db.deleteFrom('audit.audit_events').where('actor_id', '=', risk.userId).execute();
    await db
      .deleteFrom('app.staff_action_rate_limits')
      .where('actor_id', '=', risk.userId)
      .execute();
    await db
      .deleteFrom('app.pass_review_operator_states')
      .where('account_id', '=', payout.evaluationAccountId)
      .execute();
    const replacements = await db
      .selectFrom('app.trading_accounts')
      .select('id')
      .where('user_id', '=', breached.userId)
      .where('source_contestation_id', 'is not', null)
      .execute();
    for (const replacement of replacements) {
      await db
        .deleteFrom('app.account_state_transitions')
        .where('account_id', '=', replacement.id)
        .execute();
      await db
        .deleteFrom('app.trading_ledger_entries')
        .where('account_id', '=', replacement.id)
        .execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', replacement.id).execute();
      await db.deleteFrom('app.trading_accounts').where('id', '=', replacement.id).execute();
    }
    await deleteLifecycleFixture(lifecycleEnv(), breached);
    await deletePayoutAccount(lifecycleEnv(), payout);
    await deleteStaffFixtureUser(db, risk);
    await db.destroy();
  });

  test('captures the six affected states and exercises both authorized workflows', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    const controlContext = await browser.newContext({ viewport: DESKTOP });
    const traderContext = await browser.newContext({ viewport: DESKTOP });
    try {
      const control = await controlContext.newPage();
      await signIn(control, risk.email, STAFF_E2E_TEST_PASSWORD);
      await control.goto(`/control/pass-reviews/${evaluationPublicId}`);
      await expect(control.getByText('Le passage est déjà finalisé')).toBeVisible();
      await expect(control.getByText('Finalisée — compte Performance créé')).toBeVisible();
      await assertAccessible(control);
      await shoot(control, '01-pass-review-detail-desktop');
      await control
        .getByTestId('pass-review-action-reason')
        .fill('Les résultats et la création automatique ont été contrôlés.');
      await control.getByTestId('pass-review-action-confirm').click();
      await expect(control.getByText('Revue effectuée').first()).toBeVisible();

      await control.goto(`/control/contestations/${contestationPublicId}`);
      await control.getByTestId('contestation-decision-select').selectOption('correction_required');
      await control
        .getByTestId('contestation-decision-reason')
        .fill('Une erreur WARIBA a affecté la décision terminale.');
      await control.getByTestId('contestation-decision-confirm').click();
      await expect(control.getByTestId('contestation-remediation')).toBeVisible();
      await assertAccessible(control);
      await shoot(control, '02-contestation-correction-required');

      const trader = await traderContext.newPage();
      await signIn(trader, breached.email, breached.password);
      await trader.goto(`/support/contestations/${contestationPublicId}`);
      await expect(trader.getByText('Correction en préparation').first()).toBeVisible();
      await expect(trader.getByTestId('contestation-next-action')).toContainText(
        'Votre historique reste conservé',
      );
      await assertTraderCopyHasNoInternalTerms(trader);
      await assertAccessible(trader);
      await shoot(trader, '04-trader-correction-in-preparation');

      await control.bringToFront();
      await control
        .getByTestId('contestation-remediation-reason')
        .fill('Création du compte de remplacement autorisé par la décision.');
      await control.getByTestId('contestation-remediation-confirm').click();
      await expect(control.getByTestId('contestation-remediation-completed')).toBeVisible();
      await assertAccessible(control);
      await shoot(control, '03-contestation-correction-completed');

      await trader.bringToFront();
      await trader.reload();
      await expect(trader.getByText('Décision corrigée').first()).toBeVisible();
      await expect(trader.getByTestId('contestation-replacement-account-link')).toBeVisible();
      await expect(trader.getByText(/Compte de remplacement : EVAL-/)).toBeVisible();
      await assertTraderCopyHasNoInternalTerms(trader);
      await assertAccessible(trader);
      await shoot(trader, '05-trader-replacement-issued');

      await trader.setViewportSize(MOBILE);
      await trader.reload();
      await assertNoOverflow(trader);
      await assertAccessible(trader);
      await shoot(trader, '06-mobile-390-trader-correction-state');
    } finally {
      await controlContext.close();
      await traderContext.close();
    }
  });
});
