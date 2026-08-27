import { randomUUID } from 'node:crypto';
import type { Transaction } from 'kysely';
import type { Database, Db } from './client';
import { assertPolicyActivationReady, loadPolicyById, loadPublishedPolicy } from './policy';

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

const SANDBOX_SPEC_SET_PREFIX = 'WARIBA-SANDBOX-SYMBOLS-';

function parseSandboxSpecSetVersion(setId: string): readonly [number, number, number] {
  const match = new RegExp(`^${SANDBOX_SPEC_SET_PREFIX}(\\d+)\\.(\\d+)\\.(\\d+)$`).exec(setId);
  const version: [number, number, number] = [
    Number(match?.[1]),
    Number(match?.[2]),
    Number(match?.[3]),
  ];
  if (!match || version.some((part) => !Number.isSafeInteger(part))) {
    throw new Error(`Invalid WARIBA sandbox symbol spec set ID: ${setId}.`);
  }
  return version;
}

function compareSandboxSpecSetIds(left: string, right: string): number {
  const leftVersion = parseSandboxSpecSetVersion(left);
  const rightVersion = parseSandboxSpecSetVersion(right);
  for (let index = 0; index < leftVersion.length; index += 1) {
    const difference = (leftVersion[index] ?? 0) - (rightVersion[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export async function loadLatestSandboxSymbolSpecSet(trx: Db) {
  const candidates = await trx
    .selectFrom('app.symbol_spec_sets')
    .select(['id', 'set_id'])
    .where('status', '=', 'sandbox_candidate')
    .execute();
  if (candidates.length === 0) {
    throw new Error(
      'No sandbox symbol spec set published — cannot activate an account without one.',
    );
  }

  // `published_at` cannot rank immutable versions safely: the legacy 1.0
  // seed uses DB `now()` while 1.1 carries its business publication date,
  // so a fresh database replay makes 1.0 look newer. The versioned set ID is
  // the durable contract identifier and is compared numerically (1.10 > 1.9).
  return candidates.reduce((latest, candidate) =>
    compareSandboxSpecSetIds(candidate.set_id, latest.set_id) > 0 ? candidate : latest,
  );
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

  const sourceOrder = await trx
    .selectFrom('app.purchase_orders')
    .select(['policy_version_id', 'product_family'])
    .where('id', '=', params.purchaseOrderId)
    .executeTakeFirstOrThrow(() => new Error('Purchase order not found during activation.'));
  const policyVersion = sourceOrder.policy_version_id
    ? await loadPolicyById(trx, sourceOrder.policy_version_id)
    : await loadPublishedPolicy(trx, 'WARIBA_ONE');
  if (policyVersion.accountPhase !== 'evaluation') {
    throw new Error('Purchase order is not pinned to an Evaluation policy.');
  }
  await assertPolicyActivationReady(trx, policyVersion.id);

  const symbolSpecSet = await loadLatestSandboxSymbolSpecSet(trx);

  const publicId = `EVAL-${params.nominalBalance.split('.')[0]}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const account = await trx
    .insertInto('app.trading_accounts')
    .values({
      public_id: publicId,
      user_id: params.userId,
      source_purchase_order_id: params.purchaseOrderId,
      program_type: policyVersion.program === 'WARIBA_FLEX' ? 'WARIBA_FLEX' : 'WARIBA_ONE',
      product_family: sourceOrder.product_family ?? policyVersion.productFamily,
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
      // The activation's own instant, so this row sorts against the rest of
      // the account's timeline on the clock that wrote it.
      occurred_at: timestamp,
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
