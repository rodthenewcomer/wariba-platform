import Decimal from 'decimal.js';
import {
  evaluateAccountRisk,
  ensureTodaySnapshot,
  loadPolicyById,
  type Db,
  type RiskEngineResult,
  type DailySnapshotInput,
} from '@wariba/database';
import type { EvaluationAccountStatus } from '@wariba/domain';
import type { LoadedPolicy } from '@wariba/policies';

export interface AccountRiskEngineInputs {
  accountId: string;
  accountStatus: EvaluationAccountStatus;
  nominalBalance: string;
  activatedAt: Date | null;
  policy: LoadedPolicy;
  currentBalance: string;
  openPositionCount: number;
  result: RiskEngineResult;
}

/**
 * Thrown when an account's program has no published policy to evaluate risk
 * against (WARIBA_PERFORMANCE today — no policy has been published for it
 * yet). Callers must catch this and render an honest "not available yet"
 * state rather than let it surface as an unhandled crash — this is the
 * Prompt 06 STOP CONDITION ("aucune donnée nécessaire côté serveur") made
 * catchable instead of a hard failure.
 */
export class UnsupportedProgramError extends Error {
  constructor(public readonly programType: string) {
    super(`No published policy exists for program "${programType}" yet.`);
    this.name = 'UnsupportedProgramError';
  }
}

function toDailySnapshotInput(row: {
  trading_day: string;
  status: 'open' | 'finalized';
  daily_reference: string;
  maximum_loss_floor_before: string;
  eod_balance: string | null;
  maximum_loss_floor_after: string | null;
  realized_net_profit_for_day: string | null;
}): DailySnapshotInput {
  return {
    tradingDay: row.trading_day,
    status: row.status,
    dailyReference: row.daily_reference,
    maximumLossFloorBefore: row.maximum_loss_floor_before,
    eodBalance: row.eod_balance,
    maximumLossFloorAfter: row.maximum_loss_floor_after,
    realizedNetProfitForDay: row.realized_net_profit_for_day,
  };
}

/**
 * Shared read-only loader behind account_risk_view and account_mission_view
 * (Prompt 06). Reuses the exact @wariba/policies risk engine already tested
 * in Prompt 05 — no financial math is duplicated here, only composition.
 *
 * DECISION (approved 2026-08-04, see DECISION_LOG.md): the Hub shows risk
 * computed from *realized* balance only (currentUnrealizedPnl is always
 * "0"). No stored per-position mark price exists to compute unrealized PnL
 * outside the live WariX WebSocket session, and WARIBA ONE's own profit
 * target already counts realized profit exclusively — so this is the
 * accurate, honest figure for the Hub, not an approximation of a richer one.
 *
 * Only callable once an account has left `pending_activation` — callers
 * must branch on that status before reaching here (no risk to evaluate on
 * an account that has never been funded/activated).
 */
export async function loadAccountRiskEngineInputs(
  db: Db,
  params: { accountId: string; now: Date },
): Promise<AccountRiskEngineInputs> {
  const account = await db
    .selectFrom('app.trading_accounts')
    .select([
      'id',
      'status',
      'nominal_balance',
      'policy_version_id',
      'program_type',
      'activated_at',
    ])
    .where('id', '=', params.accountId)
    .executeTakeFirstOrThrow(
      () => new Error(`loadAccountRiskEngineInputs: account ${params.accountId} not found.`),
    );

  if (account.program_type !== 'WARIBA_ONE') {
    throw new UnsupportedProgramError(account.program_type);
  }

  const policy = await loadPolicyById(db, account.policy_version_id);

  const ledgerEntries = await db
    .selectFrom('app.trading_ledger_entries')
    .select('amount')
    .where('account_id', '=', account.id)
    .execute();
  const currentBalance = ledgerEntries
    .reduce((sum, entry) => sum.plus(entry.amount), new Decimal(0))
    .toFixed(2);

  const openPositions = await db
    .selectFrom('app.positions')
    .select('id')
    .where('account_id', '=', account.id)
    .where('status', '=', 'open')
    .execute();

  const today = await ensureTodaySnapshot(db, {
    accountId: account.id,
    nominalBalance: account.nominal_balance,
    policyVersionId: policy.id,
    maximumLossRate: policy.parameters.maximum_loss_rate,
    sodBalance: currentBalance,
    sodEquity: currentBalance,
    now: params.now,
  });

  const historicalSnapshots = await db
    .selectFrom('app.account_daily_snapshots')
    .select([
      'trading_day',
      'status',
      'daily_reference',
      'maximum_loss_floor_before',
      'eod_balance',
      'maximum_loss_floor_after',
      'realized_net_profit_for_day',
    ])
    .where('account_id', '=', account.id)
    .where('trading_day', '<', today.trading_day)
    .orderBy('trading_day', 'asc')
    .execute();

  const dailySnapshots: DailySnapshotInput[] = [
    ...historicalSnapshots.map(toDailySnapshotInput),
    toDailySnapshotInput(today),
  ];

  const result = evaluateAccountRisk({
    clock: { now: () => params.now },
    account: {
      id: account.id,
      status: account.status,
      nominalBalance: account.nominal_balance,
    },
    policy: policy.parameters,
    currentBalance,
    currentUnrealizedPnl: '0', // realized-only decision — see doc comment above.
    openPositionCount: openPositions.length,
    pendingOrderCount: 0, // TRD-021: no order-level partial fills — nothing is ever "pending".
    dailySnapshots,
  });

  return {
    accountId: account.id,
    accountStatus: account.status,
    nominalBalance: account.nominal_balance,
    activatedAt: account.activated_at,
    policy,
    currentBalance,
    openPositionCount: openPositions.length,
    result,
  };
}
