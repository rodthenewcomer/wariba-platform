import { sql } from 'kysely';
import type { Db } from './client';
import type { TradingAccountStatusColumn } from './schema';

/**
 * Prompt 09 — the Accounts explorer read model.
 *
 * Search, filter, count and page in PostgreSQL, and — for the detail page —
 * fetch strictly the sections the caller was authorized for. The section set
 * is decided by the caller's role before this module runs; nothing here
 * fetches an unauthorized domain "just in case" and leaves it to the page to
 * hide, because data that was never queried cannot leak through a render
 * tree, a log line or an error report.
 *
 * Read-only: queries only. Control gains no way to edit an account, a
 * balance, a ledger entry or a fill.
 */
export type AccountDetailSection =
  | 'overview'
  | 'trading'
  | 'risk'
  | 'payout'
  | 'audit_evidence'
  | 'incident_evidence'
  | 'reconciliation_evidence';

export interface ControlAccountRow {
  id: string;
  publicId: string;
  userId: string;
  userEmail: string | null;
  programType: string;
  nominalBalance: string;
  currency: string;
  status: string;
  integrityHold: boolean;
  kycSandboxVerified: boolean;
  payoutMethodSandboxConfigured: boolean;
  activatedAt: Date | null;
  createdAt: Date;
  openPayoutRequests: number;
}

export interface ControlAccountPage {
  accounts: readonly ControlAccountRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ControlAccountFilters {
  /** Matches the public account id or the owner's email. */
  query?: string;
  /** Narrowed to the real column unions so an unknown value cannot reach SQL. */
  program?: 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_PERFORMANCE';
  status?: TradingAccountStatusColumn;
  nominalBalance?: string;
  integrityHold?: boolean;
  /** Accounts with at least one payout request awaiting a decision. */
  payoutPending?: boolean;
}

export const CONTROL_ACCOUNTS_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const NON_TERMINAL_PAYOUT_STATUSES = [
  'pending_review',
  'needs_information',
  'approved',
  'processing',
] as const;

export async function searchControlAccounts(
  db: Db,
  params: { filters?: ControlAccountFilters; page?: number; pageSize?: number } = {},
): Promise<ControlAccountPage> {
  const filters = params.filters ?? {};
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? CONTROL_ACCOUNTS_PAGE_SIZE),
  );

  // Escaped so a `%` typed into the search box matches that character, not
  // every account on the platform.
  const trimmed = filters.query?.trim();
  const pattern = trimmed ? `%${trimmed.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;

  let base = db
    .selectFrom('app.trading_accounts')
    .leftJoin('auth.users', 'auth.users.id', 'app.trading_accounts.user_id');

  if (pattern) {
    base = base.where((eb) =>
      eb.or([
        eb('app.trading_accounts.public_id', 'ilike', pattern),
        eb(sql<string>`coalesce(${eb.ref('auth.users.email')}, '')`, 'ilike', pattern),
      ]),
    );
  }
  if (filters.program) base = base.where('app.trading_accounts.program_type', '=', filters.program);
  if (filters.status) base = base.where('app.trading_accounts.status', '=', filters.status);
  if (filters.nominalBalance) {
    base = base.where('app.trading_accounts.nominal_balance', '=', filters.nominalBalance);
  }
  if (filters.integrityHold !== undefined) {
    base = base.where('app.trading_accounts.integrity_hold', '=', filters.integrityHold);
  }
  if (filters.payoutPending) {
    base = base.where((eb) =>
      eb.exists(
        eb
          .selectFrom('app.payout_requests')
          .select('app.payout_requests.id')
          .whereRef('app.payout_requests.account_id', '=', 'app.trading_accounts.id')
          .where('app.payout_requests.status', 'in', [...NON_TERMINAL_PAYOUT_STATUSES]),
      ),
    );
  }

  const [rows, totals] = await Promise.all([
    base
      .select((eb) => [
        'app.trading_accounts.id',
        'app.trading_accounts.public_id',
        'app.trading_accounts.user_id',
        'auth.users.email',
        'app.trading_accounts.program_type',
        'app.trading_accounts.nominal_balance',
        'app.trading_accounts.currency',
        'app.trading_accounts.status',
        'app.trading_accounts.integrity_hold',
        'app.trading_accounts.kyc_sandbox_verified',
        'app.trading_accounts.payout_method_sandbox_configured',
        'app.trading_accounts.activated_at',
        'app.trading_accounts.created_at',
        eb
          .selectFrom('app.payout_requests')
          .select((inner) => inner.fn.countAll().as('count'))
          .whereRef('app.payout_requests.account_id', '=', 'app.trading_accounts.id')
          .where('app.payout_requests.status', 'in', [...NON_TERMINAL_PAYOUT_STATUSES])
          .as('open_payouts'),
      ])
      .orderBy('app.trading_accounts.created_at', 'desc')
      .orderBy('app.trading_accounts.id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute(),
    base.select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
  ]);

  return {
    accounts: rows.map((row) => ({
      id: row.id,
      publicId: row.public_id,
      userId: row.user_id,
      userEmail: row.email,
      programType: row.program_type,
      nominalBalance: row.nominal_balance,
      currency: row.currency,
      status: row.status,
      integrityHold: row.integrity_hold,
      kycSandboxVerified: row.kyc_sandbox_verified,
      payoutMethodSandboxConfigured: row.payout_method_sandbox_configured,
      activatedAt: row.activated_at,
      createdAt: row.created_at,
      openPayoutRequests: Number(row.open_payouts ?? 0),
    })),
    total: Number(totals?.count ?? 0),
    page,
    pageSize,
  };
}

export interface AccountOverviewSection {
  id: string;
  publicId: string;
  userId: string;
  userEmail: string | null;
  programType: string;
  nominalBalance: string;
  currency: string;
  status: string;
  policyVersion: string;
  policyStatus: string;
  kycSandboxVerified: boolean;
  payoutMethodSandboxConfigured: boolean;
  activatedAt: Date | null;
  createdAt: Date;
  sourceEvaluation: { id: string; publicId: string } | null;
  performanceChild: { id: string; publicId: string } | null;
}

export interface AccountTradingSection {
  openPositions: readonly {
    id: string;
    symbol: string;
    side: string;
    openQuantity: string;
    averageOpenPrice: string;
    stopLoss: string | null;
    takeProfit: string | null;
    openedAt: Date;
  }[];
  pendingOrders: readonly {
    id: string;
    symbol: string;
    orderType: string;
    quantity: string;
    triggerPrice: string;
    status: string;
    createdAt: Date;
  }[];
  recentOrders: readonly {
    id: string;
    symbol: string | null;
    orderType: string;
    status: string;
    rejectionCode: string | null;
    idempotencyKey: string;
    createdAt: Date;
  }[];
  realizedPnl: string;
  ineligibleShortDurationProfit: string;
}

export interface AccountRiskSection {
  integrityHold: boolean;
  integrityHoldReason: string | null;
  integrityHoldSetAt: Date | null;
  violations: readonly {
    ruleCode: string;
    severity: string;
    consequence: string;
    thresholdValue: string | null;
    observedValue: string | null;
    occurredAt: Date;
  }[];
  latestSnapshot: {
    tradingDay: string;
    dailyReference: string;
    maximumLossFloorBefore: string;
    maximumLossFloorAfter: string | null;
    status: string;
  } | null;
}

export interface AccountPayoutSection {
  currentCycle: { cycleNumber: number; status: string } | null;
  requests: readonly {
    id: string;
    cycleNumber: number;
    status: string;
    requestedNetTraderCash: string;
    approvedGrossBase: string | null;
    traderNetCash: string | null;
    waribaShare: string | null;
    provider: string | null;
    providerStatus: string | null;
    createdAt: Date;
  }[];
}

export interface AccountReconciliationEvidence {
  runs: readonly {
    id: string;
    status: string;
    storedAccountBalance: string;
    reconstructedAccountBalance: string;
    storedProgramEligibleBalance: string;
    reconstructedProgramEligibleBalance: string;
    executedAt: Date;
    incidentId: string | null;
  }[];
}

export interface AccountIncidentEvidence {
  incidents: readonly {
    id: string;
    incidentCode: string;
    severity: string;
    status: string;
    openedAt: Date;
    resolvedAt: Date | null;
    resolutionReason: string | null;
  }[];
}

export interface AccountAuditEvidence {
  events: readonly {
    id: string;
    action: string;
    permission: string | null;
    role: string | null;
    reason: string | null;
    correlationId: string | null;
    occurredAt: Date;
  }[];
}

/**
 * Sections absent from the result were never queried, because the caller was
 * not authorized for them — not fetched and then blanked.
 */
export interface ControlAccountDetail {
  overview?: AccountOverviewSection;
  trading?: AccountTradingSection;
  risk?: AccountRiskSection;
  payout?: AccountPayoutSection;
  reconciliationEvidence?: AccountReconciliationEvidence;
  incidentEvidence?: AccountIncidentEvidence;
  auditEvidence?: AccountAuditEvidence;
}

export async function loadControlAccountDetail(
  db: Db,
  params: { accountId: string; sections: ReadonlySet<AccountDetailSection> },
): Promise<ControlAccountDetail | null> {
  const { accountId, sections } = params;

  // Existence is established from the account row itself, which every
  // section is scoped to. Without `overview` authority there is nothing to
  // show, so there is nothing to query either.
  const account = await db
    .selectFrom('app.trading_accounts')
    .leftJoin(
      'app.trading_accounts as source_evaluation',
      'source_evaluation.id',
      'app.trading_accounts.source_evaluation_account_id',
    )
    .leftJoin('app.trading_accounts as performance_child', (join) =>
      join.onRef('performance_child.source_evaluation_account_id', '=', 'app.trading_accounts.id'),
    )
    .leftJoin('auth.users', 'auth.users.id', 'app.trading_accounts.user_id')
    .innerJoin(
      'app.policy_versions',
      'app.policy_versions.id',
      'app.trading_accounts.policy_version_id',
    )
    .select([
      'app.trading_accounts.id',
      'app.trading_accounts.public_id',
      'app.trading_accounts.user_id',
      'auth.users.email',
      'app.trading_accounts.program_type',
      'app.trading_accounts.nominal_balance',
      'app.trading_accounts.currency',
      'app.trading_accounts.status',
      'app.trading_accounts.integrity_hold',
      'app.trading_accounts.integrity_hold_reason',
      'app.trading_accounts.integrity_hold_set_at',
      'app.trading_accounts.kyc_sandbox_verified',
      'app.trading_accounts.payout_method_sandbox_configured',
      'app.trading_accounts.activated_at',
      'app.trading_accounts.created_at',
      'source_evaluation.id as source_evaluation_id',
      'source_evaluation.public_id as source_evaluation_public_id',
      'performance_child.id as performance_child_id',
      'performance_child.public_id as performance_child_public_id',
      'app.policy_versions.semantic_version as policy_version',
      'app.policy_versions.status as policy_status',
    ])
    .where('app.trading_accounts.id', '=', accountId)
    .executeTakeFirst();
  if (!account) return null;

  const detail: ControlAccountDetail = {};

  if (sections.has('overview')) {
    detail.overview = {
      id: account.id,
      publicId: account.public_id,
      userId: account.user_id,
      userEmail: account.email,
      programType: account.program_type,
      nominalBalance: account.nominal_balance,
      currency: account.currency,
      status: account.status,
      policyVersion: account.policy_version,
      policyStatus: account.policy_status,
      kycSandboxVerified: account.kyc_sandbox_verified,
      payoutMethodSandboxConfigured: account.payout_method_sandbox_configured,
      activatedAt: account.activated_at,
      createdAt: account.created_at,
      sourceEvaluation:
        account.source_evaluation_id && account.source_evaluation_public_id
          ? {
              id: account.source_evaluation_id,
              publicId: account.source_evaluation_public_id,
            }
          : null,
      performanceChild:
        account.performance_child_id && account.performance_child_public_id
          ? {
              id: account.performance_child_id,
              publicId: account.performance_child_public_id,
            }
          : null,
    };
  }

  if (sections.has('trading')) {
    const [positions, pendingOrders, orders, fillTotals] = await Promise.all([
      db
        .selectFrom('app.positions')
        .select([
          'id',
          'symbol',
          'side',
          'open_quantity',
          'average_open_price',
          'stop_loss',
          'take_profit',
          'opened_at',
        ])
        .where('account_id', '=', accountId)
        .where('status', '=', 'open')
        .orderBy('opened_at', 'desc')
        .execute(),
      db
        .selectFrom('app.pending_orders')
        .select(['id', 'symbol', 'order_type', 'quantity', 'trigger_price', 'status', 'created_at'])
        .where('account_id', '=', accountId)
        .where('status', '=', 'active')
        .orderBy('created_at', 'desc')
        .execute(),
      db
        .selectFrom('app.trade_orders')
        .select([
          'id',
          'symbol',
          'order_type',
          'status',
          'rejection_code',
          'idempotency_key',
          'received_at',
        ])
        .where('account_id', '=', accountId)
        .orderBy('received_at', 'desc')
        .limit(25)
        .execute(),
      db
        .selectFrom('app.fills')
        .select((eb) => [
          // COALESCE in SQL: an account with no fills yet must read as zero,
          // not as a null the page has to defend against.
          sql<string>`coalesce(sum(${eb.ref('realized_pnl')}), 0)`.as('realized'),
          sql<string>`coalesce(sum(${eb.ref('ineligible_short_duration_profit')}), 0)`.as(
            'ineligible',
          ),
        ])
        .where('account_id', '=', accountId)
        .executeTakeFirst(),
    ]);

    detail.trading = {
      openPositions: positions.map((row) => ({
        id: row.id,
        symbol: row.symbol,
        side: row.side,
        openQuantity: row.open_quantity,
        averageOpenPrice: row.average_open_price,
        stopLoss: row.stop_loss,
        takeProfit: row.take_profit,
        openedAt: row.opened_at,
      })),
      pendingOrders: pendingOrders.map((row) => ({
        id: row.id,
        symbol: row.symbol,
        orderType: row.order_type,
        quantity: row.quantity,
        triggerPrice: row.trigger_price,
        status: row.status,
        createdAt: row.created_at,
      })),
      recentOrders: orders.map((row) => ({
        id: row.id,
        symbol: row.symbol,
        orderType: row.order_type,
        status: row.status,
        rejectionCode: row.rejection_code,
        idempotencyKey: row.idempotency_key,
        createdAt: row.received_at,
      })),
      realizedPnl: fillTotals?.realized ?? '0.00',
      ineligibleShortDurationProfit: fillTotals?.ineligible ?? '0.00',
    };
  }

  if (sections.has('risk')) {
    const [violations, snapshot] = await Promise.all([
      db
        .selectFrom('app.risk_violations')
        .select([
          'rule_code',
          'severity',
          'consequence',
          'threshold_value',
          'observed_value',
          'occurred_at',
        ])
        .where('account_id', '=', accountId)
        .orderBy('occurred_at', 'desc')
        .limit(25)
        .execute(),
      db
        .selectFrom('app.account_daily_snapshots')
        .select([
          'trading_day',
          'daily_reference',
          'maximum_loss_floor_before',
          'maximum_loss_floor_after',
          'status',
        ])
        .where('account_id', '=', accountId)
        .orderBy('trading_day', 'desc')
        .executeTakeFirst(),
    ]);

    detail.risk = {
      integrityHold: account.integrity_hold,
      integrityHoldReason: account.integrity_hold_reason,
      integrityHoldSetAt: account.integrity_hold_set_at,
      violations: violations.map((row) => ({
        ruleCode: row.rule_code,
        severity: row.severity,
        consequence: row.consequence,
        thresholdValue: row.threshold_value,
        observedValue: row.observed_value,
        occurredAt: row.occurred_at,
      })),
      latestSnapshot: snapshot
        ? {
            tradingDay: snapshot.trading_day,
            dailyReference: snapshot.daily_reference,
            maximumLossFloorBefore: snapshot.maximum_loss_floor_before,
            maximumLossFloorAfter: snapshot.maximum_loss_floor_after,
            status: snapshot.status,
          }
        : null,
    };
  }

  if (sections.has('payout')) {
    const [cycle, requests] = await Promise.all([
      db
        .selectFrom('app.performance_cycles')
        .select(['cycle_number', 'status'])
        .where('account_id', '=', accountId)
        .where('status', '!=', 'closed')
        .executeTakeFirst(),
      db
        .selectFrom('app.payout_requests')
        .select([
          'id',
          'cycle_number',
          'status',
          'requested_net_trader_cash',
          'approved_gross_base',
          'trader_net_cash',
          'wariba_share',
          'provider',
          'provider_status',
          'created_at',
        ])
        .where('account_id', '=', accountId)
        .orderBy('created_at', 'desc')
        .execute(),
    ]);

    detail.payout = {
      currentCycle: cycle ? { cycleNumber: cycle.cycle_number, status: cycle.status } : null,
      requests: requests.map((row) => ({
        id: row.id,
        cycleNumber: row.cycle_number,
        status: row.status,
        requestedNetTraderCash: row.requested_net_trader_cash,
        approvedGrossBase: row.approved_gross_base,
        traderNetCash: row.trader_net_cash,
        waribaShare: row.wariba_share,
        provider: row.provider,
        providerStatus: row.provider_status,
        createdAt: row.created_at,
      })),
    };
  }

  if (sections.has('reconciliation_evidence')) {
    const runs = await db
      .selectFrom('app.account_reconciliation_runs')
      .select([
        'id',
        'status',
        'stored_account_balance',
        'reconstructed_account_balance',
        'stored_program_eligible_balance',
        'reconstructed_program_eligible_balance',
        'executed_at',
        'incident_id',
      ])
      .where('account_id', '=', accountId)
      .orderBy('executed_at', 'desc')
      .limit(25)
      .execute();
    detail.reconciliationEvidence = {
      runs: runs.map((row) => ({
        id: row.id,
        status: row.status,
        storedAccountBalance: row.stored_account_balance,
        reconstructedAccountBalance: row.reconstructed_account_balance,
        storedProgramEligibleBalance: row.stored_program_eligible_balance,
        reconstructedProgramEligibleBalance: row.reconstructed_program_eligible_balance,
        executedAt: row.executed_at,
        incidentId: row.incident_id,
      })),
    };
  }

  if (sections.has('incident_evidence')) {
    const incidents = await db
      .selectFrom('app.operations_incidents')
      .select([
        'id',
        'incident_code',
        'severity',
        'status',
        'opened_at',
        'resolved_at',
        'resolution_reason',
      ])
      .where('account_id', '=', accountId)
      .orderBy('opened_at', 'desc')
      .limit(25)
      .execute();
    detail.incidentEvidence = {
      incidents: incidents.map((row) => ({
        id: row.id,
        incidentCode: row.incident_code,
        severity: row.severity,
        status: row.status,
        openedAt: row.opened_at,
        resolvedAt: row.resolved_at,
        resolutionReason: row.resolution_reason,
      })),
    };
  }

  if (sections.has('audit_evidence')) {
    const events = await db
      .selectFrom('audit.audit_events')
      .select(['id', 'action', 'permission', 'role', 'reason', 'correlation_id', 'occurred_at'])
      .where('target_id', '=', accountId)
      .orderBy('occurred_at', 'desc')
      .limit(25)
      .execute();
    detail.auditEvidence = {
      events: events.map((row) => ({
        id: row.id,
        action: row.action,
        permission: row.permission,
        role: row.role,
        reason: row.reason,
        correlationId: row.correlation_id,
        occurredAt: row.occurred_at,
      })),
    };
  }

  return detail;
}
