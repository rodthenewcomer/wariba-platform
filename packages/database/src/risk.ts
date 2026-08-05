import Decimal from 'decimal.js';
import {
  assertEvaluationAccountTransition,
  computeRealizedPnl,
  quotedPrice,
  type EvaluationAccountStatus,
} from '@wariba/domain';
import {
  evaluateAccountRisk,
  resolveProfitEligibilityPolicy,
  type DailySnapshotInput,
  type RiskEngineResult,
} from '@wariba/policies';
import { lockAccount, loadSymbolSpec, type LockedAccount, type MarketSnapshot } from './accounts';
import type { Db } from './client';
import {
  ensureDailyBoundaryCaughtUpInTransaction,
  ensureTodaySnapshot,
} from './daily-finalization';
import { loadPolicyById } from './policy';
import { loadAccountBalanceProjection } from './program-eligibility';
import type { TradableSymbol } from './schema';

export interface EvaluateAndApplyRiskParams {
  accountId: string;
  now: Date;
  /** Live quotes for every symbol the account may hold a position in — a
   * missing symbol excludes that position's unrealized PnL from this
   * evaluation's equity figure rather than treating it as zero risk. */
  marketBySymbol: Partial<Record<TradableSymbol, MarketSnapshot>>;
  triggerEventType: 'trade_order' | 'daily_finalization' | 'manual_review';
  triggerEventId?: string;
}

export interface RiskEvaluationOutcome {
  accountId: string;
  previousStatus: EvaluationAccountStatus;
  newStatus: EvaluationAccountStatus;
  transitioned: boolean;
  result: RiskEngineResult;
}

const TRANSITION_REASON: Record<string, string> = {
  'active->soft_locked': 'daily_loss_limit_reached',
  'soft_locked->active': 'daily_loss_limit_reset',
  'active->breached': 'maximum_loss_breach',
  'soft_locked->breached': 'maximum_loss_breach',
  'pass_pending->breached': 'maximum_loss_breach',
  'active->pass_pending': 'evaluation_target_reached',
  'soft_locked->pass_pending': 'evaluation_target_reached',
  'pass_pending->passed': 'evaluation_pass_finalized',
};

function reasonForTransition(from: EvaluationAccountStatus, to: EvaluationAccountStatus): string {
  const reason = TRANSITION_REASON[`${from}->${to}`];
  if (!reason) {
    throw new Error(`No evidence reason mapped for risk transition ${from} -> ${to}`);
  }
  return reason;
}

async function loadAccountFinancials(
  trx: Db,
  account: Pick<LockedAccount, 'id' | 'symbol_spec_set_id'>,
  marketBySymbol: Partial<Record<TradableSymbol, MarketSnapshot>>,
  eligibilityEnabled: boolean,
): Promise<{
  balance: string;
  programEligibleBalance: string;
  equity: string;
  programEligibleEquity: string;
  openPositionCount: number;
}> {
  const projection = await loadAccountBalanceProjection(
    trx,
    account.id,
    undefined,
    eligibilityEnabled,
  );
  const balance = projection.accountBalance;

  const openPositions = await trx
    .selectFrom('app.positions')
    .selectAll()
    .where('account_id', '=', account.id)
    .where('status', '=', 'open')
    .execute();

  let unrealizedTotal = new Decimal(0);
  for (const position of openPositions) {
    const market = marketBySymbol[position.symbol];
    if (!market) continue;
    const spec = await loadSymbolSpec(trx, account.symbol_spec_set_id, position.symbol);
    if (!spec) continue;
    const closePrice = quotedPrice({
      bid: market.bid,
      ask: market.ask,
      positionSide: position.side,
      action: 'close',
    });
    const unrealized = computeRealizedPnl({
      openPrice: position.average_open_price,
      closePrice,
      quantity: position.open_quantity,
      contractSize: spec.contract_size,
      positionSide: position.side,
    });
    unrealizedTotal = unrealizedTotal.plus(unrealized);
  }

  const equity = new Decimal(balance).plus(unrealizedTotal).toFixed(2);
  const programEligibleEquity = new Decimal(projection.programEligibleBalance)
    .plus(unrealizedTotal)
    .toFixed(2);
  return {
    balance,
    programEligibleBalance: projection.programEligibleBalance,
    equity,
    programEligibleEquity,
    openPositionCount: openPositions.length,
  };
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
 * Prompt 05 risk orchestration — the only DB-touching entry point into the
 * risk engine. Always re-locks the account (a `FOR UPDATE` on a row already
 * locked by the caller in the same transaction is a safe no-op in
 * Postgres), so it's callable either standalone (own transaction, e.g. the
 * daily-finalization worker in a later prompt) or nested inside
 * trading.ts's existing open/close/modify transaction via the
 * `InTransaction` variant below.
 *
 * Idempotent: the status transition is self-idempotent (recomputing from
 * the current row always reaches the same conclusion), and evidence rows in
 * app.risk_violations are deduplicated by
 * unique(trigger_event_type, trigger_event_id, rule_code) — a retry with
 * the same triggerEventId writes no additional evidence.
 */
export async function evaluateAndApplyAccountRisk(
  db: Db,
  params: EvaluateAndApplyRiskParams,
): Promise<RiskEvaluationOutcome> {
  return db.transaction().execute((trx) => evaluateAndApplyAccountRiskInTransaction(trx, params));
}

export async function evaluateAndApplyAccountRiskInTransaction(
  trx: Db,
  params: EvaluateAndApplyRiskParams,
): Promise<RiskEvaluationOutcome> {
  let account = await lockAccount(trx, params.accountId);
  const policy = await loadPolicyById(trx, account.policy_version_id);
  const eligibilityPolicy = resolveProfitEligibilityPolicy(policy.parameters);
  const { balance, programEligibleBalance, equity, programEligibleEquity, openPositionCount } =
    await loadAccountFinancials(trx, account, params.marketBySymbol, eligibilityPolicy.enabled);

  // Self-heal a stale prior-day snapshot before ensureTodaySnapshot below —
  // otherwise a trade landing on a new UTC day before the worker has
  // finalized the previous one would silently bootstrap "today" from the
  // live balance and orphan the true prior day forever. See
  // ensureDailyBoundaryCaughtUpInTransaction's doc comment in
  // daily-finalization.ts.
  await ensureDailyBoundaryCaughtUpInTransaction(trx, {
    account,
    policy,
    eligibilityEnabled: eligibilityPolicy.enabled,
    now: params.now,
  });
  // Re-read: a boundary catch-up above may have reset a soft-locked
  // account's status to 'active' (DLL reset at the next daily boundary) —
  // `account` must reflect that before `previousStatus` is captured below,
  // or the transition-assertion further down would work from a stale
  // status and could reject (or misrecord) a perfectly valid transition.
  account = await lockAccount(trx, account.id);

  const today = await ensureTodaySnapshot(trx, {
    accountId: account.id,
    nominalBalance: account.nominal_balance,
    policyVersionId: policy.id,
    maximumLossRate: policy.parameters.maximum_loss_rate,
    sodBalance: balance,
    sodEquity: equity,
    programSodBalance: programEligibleBalance,
    programSodEquity: programEligibleEquity,
    now: params.now,
  });

  const historicalSnapshots = await trx
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

  const previousStatus = account.status;
  const result = evaluateAccountRisk({
    clock: { now: () => params.now },
    account: { id: account.id, status: previousStatus, nominalBalance: account.nominal_balance },
    policy: policy.parameters,
    currentBalance: balance,
    currentProgramEligibleBalance: programEligibleBalance,
    currentUnrealizedPnl: new Decimal(equity).minus(balance).toFixed(2),
    openPositionCount,
    pendingOrderCount: 0, // TRD-021: no order-level partial fills — nothing is ever left "pending" to query.
    dailySnapshots,
  });

  // V1 has no manual-review workflow: once an account is already sitting in
  // pass_pending and the engine confirms it's still eligible (a breach would
  // have produced 'breached' instead, never 'pass_pending'), auto-finalize
  // rather than leave it stuck waiting on a review step that doesn't exist.
  const targetStatus: EvaluationAccountStatus =
    previousStatus === 'pass_pending' && result.recommendedStatus === 'pass_pending'
      ? 'passed'
      : result.recommendedStatus;

  const transitioned = targetStatus !== previousStatus;
  let transitionId: string | null = null;
  if (transitioned) {
    assertEvaluationAccountTransition(previousStatus, targetStatus);
    await trx
      .updateTable('app.trading_accounts')
      .set({ status: targetStatus, updated_at: params.now })
      .where('id', '=', account.id)
      .execute();
    const transitionRow = await trx
      .insertInto('app.account_state_transitions')
      .values({
        account_id: account.id,
        from_status: previousStatus,
        to_status: targetStatus,
        reason: reasonForTransition(previousStatus, targetStatus),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    transitionId = transitionRow.id;
  }

  for (const violation of result.violations) {
    await trx
      .insertInto('app.risk_violations')
      .values({
        account_id: account.id,
        rule_code: violation.ruleCode,
        severity: violation.severity,
        consequence: violation.consequence,
        policy_version_id: policy.id,
        threshold_value: violation.thresholdValue,
        observed_value: violation.observedValue,
        account_daily_snapshot_id: today.id,
        account_state_transition_id: transitionId,
        trigger_event_type: params.triggerEventType,
        trigger_event_id: params.triggerEventId ?? null,
        price_snapshot: JSON.stringify(params.marketBySymbol),
      })
      .onConflict((oc) =>
        oc.columns(['trigger_event_type', 'trigger_event_id', 'rule_code']).doNothing(),
      )
      .execute();
  }

  return {
    accountId: account.id,
    previousStatus,
    newStatus: targetStatus,
    transitioned,
    result,
  };
}
