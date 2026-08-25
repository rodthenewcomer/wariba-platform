import type { Db, DbExecutor } from './client';
import type { ContestationTargetType, RiskViolationRuleCode } from './schema';

/**
 * Phase 3.2 — the authoritative record behind a contested decision.
 *
 * ## Why one loader serves both sides
 *
 * The trader and the operator read this through the same function. A dispute
 * in which the two parties are looking at different renderings of the same
 * event is a dispute that cannot be settled — the trader says the threshold was
 * X, the operator's screen says Y, and neither can tell whether the disagreement
 * is about the facts or about the software. So the projection is written once
 * and the two surfaces differ only in what they are permitted to see beyond it
 * (staff notes, internal ids), never in the evidence itself.
 *
 * ## Nothing here is stored on the contestation
 *
 * Every value is read live from `app.risk_violations` and its neighbours at
 * render time. `app.contestations.evidence_ref` holds identifiers only. The
 * moment a threshold is copied into the dispute record it becomes a second,
 * editable version of a financial fact, and the first time the two disagree
 * nobody can say which is true.
 */

export interface ContestedOrderEvidence {
  orderId: string;
  orderType: string;
  symbol: string | null;
  side: string | null;
  status: string;
  requestedQuantity: string | null;
  filledQuantity: string;
  rejectionCode: string | null;
  receivedAt: Date;
  completedAt: Date | null;
  fills: readonly {
    fillId: string;
    fillType: string;
    quantity: string;
    price: string;
    spreadPoints: string;
    slippagePoints: string;
    realizedPnl: string;
    marketSequence: string;
    occurredAt: Date;
  }[];
}

export interface ContestedDecisionEvidence {
  targetType: ContestationTargetType;
  targetId: string;
  account: {
    accountId: string;
    accountPublicId: string;
    programType: string;
    status: string;
  };
  violation: {
    ruleCode: RiskViolationRuleCode;
    severity: string;
    consequence: string;
    thresholdValue: string | null;
    observedValue: string | null;
    triggerEventType: string;
    triggerEventId: string | null;
    /** Server-side prices at evaluation time. Never a client-supplied quote. */
    priceSnapshot: unknown;
    calculationVersion: string;
    occurredAt: Date;
  };
  policy: {
    policyVersionId: string;
    program: string;
    semanticVersion: string;
    status: string;
    machineHash: string | null;
  };
  /** The status change this decision produced, when it produced one. */
  transition: {
    fromStatus: string | null;
    toStatus: string;
    reason: string;
    occurredAt: Date;
  } | null;
  /** The trading day the decision was measured against. */
  snapshot: {
    tradingDay: string;
    dailyReference: string;
    maximumLossFloorBefore: string;
    maximumLossFloorAfter: string | null;
    sodBalance: string;
    eodBalance: string | null;
    status: string;
  } | null;
  /** Present when a specific order triggered the evaluation. */
  order: ContestedOrderEvidence | null;
}

/**
 * The identifiers pinned onto the contestation at creation.
 *
 * Stored so that a later reader can prove *which* records the dispute was
 * opened against, even if the account has since accumulated others. They are
 * pointers, not a copy: rendering still goes through `loadContestedDecisionEvidence`.
 */
export interface ContestationEvidenceRef {
  riskViolationId: string;
  policyVersionId: string;
  accountDailySnapshotId: string | null;
  accountStateTransitionId: string | null;
  triggerEventType: string;
  triggerEventId: string | null;
  /** The correlation id of the request that opened the contestation. */
  correlationId: string;
}

/**
 * Loads a risk decision and everything that produced it.
 *
 * `accountId` is required and matched in the query rather than checked
 * afterwards: without it a violation id from another trader's account would
 * load, and evidence linkage would become an enumeration oracle.
 */
export async function loadContestedDecisionEvidence(
  db: DbExecutor,
  params: {
    targetType: ContestationTargetType;
    targetId: string;
    accountId: string;
  },
): Promise<ContestedDecisionEvidence | null> {
  const violation = await db
    .selectFrom('app.risk_violations')
    .innerJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.risk_violations.account_id')
    .innerJoin(
      'app.policy_versions',
      'app.policy_versions.id',
      'app.risk_violations.policy_version_id',
    )
    .select([
      'app.risk_violations.id as violation_id',
      'app.risk_violations.rule_code as rule_code',
      'app.risk_violations.severity as severity',
      'app.risk_violations.consequence as consequence',
      'app.risk_violations.threshold_value as threshold_value',
      'app.risk_violations.observed_value as observed_value',
      'app.risk_violations.account_daily_snapshot_id as snapshot_id',
      'app.risk_violations.account_state_transition_id as transition_id',
      'app.risk_violations.trigger_event_type as trigger_event_type',
      'app.risk_violations.trigger_event_id as trigger_event_id',
      'app.risk_violations.price_snapshot as price_snapshot',
      'app.risk_violations.calculation_version as calculation_version',
      'app.risk_violations.occurred_at as occurred_at',
      'app.trading_accounts.id as account_id',
      'app.trading_accounts.public_id as account_public_id',
      'app.trading_accounts.program_type as program_type',
      'app.trading_accounts.status as account_status',
      'app.policy_versions.id as policy_version_id',
      'app.policy_versions.program as policy_program',
      'app.policy_versions.semantic_version as policy_semantic_version',
      'app.policy_versions.status as policy_status',
      'app.policy_versions.machine_hash as policy_machine_hash',
    ])
    .where('app.risk_violations.id', '=', params.targetId)
    .where('app.risk_violations.account_id', '=', params.accountId)
    .executeTakeFirst();
  if (!violation) return null;

  const [transition, snapshot, order] = await Promise.all([
    violation.transition_id
      ? db
          .selectFrom('app.account_state_transitions')
          .select(['from_status', 'to_status', 'reason', 'occurred_at'])
          .where('id', '=', violation.transition_id)
          .executeTakeFirst()
      : Promise.resolve(undefined),
    violation.snapshot_id
      ? db
          .selectFrom('app.account_daily_snapshots')
          .select([
            'trading_day',
            'daily_reference',
            'maximum_loss_floor_before',
            'maximum_loss_floor_after',
            'sod_balance',
            'eod_balance',
            'status',
          ])
          .where('id', '=', violation.snapshot_id)
          .executeTakeFirst()
      : Promise.resolve(undefined),
    violation.trigger_event_type === 'trade_order' && violation.trigger_event_id
      ? db
          .selectFrom('app.trade_orders')
          .select([
            'id',
            'order_type',
            'symbol',
            'side',
            'status',
            'requested_quantity',
            'filled_quantity',
            'rejection_code',
            'received_at',
            'completed_at',
          ])
          .where('id', '=', violation.trigger_event_id)
          .where('account_id', '=', params.accountId)
          .executeTakeFirst()
      : Promise.resolve(undefined),
  ]);

  const fills = order
    ? await db
        .selectFrom('app.fills')
        .select([
          'id',
          'fill_type',
          'quantity',
          'price',
          'spread_points',
          'slippage_points',
          'realized_pnl',
          'market_sequence',
          'occurred_at',
        ])
        .where('order_id', '=', order.id)
        .orderBy('occurred_at', 'asc')
        .execute()
    : [];

  return {
    targetType: params.targetType,
    targetId: violation.violation_id,
    account: {
      accountId: violation.account_id,
      accountPublicId: violation.account_public_id,
      programType: violation.program_type,
      status: violation.account_status,
    },
    violation: {
      ruleCode: violation.rule_code,
      severity: violation.severity,
      consequence: violation.consequence,
      thresholdValue: violation.threshold_value,
      observedValue: violation.observed_value,
      triggerEventType: violation.trigger_event_type,
      triggerEventId: violation.trigger_event_id,
      priceSnapshot: violation.price_snapshot,
      calculationVersion: violation.calculation_version,
      occurredAt: violation.occurred_at,
    },
    policy: {
      policyVersionId: violation.policy_version_id,
      program: violation.policy_program,
      semanticVersion: violation.policy_semantic_version,
      status: violation.policy_status,
      machineHash: violation.policy_machine_hash,
    },
    transition: transition
      ? {
          fromStatus: transition.from_status,
          toStatus: transition.to_status,
          reason: transition.reason,
          occurredAt: transition.occurred_at,
        }
      : null,
    snapshot: snapshot
      ? {
          tradingDay: snapshot.trading_day,
          dailyReference: snapshot.daily_reference,
          maximumLossFloorBefore: snapshot.maximum_loss_floor_before,
          maximumLossFloorAfter: snapshot.maximum_loss_floor_after,
          sodBalance: snapshot.sod_balance,
          eodBalance: snapshot.eod_balance,
          status: snapshot.status,
        }
      : null,
    order: order
      ? {
          orderId: order.id,
          orderType: order.order_type,
          symbol: order.symbol,
          side: order.side,
          status: order.status,
          requestedQuantity: order.requested_quantity,
          filledQuantity: order.filled_quantity,
          rejectionCode: order.rejection_code,
          receivedAt: order.received_at,
          completedAt: order.completed_at,
          fills: fills.map((fill) => ({
            fillId: fill.id,
            fillType: fill.fill_type,
            quantity: fill.quantity,
            price: fill.price,
            spreadPoints: fill.spread_points,
            slippagePoints: fill.slippage_points,
            realizedPnl: fill.realized_pnl,
            marketSequence: fill.market_sequence,
            occurredAt: fill.occurred_at,
          })),
        }
      : null,
  };
}

export interface ContestableDecision {
  riskViolationId: string;
  ruleCode: RiskViolationRuleCode;
  consequence: string;
  thresholdValue: string | null;
  observedValue: string | null;
  occurredAt: Date;
  policyVersionId: string;
  accountDailySnapshotId: string | null;
  accountStateTransitionId: string | null;
  triggerEventType: string;
  triggerEventId: string | null;
  /** Set when a live contestation already exists for this decision. */
  existingContestationPublicId: string | null;
}

/**
 * The decisions on this account a trader may contest.
 *
 * Only recorded consequences that actually restricted the account: a
 * `hard_breach` ended it, a `soft_lock` stopped trading for a session, an
 * `entry_lock` blocked entries. An informational warning changed nothing and
 * there is nothing to contest about it — offering one would turn the
 * contestation queue into a second inbox for questions.
 *
 * Scoped by `userId` through the account join, so a violation on somebody
 * else's account is not merely hidden but unreachable.
 */
export async function listContestableDecisions(
  db: Db,
  params: { userId: string; accountId: string },
): Promise<readonly ContestableDecision[]> {
  const rows = await db
    .selectFrom('app.risk_violations')
    .innerJoin('app.trading_accounts', 'app.trading_accounts.id', 'app.risk_violations.account_id')
    .leftJoin('app.contestations', (join) =>
      join
        .onRef('app.contestations.target_id', '=', 'app.risk_violations.id')
        .on('app.contestations.status', 'in', ['open', 'under_review', 'needs_information']),
    )
    .select([
      'app.risk_violations.id as violation_id',
      'app.risk_violations.rule_code as rule_code',
      'app.risk_violations.consequence as consequence',
      'app.risk_violations.threshold_value as threshold_value',
      'app.risk_violations.observed_value as observed_value',
      'app.risk_violations.occurred_at as occurred_at',
      'app.risk_violations.policy_version_id as policy_version_id',
      'app.risk_violations.account_daily_snapshot_id as snapshot_id',
      'app.risk_violations.account_state_transition_id as transition_id',
      'app.risk_violations.trigger_event_type as trigger_event_type',
      'app.risk_violations.trigger_event_id as trigger_event_id',
      'app.contestations.public_id as contestation_public_id',
    ])
    .where('app.risk_violations.account_id', '=', params.accountId)
    .where('app.trading_accounts.user_id', '=', params.userId)
    .where('app.risk_violations.consequence', 'in', ['hard_breach', 'soft_lock', 'entry_lock'])
    .orderBy('app.risk_violations.occurred_at', 'desc')
    .limit(20)
    .execute();

  return rows.map((row) => ({
    riskViolationId: row.violation_id,
    ruleCode: row.rule_code,
    consequence: row.consequence,
    thresholdValue: row.threshold_value,
    observedValue: row.observed_value,
    occurredAt: row.occurred_at,
    policyVersionId: row.policy_version_id,
    accountDailySnapshotId: row.snapshot_id,
    accountStateTransitionId: row.transition_id,
    triggerEventType: row.trigger_event_type,
    triggerEventId: row.trigger_event_id,
    existingContestationPublicId: row.contestation_public_id,
  }));
}
