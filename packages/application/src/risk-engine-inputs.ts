import {
  evaluateAccountRisk,
  ensureTodaySnapshot,
  loadPolicyById,
  loadAccountBalanceProjection,
  type Db,
  type RiskEngineResult,
  type DailySnapshotInput,
} from '@wariba/database';
import type { EvaluationAccountStatus } from '@wariba/domain';
import { resolveProfitEligibilityPolicy, type LoadedPolicy } from '@wariba/policies';

export interface AccountRiskEngineInputs {
  accountId: string;
  accountStatus: EvaluationAccountStatus;
  nominalBalance: string;
  activatedAt: Date | null;
  policy: LoadedPolicy;
  currentBalance: string;
  programEligibleBalance: string;
  openPositionCount: number;
  result: RiskEngineResult;
}

/**
 * Thrown when an account references a program the risk engine does not
 * support. Both published V1 programs are supported; this remains a typed
 * guard for future program additions rather than a Performance exclusion.
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
  program_sod_balance: string;
  program_eod_balance: string | null;
  highest_program_eod_balance_after: string | null;
  eligible_realized_net_profit_for_day: string | null;
}): DailySnapshotInput {
  return {
    tradingDay: row.trading_day,
    status: row.status,
    dailyReference: row.daily_reference,
    maximumLossFloorBefore: row.maximum_loss_floor_before,
    eodBalance: row.eod_balance,
    maximumLossFloorAfter: row.maximum_loss_floor_after,
    realizedNetProfitForDay: row.realized_net_profit_for_day,
    programSodBalance: row.program_sod_balance,
    programEodBalance: row.program_eod_balance,
    highestProgramEodBalanceAfter: row.highest_program_eod_balance_after,
    eligibleRealizedNetProfitForDay: row.eligible_realized_net_profit_for_day,
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

  const policy = await loadPolicyById(db, account.policy_version_id);
  const eligibilityPolicy = resolveProfitEligibilityPolicy(policy.parameters);

  const projection = await loadAccountBalanceProjection(
    db,
    account.id,
    undefined,
    eligibilityPolicy.enabled,
  );
  const currentBalance = projection.accountBalance;

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
    programSodBalance: projection.programEligibleBalance,
    riskSodBalance: projection.riskAdjustedBalance,
    riskSodEquity: projection.riskAdjustedBalance,
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
      'program_sod_balance',
      'program_eod_balance',
      'highest_program_eod_balance_after',
      'eligible_realized_net_profit_for_day',
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
    currentProgramEligibleBalance: projection.programEligibleBalance,
    currentRiskAdjustedBalance: projection.riskAdjustedBalance,
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
    programEligibleBalance: projection.programEligibleBalance,
    openPositionCount: openPositions.length,
    result,
  };
}
