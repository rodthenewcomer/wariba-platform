import { randomUUID } from 'node:crypto';
import type { Transaction } from 'kysely';
import type { Database, Db } from './client';
import { loadPublishedPolicy } from './policy';

export interface ActivateEvaluationAccountParams {
  purchaseOrderId: string;
  userId: string;
  nominalBalance: string;
  currency: string;
  now?: () => Date;
}

export interface ActivatedAccount {
  id: string;
  publicId: string;
  status: string;
  alreadyExisted: boolean;
}

/**
 * "Après payment.confirmed: créer exactement un compte Evaluation" —
 * Prompt 03 activation scope. Idempotent under retry and safe under
 * concurrent execution:
 *
 *  - The purchase-order row is locked before the account lookup. Concurrent
 *    calls serialize, then the followers re-read the winner's account.
 *    `trading_accounts.source_purchase_order_id` also carries a UNIQUE
 *    constraint as a final database invariant.
 *  - The whole operation (account, transition, ledger entry, order
 *    fulfillment, outbox event) runs in one transaction — either all of
 *    it lands or none of it does. No partial activation is observable.
 *  - `purchase_orders.status` only moves 'paid' -> 'fulfilled' (the WHERE
 *    guard below), matching the state machine in @wariba/domain — a
 *    second call against an already-fulfilled order is a no-op on that
 *    update, not an error.
 *
 * The standalone function validates ownership and the paid/fulfilled state.
 * Payment orchestration uses the transaction-aware variant below after it
 * has acquired the same row lock.
 */
export async function activateEvaluationAccount(
  db: Db,
  params: ActivateEvaluationAccountParams,
): Promise<ActivatedAccount> {
  return db.transaction().execute(async (trx) => {
    const order = await trx
      .selectFrom('app.purchase_orders')
      .select(['id', 'user_id', 'status'])
      .where('id', '=', params.purchaseOrderId)
      .forUpdate()
      .executeTakeFirstOrThrow(() => new Error('Purchase order not found.'));

    if (order.user_id !== params.userId) {
      throw new Error('Purchase order does not belong to the activation user.');
    }
    if (order.status !== 'paid' && order.status !== 'fulfilled') {
      throw new Error(`Purchase order cannot be activated from status ${order.status}.`);
    }

    return activateEvaluationAccountInTransaction(trx, params);
  });
}

/**
 * Transaction-aware activation for orchestrators that already own and lock
 * the purchase order row. Keeping this work inside the caller transaction
 * makes payment confirmation, receipt creation, activation and outbox write
 * atomic: a failure rolls the webhook event back too, so a retry can finish.
 */
export async function activateEvaluationAccountInTransaction(
  trx: Transaction<Database>,
  params: ActivateEvaluationAccountParams,
): Promise<ActivatedAccount> {
  const timestamp = params.now?.() ?? new Date();
  const existing = await trx
    .selectFrom('app.trading_accounts')
    .select(['id', 'public_id', 'status'])
    .where('source_purchase_order_id', '=', params.purchaseOrderId)
    .executeTakeFirst();

  if (existing) {
    return {
      id: existing.id,
      publicId: existing.public_id,
      status: existing.status,
      alreadyExisted: true,
    };
  }

  const policyVersion = await loadPublishedPolicy(trx, 'WARIBA_ONE');

  const symbolSpecSet = await trx
    .selectFrom('app.symbol_spec_sets')
    .select('id')
    .where('status', '=', 'sandbox_candidate')
    .orderBy('published_at', 'desc')
    .executeTakeFirstOrThrow(
      () =>
        new Error('No sandbox symbol spec set published — cannot activate an account without one.'),
    );

  const publicId = `EVAL-${params.nominalBalance.split('.')[0]}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const account = await trx
    .insertInto('app.trading_accounts')
    .values({
      public_id: publicId,
      user_id: params.userId,
      source_purchase_order_id: params.purchaseOrderId,
      program_type: 'WARIBA_ONE',
      nominal_balance: params.nominalBalance,
      currency: params.currency,
      status: 'active',
      policy_version_id: policyVersion.id,
      symbol_spec_set_id: symbolSpecSet.id,
      activated_at: timestamp,
    })
    .returning(['id', 'public_id', 'status'])
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('app.account_state_transitions')
    .values({
      account_id: account.id,
      from_status: 'pending_activation',
      to_status: 'active',
      reason: 'payment_confirmed',
    })
    .execute();

  await trx
    .insertInto('app.trading_ledger_entries')
    .values({
      account_id: account.id,
      entry_type: 'initial_balance',
      amount: params.nominalBalance,
      currency: params.currency,
    })
    .execute();

  // Guarded transition: only 'paid' -> 'fulfilled'. If another process
  // already moved it, this WHERE matches zero rows and no-ops rather
  // than clobbering a state it shouldn't touch.
  await trx
    .updateTable('app.purchase_orders')
    .set({ status: 'fulfilled', updated_at: timestamp })
    .where('id', '=', params.purchaseOrderId)
    .where('status', '=', 'paid')
    .execute();

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'trading_account',
      aggregate_id: account.id,
      event_type: 'evaluation.activated',
      payload: JSON.stringify({
        accountId: account.id,
        publicId: account.public_id,
        userId: params.userId,
        purchaseOrderId: params.purchaseOrderId,
      }),
    })
    .execute();

  return {
    id: account.id,
    publicId: account.public_id,
    status: account.status,
    alreadyExisted: false,
  };
}
