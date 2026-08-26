import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createDbClient,
  loadContestationForUser,
  loadControlPassReviewCase,
  openContestation,
  type Db,
} from '@wariba/database';
import {
  deleteLifecycleFixture,
  deleteStaffFixtureUser,
  seedBreachEvidence,
  seedLifecycleFixture,
  seedStaffUser,
  type LifecycleFixture,
  type StaffFixtureUser,
} from '@wariba/test-utils';
import { recordPassReviewOperationalState } from '../src/control-pass-review';
import {
  executeContestationReplacement,
  recordContestationDecision,
} from '../src/control-support-actions';

const environment = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
};
const describeIfDb = Object.values(environment).every(Boolean) ? describe : describe.skip;

describeIfDb('Phase 3.3 locked product decisions', () => {
  let db: Db;
  let risk: StaffFixtureUser;
  let support: StaffFixtureUser;
  let passed: LifecycleFixture;
  let breached: LifecycleFixture;
  let financial: LifecycleFixture;

  async function removeReplacementAccounts(userId: string) {
    const replacements = await db
      .selectFrom('app.trading_accounts')
      .select('id')
      .where('user_id', '=', userId)
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
  }

  beforeAll(async () => {
    db = createDbClient(environment.databaseUrl);
    risk = await seedStaffUser(db, 'risk');
    support = await seedStaffUser(db, 'support');
    passed = await seedLifecycleFixture(environment, 'passed');
    breached = await seedLifecycleFixture(environment, 'breached');
    financial = await seedLifecycleFixture(environment, 'breached');
  }, 60_000);

  afterAll(async () => {
    await db.deleteFrom('audit.audit_events').where('actor_id', '=', risk.userId).execute();
    await db.deleteFrom('audit.audit_events').where('actor_id', '=', support.userId).execute();
    if (passed.accountId) {
      await db
        .deleteFrom('app.pass_review_operator_states')
        .where('account_id', '=', passed.accountId)
        .execute();
    }
    await removeReplacementAccounts(breached.userId);
    await removeReplacementAccounts(financial.userId);
    await deleteLifecycleFixture(environment, passed);
    await deleteLifecycleFixture(environment, breached);
    await deleteLifecycleFixture(environment, financial);
    await deleteStaffFixtureUser(db, risk);
    await deleteStaffFixtureUser(db, support);
    await db.destroy();
  });

  it('records only post-result review state and leaves the pass and financial rows unchanged', async () => {
    const accountId = passed.accountId as string;
    const beforeAccount = await db
      .selectFrom('app.trading_accounts')
      .selectAll()
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    const beforeLedger = await db
      .selectFrom('app.trading_ledger_entries')
      .selectAll()
      .where('account_id', '=', accountId)
      .execute();
    const authoritative = await loadControlPassReviewCase(db, {
      accountPublicId: passed.accountPublicId as string,
    });
    expect(authoritative?.lifecycleStatus).toBe('passed');

    await recordPassReviewOperationalState(db, {
      accountPublicId: passed.accountPublicId as string,
      staffUserId: risk.userId,
      staffRole: 'risk',
      status: 'reviewed',
      reason: 'Les résultats canoniques et la création automatique ont été contrôlés.',
      expectedVersion: 0,
      correlationId: randomUUID(),
    });
    await expect(
      recordPassReviewOperationalState(db, {
        accountPublicId: passed.accountPublicId as string,
        staffUserId: risk.userId,
        staffRole: 'risk',
        status: 'integrity_escalated',
        reason: 'Soumission depuis une version devenue obsolète.',
        expectedVersion: 0,
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ name: 'OperatorCaseStaleError' });
    await recordPassReviewOperationalState(db, {
      accountPublicId: passed.accountPublicId as string,
      staffUserId: risk.userId,
      staffRole: 'risk',
      status: 'integrity_escalated',
      reason: 'Un contrôle d’intégrité complémentaire est nécessaire.',
      expectedVersion: 1,
      correlationId: randomUUID(),
    });

    expect(
      await db
        .selectFrom('app.trading_accounts')
        .selectAll()
        .where('id', '=', accountId)
        .executeTakeFirstOrThrow(),
    ).toEqual(beforeAccount);
    expect(
      await db
        .selectFrom('app.trading_ledger_entries')
        .selectAll()
        .where('account_id', '=', accountId)
        .execute(),
    ).toEqual(beforeLedger);
    const state = await db
      .selectFrom('app.pass_review_operator_states')
      .select(['status', 'version'])
      .where('account_id', '=', accountId)
      .executeTakeFirstOrThrow();
    expect(state).toEqual({ status: 'integrity_escalated', version: 2 });
    const actions = await db
      .selectFrom('audit.audit_events')
      .select('action')
      .where('target_type', '=', 'pass_review')
      .where('target_id', '=', accountId)
      .orderBy('occurred_at', 'asc')
      .execute();
    expect(actions.map((row) => row.action)).toEqual([
      'pass_review.reviewed',
      'pass_review.integrity_escalated',
    ]);
  });

  it('keeps the original evidence immutable and issues exactly one no-cost replacement', async () => {
    const accountId = breached.accountId as string;
    const evidence = await seedBreachEvidence(db, { accountId });
    const opened = await openContestation(db, {
      userId: breached.userId,
      accountId,
      targetType: 'account_breach',
      targetId: evidence.riskViolationId,
      reasonCategory: 'rule_misapplied',
      traderStatement: 'La décision ne correspond pas aux éléments enregistrés.',
      correlationId: randomUUID(),
    });
    const before = {
      account: await db
        .selectFrom('app.trading_accounts')
        .selectAll()
        .where('id', '=', accountId)
        .executeTakeFirstOrThrow(),
      violation: await db
        .selectFrom('app.risk_violations')
        .selectAll()
        .where('id', '=', evidence.riskViolationId)
        .executeTakeFirstOrThrow(),
      transitions: await db
        .selectFrom('app.account_state_transitions')
        .selectAll()
        .where('account_id', '=', accountId)
        .orderBy('occurred_at')
        .execute(),
      ledger: await db
        .selectFrom('app.trading_ledger_entries')
        .selectAll()
        .where('account_id', '=', accountId)
        .orderBy('created_at')
        .execute(),
      purchases: await db
        .selectFrom('app.purchase_orders')
        .select((eb) => eb.fn.countAll<string>().as('count'))
        .where('user_id', '=', breached.userId)
        .executeTakeFirstOrThrow(),
    };

    await recordContestationDecision(db, {
      publicId: opened.contestationPublicId,
      staffUserId: risk.userId,
      staffRole: 'risk',
      decision: 'correction_required',
      reason: 'Une erreur WARIBA a affecté la décision terminale.',
      expectedVersion: 1,
      correlationId: randomUUID(),
    });
    await expect(
      recordContestationDecision(db, {
        publicId: opened.contestationPublicId,
        staffUserId: risk.userId,
        staffRole: 'risk',
        decision: 'upheld',
        reason: 'Cette soumission utilise une ancienne version du dossier.',
        expectedVersion: 1,
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ name: 'OperatorCaseStaleError' });

    const executions = await Promise.all([
      executeContestationReplacement(db, {
        publicId: opened.contestationPublicId,
        staffUserId: risk.userId,
        staffRole: 'risk',
        reason: 'Création du compte compensatoire autorisé par la décision.',
        expectedVersion: 2,
        correlationId: randomUUID(),
      }),
      executeContestationReplacement(db, {
        publicId: opened.contestationPublicId,
        staffUserId: risk.userId,
        staffRole: 'risk',
        reason: 'Exécution concurrente de la même correction autorisée.',
        expectedVersion: 2,
        correlationId: randomUUID(),
      }),
    ]);
    expect(new Set(executions.map((result) => result.replacementAccountPublicId)).size).toBe(1);
    expect(executions.map((result) => result.alreadyExisted).sort()).toEqual([false, true]);
    const replacementPublicId = executions[0]?.replacementAccountPublicId as string;

    const replacements = await db
      .selectFrom('app.trading_accounts')
      .selectAll()
      .where('source_contestation_id', '=', opened.contestationId)
      .execute();
    expect(replacements).toHaveLength(1);
    const replacement = replacements[0];
    expect(replacement?.id).not.toBe(accountId);
    expect(replacement).toMatchObject({
      program_type: before.account.program_type,
      nominal_balance: before.account.nominal_balance,
      currency: before.account.currency,
      policy_version_id: before.account.policy_version_id,
      source_purchase_order_id: null,
      source_evaluation_account_id: null,
      status: 'active',
    });
    expect(
      await db
        .selectFrom('app.purchase_orders')
        .select((eb) => eb.fn.countAll<string>().as('count'))
        .where('user_id', '=', breached.userId)
        .executeTakeFirstOrThrow(),
    ).toEqual(before.purchases);
    expect(
      await db
        .selectFrom('app.trading_accounts')
        .selectAll()
        .where('id', '=', accountId)
        .executeTakeFirstOrThrow(),
    ).toEqual(before.account);
    expect(
      await db
        .selectFrom('app.risk_violations')
        .selectAll()
        .where('id', '=', evidence.riskViolationId)
        .executeTakeFirstOrThrow(),
    ).toEqual(before.violation);
    expect(
      await db
        .selectFrom('app.account_state_transitions')
        .selectAll()
        .where('account_id', '=', accountId)
        .orderBy('occurred_at')
        .execute(),
    ).toEqual(before.transitions);
    expect(
      await db
        .selectFrom('app.trading_ledger_entries')
        .selectAll()
        .where('account_id', '=', accountId)
        .orderBy('created_at')
        .execute(),
    ).toEqual(before.ledger);
    expect(before.account.status).toBe('breached');

    const ownView = await loadContestationForUser(db, {
      userId: breached.userId,
      publicId: opened.contestationPublicId,
    });
    expect(ownView).toMatchObject({
      status: 'decision_corrected',
      replacementAccountPublicId: replacementPublicId,
    });
    expect(
      await loadContestationForUser(db, {
        userId: support.userId,
        publicId: opened.contestationPublicId,
      }),
    ).toBeNull();
    const audits = await db
      .selectFrom('audit.audit_events')
      .select(['action', 'after_json'])
      .where('target_id', '=', opened.contestationId)
      .orderBy('occurred_at', 'asc')
      .execute();
    expect(audits.map((row) => row.action)).toEqual([
      'contestation.correction_required',
      'contestation.replacement_account_issued',
    ]);
    expect(JSON.stringify(audits.at(-1)?.after_json)).toContain(replacementPublicId);
  });

  it('fails closed when an authoritative financial consequence exists', async () => {
    const accountId = financial.accountId as string;
    const evidence = await seedBreachEvidence(db, { accountId });
    await db
      .insertInto('app.trading_ledger_entries')
      .values({
        account_id: accountId,
        entry_type: 'payout_debit',
        amount: '-1.00',
        currency: 'USD',
        reference_type: 'test_financial_entitlement',
        reference_id: randomUUID(),
      })
      .execute();
    const opened = await openContestation(db, {
      userId: financial.userId,
      accountId,
      targetType: 'account_breach',
      targetId: evidence.riskViolationId,
      reasonCategory: 'rule_misapplied',
      traderStatement: 'Ce dossier comporte une conséquence financière.',
      correlationId: randomUUID(),
    });
    await recordContestationDecision(db, {
      publicId: opened.contestationPublicId,
      staffUserId: risk.userId,
      staffRole: 'risk',
      decision: 'correction_required',
      reason: 'Une erreur est confirmée mais une conséquence financière existe.',
      expectedVersion: 1,
      correlationId: randomUUID(),
    });

    const row = await db
      .selectFrom('app.contestations')
      .select(['status', 'decision'])
      .where('id', '=', opened.contestationId)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({
      status: 'finance_compliance_review',
      decision: 'finance_compliance_review',
    });
    expect(
      await db
        .selectFrom('app.trading_accounts')
        .select('id')
        .where('source_contestation_id', '=', opened.contestationId)
        .execute(),
    ).toHaveLength(0);
  });
});
