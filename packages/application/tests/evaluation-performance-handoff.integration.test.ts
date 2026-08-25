import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  acknowledgePerformanceRules,
  activateEvaluationAccount,
  activatePerformanceAccountInTransaction,
  createDbClient,
  createSupportTicket,
  loadControlAccountDetail,
  loadControlSupportTicket,
  type Db,
} from '@wariba/database';
import { buildEvaluationToPerformanceHandoff, listAccountsForUser } from '../src/index';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('Phase 3.3.1 Evaluation → Performance handoff', () => {
  let db: Db;
  const userIds: string[] = [];
  const accountIds: string[] = [];
  const purchaseOrderIds: string[] = [];

  async function createUser(label: string): Promise<string> {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `handoff-${label}-${randomUUID()}@wariba-test.invalid`,
        password: randomUUID(),
        email_confirm: true,
      }),
    });
    const userId = ((await response.json()) as { id: string }).id;
    userIds.push(userId);
    return userId;
  }

  async function createEvaluation(userId: string) {
    const product = await db
      .selectFrom('app.product_versions')
      .innerJoin('app.products', 'app.products.id', 'app.product_versions.product_id')
      .select([
        'app.product_versions.id',
        'app.products.nominal_balance',
        'app.products.nominal_currency',
      ])
      .where('app.products.code', '=', '10K')
      .executeTakeFirstOrThrow();
    const order = await db
      .insertInto('app.purchase_orders')
      .values({
        user_id: userId,
        product_version_id: product.id,
        idempotency_key: randomUUID(),
        status: 'paid',
        total_amount: '39900.00',
        total_currency: 'XOF',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    purchaseOrderIds.push(order.id);
    const account = await activateEvaluationAccount(db, {
      purchaseOrderId: order.id,
      userId,
      nominalBalance: product.nominal_balance,
      currency: product.nominal_currency,
    });
    accountIds.push(account.id);
    return account;
  }

  beforeAll(() => {
    db = createDbClient(DATABASE_URL as string);
  });

  afterAll(async () => {
    if (!db) return;
    for (const userId of userIds) {
      await db.deleteFrom('app.support_tickets').where('user_id', '=', userId).execute();
      await db.deleteFrom('app.staff_action_rate_limits').where('actor_id', '=', userId).execute();
    }
    const children =
      accountIds.length > 0
        ? await db
            .selectFrom('app.trading_accounts')
            .select('id')
            .where('source_evaluation_account_id', 'in', accountIds)
            .execute()
        : [];
    const everyAccount = [...children.map((row) => row.id), ...accountIds];
    for (const accountId of everyAccount) {
      await db
        .deleteFrom('app.performance_rule_acknowledgements')
        .where('account_id', '=', accountId)
        .execute();
      await db.deleteFrom('app.performance_cycles').where('account_id', '=', accountId).execute();
      await db
        .deleteFrom('app.account_daily_snapshots')
        .where('account_id', '=', accountId)
        .execute();
      await db
        .deleteFrom('app.account_state_transitions')
        .where('account_id', '=', accountId)
        .execute();
      await db
        .deleteFrom('app.trading_ledger_entries')
        .where('account_id', '=', accountId)
        .execute();
      await db.deleteFrom('app.outbox_events').where('aggregate_id', '=', accountId).execute();
      await db.deleteFrom('audit.audit_events').where('target_id', '=', accountId).execute();
      await db.deleteFrom('app.trading_accounts').where('id', '=', accountId).execute();
    }
    for (const orderId of purchaseOrderIds) {
      await db.deleteFrom('app.payment_events').where('purchase_order_id', '=', orderId).execute();
      await db.deleteFrom('app.purchase_orders').where('id', '=', orderId).execute();
    }
    await db.destroy();
    for (const userId of userIds) {
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    }
  }, 60000);

  it('distinguishes objective reached from finalization without declaring a pass', async () => {
    const userId = await createUser('temporal');
    const evaluation = await createEvaluation(userId);
    const reachedAt = new Date();
    await db
      .updateTable('app.trading_accounts')
      .set({ status: 'pass_pending', updated_at: reachedAt })
      .where('id', '=', evaluation.id)
      .execute();
    await db
      .insertInto('app.account_state_transitions')
      .values({
        account_id: evaluation.id,
        from_status: 'active',
        to_status: 'pass_pending',
        reason: 'profit_target_reached',
      })
      .execute();

    const intraday = await buildEvaluationToPerformanceHandoff(db, {
      userId,
      accountId: evaluation.id,
    });
    expect(intraday?.stage).toBe('objective_reached');
    expect(intraday?.performanceAccount).toBeNull();

    const account = await db
      .selectFrom('app.trading_accounts')
      .select(['policy_version_id', 'nominal_balance'])
      .where('id', '=', evaluation.id)
      .executeTakeFirstOrThrow();
    await db
      .insertInto('app.account_daily_snapshots')
      .values({
        account_id: evaluation.id,
        trading_day: reachedAt.toISOString().slice(0, 10),
        policy_version_id: account.policy_version_id,
        status: 'finalized',
        sod_balance: account.nominal_balance,
        sod_equity: account.nominal_balance,
        program_sod_balance: account.nominal_balance,
        daily_reference: account.nominal_balance,
        maximum_loss_floor_before: '9000.00',
        eod_balance: '11000.00',
        eod_equity: '11000.00',
        program_eod_balance: '11000.00',
        maximum_loss_floor_after: '10000.00',
        highest_eod_balance_after: '11000.00',
        highest_program_eod_balance_after: '11000.00',
        realized_net_profit_for_day: '1000.00',
        eligible_realized_net_profit_for_day: '1000.00',
        finalized_at: new Date(reachedAt.getTime() + 1_000),
      })
      .execute();
    const finalizing = await buildEvaluationToPerformanceHandoff(db, {
      userId,
      accountId: evaluation.id,
    });
    expect(finalizing?.stage).toBe('finalizing');
    expect(finalizing?.evaluationAccount.statusLabel).toBe('Vérification en cours');
  }, 30000);

  it('keeps one owner-scoped, pinned and auditable handoff across Trader, Support and Control', async () => {
    const ownerId = await createUser('owner');
    const otherId = await createUser('other');
    const evaluation = await createEvaluation(ownerId);
    await db
      .updateTable('app.trading_accounts')
      .set({ status: 'passed' })
      .where('id', '=', evaluation.id)
      .execute();
    const performance = await activatePerformanceAccountInTransaction(db, {
      evaluationAccountId: evaluation.id,
    });

    const onboarding = await buildEvaluationToPerformanceHandoff(db, {
      userId: ownerId,
      accountId: performance.id,
    });
    expect(onboarding?.stage).toBe('rules_onboarding');
    expect(onboarding?.evaluationAccount.id).toBe(evaluation.id);
    expect(onboarding?.performanceAccount?.publicId).toBe(performance.publicId);
    expect(onboarding?.ruleComparison.length).toBeGreaterThan(0);
    expect(onboarding?.buffer).not.toBeNull();
    expect(onboarding?.payoutPath.length).toBeGreaterThan(0);
    expect(
      await buildEvaluationToPerformanceHandoff(db, {
        userId: otherId,
        accountId: performance.id,
      }),
    ).toBeNull();

    await expect(
      acknowledgePerformanceRules(db, {
        userId: otherId,
        accountId: performance.id,
        correlationId: randomUUID(),
        now: new Date(),
      }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_FOUND' });

    if (!onboarding?.performanceAccount) {
      throw new Error('Expected the owner-scoped Performance account in onboarding.');
    }
    const attachedPerformancePolicyId = onboarding.performanceAccount.policyVersionId;
    const evaluationPolicyId = onboarding.evaluationAccount.policyVersionId;

    const first = await acknowledgePerformanceRules(db, {
      userId: ownerId,
      accountId: performance.id,
      correlationId: randomUUID(),
      now: new Date(),
    });
    const retry = await acknowledgePerformanceRules(db, {
      userId: ownerId,
      accountId: performance.id,
      correlationId: randomUUID(),
      now: new Date(),
    });
    expect(first.policyVersionId).toBe(attachedPerformancePolicyId);
    expect(first.alreadyExisted).toBe(false);
    expect(retry.alreadyExisted).toBe(true);
    expect(retry.id).toBe(first.id);

    await expect(
      db
        .updateTable('app.performance_rule_acknowledgements')
        .set({ policy_version_id: evaluationPolicyId })
        .where('id', '=', first.id)
        .execute(),
    ).rejects.toThrow('immutable');

    const ready = await buildEvaluationToPerformanceHandoff(db, {
      userId: ownerId,
      accountId: performance.id,
    });
    if (!ready?.performanceAccount) {
      throw new Error('Expected a ready Performance handoff.');
    }
    const readyPolicyVersionId = ready.performanceAccount.policyVersionId;
    expect(ready?.stage).toBe('performance_ready');
    expect(ready?.handoff.rulesAcknowledgedAt).not.toBeNull();

    const accountList = await listAccountsForUser(db, { userId: ownerId });
    const listEvaluation = accountList.find((account) => account.id === evaluation.id);
    const listPerformance = accountList.find((account) => account.id === performance.id);
    expect(listEvaluation?.performanceAccountId).toBe(performance.id);
    expect(listPerformance?.sourceEvaluationAccountId).toBe(evaluation.id);

    const control = await loadControlAccountDetail(db, {
      accountId: performance.id,
      sections: new Set(['overview'] as const),
    });
    expect(control?.overview?.sourceEvaluation?.id).toBe(evaluation.id);

    const ticket = await createSupportTicket(db, {
      userId: ownerId,
      accountId: performance.id,
      category: 'performance',
      subject: 'Question sur mon passage',
      body: 'Je souhaite confirmer le lien entre mes deux comptes.',
      correlationId: randomUUID(),
    });
    const support = await loadControlSupportTicket(db, { publicId: ticket.publicId });
    expect(support?.account?.linkedAccount).toEqual({
      accountId: evaluation.id,
      accountPublicId: evaluation.publicId,
      relation: 'source_evaluation',
    });

    class RollbackPublishedPolicyProbe extends Error {}
    await expect(
      db.transaction().execute(async (trx) => {
        const attached = await trx
          .selectFrom('app.policy_versions')
          .selectAll()
          .where('id', '=', readyPolicyVersionId)
          .executeTakeFirstOrThrow();
        await trx
          .insertInto('app.policy_versions')
          .values({
            program: 'WARIBA_PERFORMANCE',
            semantic_version: `test-${Date.now()}`,
            status: 'published',
            parameters_json: attached.parameters_json,
            human_document_hash: attached.human_document_hash,
            machine_hash: attached.machine_hash,
            effective_from: new Date(),
            retired_at: null,
          })
          .execute();
        const stillPinned = await buildEvaluationToPerformanceHandoff(trx, {
          userId: ownerId,
          accountId: performance.id,
        });
        expect(stillPinned?.performanceAccount?.policyVersionId).toBe(attached.id);
        expect(stillPinned?.rulesAcknowledged).toBe(true);
        throw new RollbackPublishedPolicyProbe();
      }),
    ).rejects.toBeInstanceOf(RollbackPublishedPolicyProbe);
  }, 45000);
});
