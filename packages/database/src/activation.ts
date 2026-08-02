import { randomUUID } from 'node:crypto';
import type { Db } from './client';

export interface ActivateEvaluationAccountParams {
  purchaseOrderId: string;
  userId: string;
  nominalBalance: string;
  currency: string;
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
 *  - `trading_accounts.source_purchase_order_id` carries a UNIQUE
 *    constraint (see migration), so two concurrent calls for the same
 *    order cannot both succeed at INSERT — the loser's insert fails and
 *    this function re-reads the winner's row instead of erroring.
 *  - The whole operation (account, transition, ledger entry, order
 *    fulfillment, outbox event) runs in one transaction — either all of
 *    it lands or none of it does. No partial activation is observable.
 *  - `purchase_orders.status` only moves 'paid' -> 'fulfilled' (the WHERE
 *    guard below), matching the state machine in @wariba/domain — a
 *    second call against an already-fulfilled order is a no-op on that
 *    update, not an error.
 *
 * Caller's responsibility: only invoke this after the payment_events
 * unique(provider, event_id) constraint has confirmed this is the first
 * time this specific webhook delivery is being processed. That table is
 * the first idempotency line; this function's own UNIQUE constraint is
 * the second, independent one — defense in depth, not redundancy, since
 * they guard against different failure modes (duplicate webhook delivery
 * vs. concurrent/retried activation calls).
 */
export async function activateEvaluationAccount(
  db: Db,
  params: ActivateEvaluationAccountParams,
): Promise<ActivatedAccount> {
  return db.transaction().execute(async (trx) => {
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

    const policyVersion = await trx
      .selectFrom('app.policy_versions')
      .select('id')
      .where('program', '=', 'WARIBA_ONE')
      .where('status', '=', 'published')
      .orderBy('effective_from', 'desc')
      .executeTakeFirstOrThrow(
        () =>
          new Error(
            'No published WARIBA_ONE policy version — cannot activate an account without one.',
          ),
      );

    const symbolSpecSet = await trx
      .selectFrom('app.symbol_spec_sets')
      .select('id')
      .where('status', '=', 'sandbox_candidate')
      .executeTakeFirstOrThrow(
        () =>
          new Error(
            'No sandbox symbol spec set published — cannot activate an account without one.',
          ),
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
        activated_at: new Date(),
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
      .set({ status: 'fulfilled', updated_at: new Date() })
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
  });
}
