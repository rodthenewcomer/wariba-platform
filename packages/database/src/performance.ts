import { randomUUID } from 'node:crypto';
import type { Db } from './client';
import { loadLatestSandboxSymbolSpecSet } from './activation';
import { loadPublishedPolicy } from './policy';

export interface ActivatePerformanceAccountParams {
  evaluationAccountId: string;
  userId: string;
  nominalBalance: string;
  currency: string;
  now?: () => Date;
}

export interface ActivatedPerformanceAccount {
  id: string;
  publicId: string;
  status: string;
  alreadyExisted: boolean;
}

/**
 * Prompt 08 Phase B, PERF-020 — "une seule relation Performance issue d'une
 * Evaluation réussie". Called from inside the same transaction that just
 * moved an Evaluation account pass_pending -> passed
 * (packages/database/src/risk.ts) so the pass and the new Performance
 * account either both land or neither does — no window where an account
 * shows as "passed" without its Performance account existing yet.
 *
 * Idempotent under retry the same way activateEvaluationAccountInTransaction
 * is: source_evaluation_account_id carries a UNIQUE constraint as the final
 * database invariant, this lookup is just the fast path that avoids a
 * duplicate-key error under normal (non-racing) retry.
 */
export async function activatePerformanceAccountInTransaction(
  trx: Db,
  params: ActivatePerformanceAccountParams,
): Promise<ActivatedPerformanceAccount> {
  const timestamp = params.now?.() ?? new Date();

  const existing = await trx
    .selectFrom('app.trading_accounts')
    .select(['id', 'public_id', 'status'])
    .where('source_evaluation_account_id', '=', params.evaluationAccountId)
    .executeTakeFirst();

  if (existing) {
    return {
      id: existing.id,
      publicId: existing.public_id,
      status: existing.status,
      alreadyExisted: true,
    };
  }

  const policyVersion = await loadPublishedPolicy(trx, 'WARIBA_PERFORMANCE');
  const symbolSpecSet = await loadLatestSandboxSymbolSpecSet(trx);

  const publicId = `PERF-${params.nominalBalance.split('.')[0]}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const account = await trx
    .insertInto('app.trading_accounts')
    .values({
      public_id: publicId,
      user_id: params.userId,
      source_purchase_order_id: null,
      source_evaluation_account_id: params.evaluationAccountId,
      program_type: 'WARIBA_PERFORMANCE',
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
      reason: 'evaluation_passed',
    })
    .execute();

  // No purchase_order-derived initial_balance ledger entry — nothing was
  // purchased. This is the Performance nominal reset (TRD-... none yet;
  // see DECISION_LOG PERF-020's "nominal reset" clause): a fresh ledger,
  // not the Evaluation account's carried-over balance.
  await trx
    .insertInto('app.trading_ledger_entries')
    .values({
      account_id: account.id,
      entry_type: 'initial_balance',
      amount: params.nominalBalance,
      currency: params.currency,
    })
    .execute();

  await trx
    .insertInto('app.outbox_events')
    .values({
      aggregate_type: 'trading_account',
      aggregate_id: account.id,
      event_type: 'performance.activated',
      payload: JSON.stringify({
        accountId: account.id,
        publicId: account.public_id,
        userId: params.userId,
        sourceEvaluationAccountId: params.evaluationAccountId,
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

/** Loads a user's active Performance account, if any — used by snapshot/UI code that needs to know whether one exists without caring about its id ahead of time. */
export async function findActivePerformanceAccountForUser(
  trx: Db,
  userId: string,
): Promise<{ id: string; publicId: string } | null> {
  const row = await trx
    .selectFrom('app.trading_accounts')
    .select(['id', 'public_id'])
    .where('user_id', '=', userId)
    .where('program_type', '=', 'WARIBA_PERFORMANCE')
    .where('status', 'in', ['active', 'soft_locked'])
    .executeTakeFirst();
  return row ? { id: row.id, publicId: row.public_id } : null;
}
