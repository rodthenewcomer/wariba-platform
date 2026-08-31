import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import type { Db } from './client';
import { loadLatestSandboxSymbolSpecSet } from './activation';
import {
  assertPolicyActivationReady,
  loadCompatiblePerformancePolicy,
  loadPolicyById,
} from './policy';

export interface FlexActivationObligationResult {
  obligationId: string;
  activationOrderId: string;
  dueAt: Date;
  alreadyExisted: boolean;
}

export interface V2PerformanceActivationResult {
  id: string;
  publicId: string;
  status: string;
  alreadyExisted: boolean;
}

function addUtcDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * FLEX pass -> one frozen activation obligation/order. A later catalogue or
 * acquisition gate cannot rewrite this price or erase the acquired pass.
 */
export async function createFlexActivationObligationInTransaction(
  trx: Db,
  params: { evaluationAccountId: string; now: Date },
): Promise<FlexActivationObligationResult> {
  const evaluation = await trx
    .selectFrom('app.trading_accounts')
    .select([
      'id',
      'user_id',
      'status',
      'program_type',
      'product_family',
      'source_purchase_order_id',
      'policy_version_id',
    ])
    .where('id', '=', params.evaluationAccountId)
    .forUpdate()
    .executeTakeFirstOrThrow(() => new Error('FLEX Evaluation account not found.'));
  if (
    evaluation.program_type !== 'WARIBA_FLEX' ||
    evaluation.product_family !== 'WARIBA_FLEX' ||
    evaluation.status !== 'passed' ||
    evaluation.source_purchase_order_id === null
  ) {
    throw new Error('FLEX activation obligation requires a passed FLEX Evaluation account.');
  }

  const existing = await trx
    .selectFrom('app.flex_activation_obligations')
    .select(['id', 'activation_order_id', 'due_at'])
    .where('evaluation_account_id', '=', evaluation.id)
    .executeTakeFirst();
  if (existing) {
    return {
      obligationId: existing.id,
      activationOrderId: existing.activation_order_id,
      dueAt: existing.due_at,
      alreadyExisted: true,
    };
  }

  const originalOrder = await trx
    .selectFrom('app.purchase_orders as purchase')
    .select([
      'purchase.id',
      'purchase.product_version_id',
      'purchase.activation_price_snapshot',
      'purchase.total_price_if_success_snapshot',
      'purchase.total_currency',
    ])
    .where('purchase.id', '=', evaluation.source_purchase_order_id)
    .executeTakeFirstOrThrow();
  if (
    originalOrder.activation_price_snapshot === null ||
    new Decimal(originalOrder.activation_price_snapshot).lessThanOrEqualTo(0)
  ) {
    throw new Error('FLEX source purchase has no immutable activation price snapshot.');
  }

  const performancePolicy = await loadCompatiblePerformancePolicy(
    trx,
    evaluation.policy_version_id,
  );
  if (performancePolicy.productFamily !== 'WARIBA_FLEX') {
    throw new Error('FLEX Evaluation is not linked to a FLEX Performance policy.');
  }
  const policyEvidence = await trx
    .selectFrom('app.policy_versions')
    .select(['machine_hash', 'human_document_hash'])
    .where('id', '=', performancePolicy.id)
    .executeTakeFirstOrThrow();

  const dueAt = addUtcDays(params.now, 30);
  const order = await trx
    .insertInto('app.purchase_orders')
    .values({
      user_id: evaluation.user_id,
      product_version_id: originalOrder.product_version_id,
      policy_version_id: performancePolicy.id,
      policy_machine_hash: policyEvidence.machine_hash,
      policy_human_document_hash: policyEvidence.human_document_hash,
      product_family: 'WARIBA_FLEX',
      order_kind: 'flex_activation',
      parent_purchase_order_id: originalOrder.id,
      source_evaluation_account_id: evaluation.id,
      idempotency_key: `flex-activation:${evaluation.id}`,
      status: 'pending_payment',
      total_amount: originalOrder.activation_price_snapshot,
      total_currency: originalOrder.total_currency,
      upfront_price_snapshot: '0',
      activation_price_snapshot: originalOrder.activation_price_snapshot,
      total_price_if_success_snapshot:
        originalOrder.total_price_if_success_snapshot ?? originalOrder.activation_price_snapshot,
      activation_due_at: dueAt,
      created_at: params.now,
      updated_at: params.now,
    })
    .onConflict((conflict) => conflict.columns(['user_id', 'idempotency_key']).doNothing())
    .returning('id')
    .executeTakeFirst();
  const activationOrderId =
    order?.id ??
    (
      await trx
        .selectFrom('app.purchase_orders')
        .select('id')
        .where('user_id', '=', evaluation.user_id)
        .where('idempotency_key', '=', `flex-activation:${evaluation.id}`)
        .executeTakeFirstOrThrow()
    ).id;

  const obligation = await trx
    .insertInto('app.flex_activation_obligations')
    .values({
      evaluation_account_id: evaluation.id,
      activation_order_id: activationOrderId,
      performance_policy_version_id: performancePolicy.id,
      status: 'activation_due',
      amount_snapshot: originalOrder.activation_price_snapshot,
      currency_snapshot: originalOrder.total_currency,
      due_at: dueAt,
      created_at: params.now,
      updated_at: params.now,
    })
    .onConflict((conflict) => conflict.column('evaluation_account_id').doNothing())
    .returning(['id', 'activation_order_id', 'due_at'])
    .executeTakeFirst();
  const canonical =
    obligation ??
    (await trx
      .selectFrom('app.flex_activation_obligations')
      .select(['id', 'activation_order_id', 'due_at'])
      .where('evaluation_account_id', '=', evaluation.id)
      .executeTakeFirstOrThrow());

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'trading_account',
      aggregate_id: evaluation.id,
      event_type: 'flex.activation_due',
      payload: JSON.stringify({
        evaluationAccountId: evaluation.id,
        activationOrderId: canonical.activation_order_id,
        performancePolicyVersionId: performancePolicy.id,
        amount: originalOrder.activation_price_snapshot,
        currency: originalOrder.total_currency,
        dueAt: canonical.due_at.toISOString(),
      }),
      occurred_at: params.now,
    })
    .execute();

  return {
    obligationId: canonical.id,
    activationOrderId: canonical.activation_order_id,
    dueAt: canonical.due_at,
    alreadyExisted: obligation === undefined,
  };
}

/** INSTANT paid order -> Performance, or paid FLEX activation -> Performance. */
export async function activateV2PerformanceFromOrderInTransaction(
  trx: Db,
  params: { purchaseOrderId: string; now: Date; enforceCapabilityReadiness?: boolean },
): Promise<V2PerformanceActivationResult> {
  const order = await trx
    .selectFrom('app.purchase_orders as purchase')
    .innerJoin('app.product_versions as version', 'version.id', 'purchase.product_version_id')
    .innerJoin('app.products as product', 'product.id', 'version.product_id')
    .select([
      'purchase.id',
      'purchase.user_id',
      'purchase.status',
      'purchase.order_kind',
      'purchase.product_family',
      'purchase.policy_version_id',
      'purchase.source_evaluation_account_id',
      'purchase.activation_due_at',
      'product.nominal_balance',
      'product.nominal_currency',
    ])
    .where('purchase.id', '=', params.purchaseOrderId)
    .forUpdate()
    .executeTakeFirstOrThrow(() => new Error('V2 Performance purchase order not found.'));
  if (order.status !== 'paid' && order.status !== 'fulfilled') {
    throw new Error(`V2 Performance activation requires a paid order, got ${order.status}.`);
  }
  if (order.policy_version_id === null) throw new Error('V2 order has no pinned policy UUID.');
  if (order.product_family !== 'WARIBA_INSTANT' && order.order_kind !== 'flex_activation') {
    throw new Error('Order is not an INSTANT purchase or FLEX activation.');
  }
  if (order.activation_due_at && params.now > order.activation_due_at) {
    if (order.source_evaluation_account_id) {
      await trx
        .updateTable('app.flex_activation_obligations')
        .set({ status: 'expired', updated_at: params.now })
        .where('evaluation_account_id', '=', order.source_evaluation_account_id)
        .where('status', '=', 'activation_due')
        .execute();
    }
    throw new Error('FLEX activation window expired; the pass evidence remains preserved.');
  }

  if (order.product_family === 'WARIBA_FLEX' && order.source_evaluation_account_id) {
    const markedPaid = await trx
      .updateTable('app.flex_activation_obligations')
      .set({ status: 'paid', paid_at: params.now, updated_at: params.now })
      .where('evaluation_account_id', '=', order.source_evaluation_account_id)
      .where('activation_order_id', '=', order.id)
      .where('status', '=', 'activation_due')
      .returning('id')
      .executeTakeFirst();
    if (markedPaid) {
      await trx
        .insertInto('app.outbox_events')
        .values({
          aggregate_type: 'flex_activation_obligation',
          aggregate_id: markedPaid.id,
          event_type: 'flex.activation_paid',
          payload: JSON.stringify({
            evaluationAccountId: order.source_evaluation_account_id,
            activationOrderId: order.id,
          }),
          occurred_at: params.now,
        })
        .execute();
    }
  }

  const policy = await loadPolicyById(trx, order.policy_version_id);
  if (policy.accountPhase !== 'performance' || policy.productFamily !== order.product_family) {
    throw new Error('V2 order policy is not the compatible Performance policy.');
  }
  if (params.enforceCapabilityReadiness !== false) {
    await assertPolicyActivationReady(trx, policy.id);
  }

  const existingQuery = trx
    .selectFrom('app.trading_accounts')
    .select(['id', 'public_id', 'status']);
  const existing =
    order.product_family === 'WARIBA_INSTANT'
      ? await existingQuery.where('source_purchase_order_id', '=', order.id).executeTakeFirst()
      : await existingQuery
          .where('source_evaluation_account_id', '=', order.source_evaluation_account_id)
          .executeTakeFirst();
  if (existing) {
    return {
      id: existing.id,
      publicId: existing.public_id,
      status: existing.status,
      alreadyExisted: true,
    };
  }

  const symbolSpecSet = await loadLatestSandboxSymbolSpecSet(trx);
  const publicId = `PERF-${order.nominal_balance.split('.')[0]}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const account = await trx
    .insertInto('app.trading_accounts')
    .values({
      public_id: publicId,
      user_id: order.user_id,
      source_purchase_order_id: order.product_family === 'WARIBA_INSTANT' ? order.id : null,
      source_evaluation_account_id:
        order.product_family === 'WARIBA_FLEX' ? order.source_evaluation_account_id : null,
      program_type: 'WARIBA_PERFORMANCE',
      product_family: order.product_family,
      nominal_balance: order.nominal_balance,
      currency: order.nominal_currency,
      status: 'active',
      policy_version_id: policy.id,
      symbol_spec_set_id: symbolSpecSet.id,
      activated_at: params.now,
      created_at: params.now,
    })
    .returning(['id', 'public_id', 'status'])
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('app.trading_ledger_entries')
    .values({
      account_id: account.id,
      entry_type: 'initial_balance',
      amount: order.nominal_balance,
      currency: order.nominal_currency,
    })
    .execute();
  await trx
    .insertInto('app.account_state_transitions')
    .values({
      account_id: account.id,
      from_status: 'pending_activation',
      to_status: 'active',
      reason:
        order.product_family === 'WARIBA_INSTANT'
          ? 'instant_payment_confirmed'
          : 'flex_activation_paid',
      occurred_at: params.now,
    })
    .execute();
  await trx
    .insertInto('app.performance_cycles')
    .values({
      account_id: account.id,
      cycle_number: 1,
      opened_at: params.now,
    })
    .execute();
  await trx
    .updateTable('app.purchase_orders')
    .set({ status: 'fulfilled', updated_at: params.now })
    .where('id', '=', order.id)
    .where('status', '=', 'paid')
    .execute();

  if (order.product_family === 'WARIBA_FLEX' && order.source_evaluation_account_id) {
    await trx
      .updateTable('app.flex_activation_obligations')
      .set({
        status: 'fulfilled',
        fulfilled_at: params.now,
        updated_at: params.now,
      })
      .where('evaluation_account_id', '=', order.source_evaluation_account_id)
      .where('activation_order_id', '=', order.id)
      .where('status', '=', 'paid')
      .execute();
  }

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'trading_account',
      aggregate_id: account.id,
      event_type:
        order.product_family === 'WARIBA_INSTANT'
          ? 'instant.performance_activated'
          : 'flex.performance_activated',
      payload: JSON.stringify({
        accountId: account.id,
        purchaseOrderId: order.id,
        sourceEvaluationAccountId: order.source_evaluation_account_id,
        policyVersionId: policy.id,
      }),
      occurred_at: params.now,
    })
    .execute();

  return {
    id: account.id,
    publicId: account.public_id,
    status: account.status,
    alreadyExisted: false,
  };
}
