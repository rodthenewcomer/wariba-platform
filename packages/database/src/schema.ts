import type { ColumnType, Generated } from 'kysely';

/**
 * Kysely table types — hand-mirrored from supabase/migrations/20260803000000_*.sql.
 * Generated-types workflow (System Architecture §23: migrations -> Supabase
 * local -> generated types -> CI diff check) is deferred to when local
 * Supabase is available in this environment (Docker-dependent, per Prompt 01);
 * until then these are maintained by hand and must be kept in sync with the
 * migration on every schema change — CI's boundary/type checks catch drift
 * at the call-site level even without the generator.
 */

type Timestamp = ColumnType<Date, Date | string, Date | string>;
/**
 * A timestamp column with a DB-side default (created_at, occurred_at, ...).
 * `Generated<ColumnType<...>>` does not compose the way `Generated<T>` does
 * for plain types — the optional-on-insert behavior has to be expressed
 * directly in the ColumnType's insert parameter instead.
 */
type GeneratedTimestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface UserProfilesTable {
  user_id: string;
  first_name: string;
  last_name: string;
  country: string;
  language: string;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface UserConsentsTable {
  id: Generated<string>;
  user_id: string;
  consent_type: 'terms' | 'privacy' | 'simulated_account_disclosure';
  policy_version_id: string;
  locale: string;
  accepted_at: GeneratedTimestamp;
}

export interface PolicyVersionsTable {
  id: Generated<string>;
  program: 'WARIBA_ONE' | 'WARIBA_PERFORMANCE';
  semantic_version: string;
  status: 'draft' | 'reviewed' | 'approved' | 'published' | 'retired';
  parameters_json: unknown;
  human_document_hash: string | null;
  machine_hash: string | null;
  effective_from: Timestamp | null;
  retired_at: Timestamp | null;
  created_at: GeneratedTimestamp;
}

export interface SymbolSpecSetsTable {
  id: Generated<string>;
  set_id: string;
  status: 'sandbox_candidate' | 'published' | 'retired';
  specs_json: unknown;
  published_at: GeneratedTimestamp;
}

export interface ProductsTable {
  id: Generated<string>;
  code: '5K' | '10K' | '25K' | '50K' | '100K';
  nominal_balance: string;
  nominal_currency: string;
  created_at: GeneratedTimestamp;
}

export interface ProductVersionsTable {
  id: Generated<string>;
  product_id: string;
  price_amount: string;
  // Not yet exposed via the API — no cohort-gating mechanism exists yet
  // (RULESET commercial_constraints.founder_price_must_have_real_cohort).
  founder_price_amount: string | null;
  price_currency: string;
  activation_fee: string;
  feature_flag_key: string | null;
  effective_from: GeneratedTimestamp;
  retired_at: Timestamp | null;
  created_at: GeneratedTimestamp;
}

export type PurchaseOrderStatusColumn =
  | 'created'
  | 'pending_payment'
  | 'paid'
  | 'fulfilled'
  | 'payment_failed'
  | 'cancelled'
  | 'refunded';

export interface PurchaseOrdersTable {
  id: Generated<string>;
  user_id: string;
  product_version_id: string;
  idempotency_key: string;
  status: Generated<PurchaseOrderStatusColumn>;
  total_amount: string;
  total_currency: string;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface PaymentAttemptsTable {
  id: Generated<string>;
  purchase_order_id: string;
  provider: Generated<string>;
  status: Generated<'initiated' | 'pending' | 'confirmed' | 'failed'>;
  amount: string;
  currency: string;
  provider_reference: string | null;
  attempt_key: Generated<string | null>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface PaymentEventsTable {
  id: Generated<string>;
  provider: string;
  event_id: string;
  event_type: string;
  payload: unknown;
  signature_valid: boolean;
  purchase_order_id: string | null;
  received_at: GeneratedTimestamp;
  processed_at: Timestamp | null;
}

export interface ReceiptsTable {
  id: Generated<string>;
  purchase_order_id: string;
  amount: string;
  currency: string;
  issued_at: GeneratedTimestamp;
}

export type TradingAccountStatusColumn =
  | 'pending_activation'
  | 'active'
  | 'soft_locked'
  | 'pass_pending'
  | 'inactive'
  | 'passed'
  | 'breached'
  | 'closed';

export interface TradingAccountsTable {
  id: Generated<string>;
  public_id: string;
  user_id: string;
  /** Set for WARIBA_ONE accounts; null for WARIBA_PERFORMANCE (see source_evaluation_account_id instead). Exactly one of the two is ever set — DB-enforced. */
  source_purchase_order_id: string | null;
  /** Set for WARIBA_PERFORMANCE accounts, spawned from the Evaluation account that passed (PERF-020); null for WARIBA_ONE. */
  source_evaluation_account_id: string | null;
  program_type: Generated<'WARIBA_ONE' | 'WARIBA_PERFORMANCE'>;
  /** Sandbox-only — no real identity or payout-rail integration exists. Staff-set via Control (Phase G), never trader-set. */
  kyc_sandbox_verified: Generated<boolean>;
  payout_method_sandbox_configured: Generated<boolean>;
  nominal_balance: string;
  currency: Generated<string>;
  status: Generated<TradingAccountStatusColumn>;
  policy_version_id: string;
  symbol_spec_set_id: string;
  activated_at: Timestamp | null;
  version: Generated<number>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface AccountStateTransitionsTable {
  id: Generated<string>;
  account_id: string;
  from_status: string | null;
  to_status: string;
  reason: string;
  occurred_at: GeneratedTimestamp;
}

export type AccountDailySnapshotStatus = 'open' | 'finalized';

export interface AccountDailySnapshotsTable {
  id: Generated<string>;
  account_id: string;
  trading_day: string;
  policy_version_id: string;
  status: Generated<AccountDailySnapshotStatus>;
  sod_balance: string;
  sod_equity: string;
  program_sod_balance: string;
  daily_reference: string;
  maximum_loss_floor_before: string;
  eod_balance: string | null;
  eod_equity: string | null;
  program_eod_balance: string | null;
  maximum_loss_floor_after: string | null;
  highest_eod_balance_after: string | null;
  highest_program_eod_balance_after: string | null;
  realized_net_profit_for_day: string | null;
  eligible_realized_net_profit_for_day: string | null;
  finalized_at: Timestamp | null;
  created_at: GeneratedTimestamp;
}

export type RiskViolationRuleCode =
  | 'RISK_DAILY_LOSS_LOCK'
  | 'RISK_MAXIMUM_LOSS_BREACH'
  | 'RISK_CONSISTENCY_NON_COMPLIANT'
  | 'RISK_TARGET_NOT_REALIZED'
  | 'RISK_OPEN_POSITIONS_BLOCK_TRANSITION'
  | 'RISK_PENDING_ORDERS_BLOCK_TRANSITION'
  | 'RISK_SHORT_DURATION_WARNING'
  | 'RISK_SHORT_DURATION_ENTRY_LOCK';

export interface RiskViolationsTable {
  id: Generated<string>;
  account_id: string;
  rule_code: RiskViolationRuleCode;
  severity: 'information' | 'warning' | 'critical';
  consequence: 'soft_lock' | 'hard_breach' | 'blocks_pass' | 'entry_lock' | 'none';
  policy_version_id: string;
  threshold_value: string | null;
  observed_value: string | null;
  account_daily_snapshot_id: string | null;
  account_state_transition_id: string | null;
  trigger_event_type: 'trade_order' | 'daily_finalization' | 'manual_review';
  trigger_event_id: string | null;
  price_snapshot: unknown;
  calculation_version: Generated<string>;
  occurred_at: GeneratedTimestamp;
}

export type LedgerEntryType =
  | 'initial_balance'
  | 'realized_pnl'
  | 'commission'
  | 'swap'
  | 'payout_debit'
  | 'authorized_adjustment'
  | 'reversal';

export interface TradingLedgerEntriesTable {
  id: Generated<string>;
  account_id: string;
  entry_type: LedgerEntryType;
  amount: string;
  currency: Generated<string>;
  reference_type: string | null;
  reference_id: string | null;
  occurred_at: GeneratedTimestamp;
  created_at: GeneratedTimestamp;
  reversal_of: string | null;
}

// "trader" (any regular account holder) is not a row here at all — it's
// the absence of one. admin/super_admin are treated as supersets of
// support/risk/finance in application code (packages/application's
// authorization helper), not by holding multiple rows.
export type StaffRole = 'support' | 'risk' | 'finance' | 'admin' | 'super_admin';

export interface StaffMembersTable {
  id: Generated<string>;
  user_id: string;
  role: StaffRole;
  granted_by: string | null;
  created_at: GeneratedTimestamp;
}

export interface OutboxEventsTable {
  id: Generated<string>;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  event_version: Generated<number>;
  payload: unknown;
  occurred_at: GeneratedTimestamp;
  published_at: Timestamp | null;
  attempt_count: Generated<number>;
  next_attempt_at: Timestamp | null;
  last_error: string | null;
}

export interface AuditEventsTable {
  id: Generated<string>;
  actor_type: 'user' | 'system' | 'staff' | 'service';
  actor_id: string | null;
  role: string | null;
  permission: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  before_json: unknown;
  after_json: unknown;
  reason: string | null;
  source: string;
  correlation_id: string | null;
  occurred_at: GeneratedTimestamp;
  created_at: GeneratedTimestamp;
}

export type TradableSymbol = 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'XAUUSD' | 'NAS100';
export type OrderSide = 'buy' | 'sell';

export interface SymbolSpecsTable {
  id: Generated<string>;
  symbol_spec_set_id: string;
  symbol: TradableSymbol;
  asset_class: 'forex_major' | 'metal' | 'index_cfd_simulated';
  price_precision: number;
  contract_size: string;
  minimum_quantity: string;
  maximum_quantity: string;
  quantity_step: string;
  leverage_one: number;
  leverage_performance: number;
  spread_points: string;
  slippage_points: string;
  commission_per_lot: string;
  swap_long_per_lot: string;
  swap_short_per_lot: string;
  weekend_hold_allowed: Generated<boolean>;
  overnight_hold_allowed: Generated<boolean>;
  stale_threshold_ms: number;
  created_at: GeneratedTimestamp;
}

export interface AccountExposureLimitsTable {
  id: Generated<string>;
  symbol_spec_set_id: string;
  nominal_balance: string;
  forex_lots: string;
  xauusd_lots: string;
  nas100_contracts: string;
  evaluation_max_margin_rate: string;
  performance_max_margin_rate: string;
  created_at: GeneratedTimestamp;
}

export type PositionStatusColumn = 'open' | 'closed';

export interface PositionsTable {
  id: Generated<string>;
  account_id: string;
  symbol: TradableSymbol;
  side: OrderSide;
  opening_quantity: string;
  open_quantity: string;
  average_open_price: string;
  realized_pnl: Generated<string>;
  stop_loss: string | null;
  take_profit: string | null;
  status: Generated<PositionStatusColumn>;
  account_sequence: string;
  opened_at: GeneratedTimestamp;
  closed_at: Timestamp | null;
  version: Generated<number>;
}

export type TradeOrderTypeColumn =
  'market_open' | 'partial_close' | 'full_close' | 'close_all' | 'modify_sl' | 'modify_tp';
export type TradeOrderStatusColumn =
  'received' | 'validated' | 'accepted' | 'filled' | 'rejected' | 'cancelled';

export interface TradeOrdersTable {
  id: Generated<string>;
  account_id: string;
  idempotency_key: string;
  order_type: TradeOrderTypeColumn;
  // Nullable: a close/modify order referencing a position_id that doesn't
  // exist can't honestly record a symbol/side (there's no position to read
  // them from) — see 20260804000002_nullable_order_symbol_side.sql.
  symbol: TradableSymbol | null;
  side: OrderSide | null;
  position_id: string | null;
  requested_quantity: string | null;
  filled_quantity: Generated<string>;
  requested_stop_loss: string | null;
  requested_take_profit: string | null;
  status: Generated<TradeOrderStatusColumn>;
  rejection_code: string | null;
  account_sequence: string | null;
  received_at: GeneratedTimestamp;
  accepted_at: Timestamp | null;
  completed_at: Timestamp | null;
}

export interface FillsTable {
  id: Generated<string>;
  order_id: string;
  account_id: string;
  position_id: string;
  symbol: TradableSymbol;
  side: OrderSide;
  fill_type: 'open' | 'close';
  quantity: string;
  price: string;
  spread_points: string;
  slippage_points: string;
  commission: Generated<string>;
  realized_pnl: Generated<string>;
  market_sequence: string;
  account_sequence: string;
  occurred_at: GeneratedTimestamp;
  opening_fill_id: string | null;
  // Prompt 07B §4 — 60-second profit eligibility, close fills only (null on
  // open fills). bigint, represented as a string on both read and write —
  // same convention as market_sequence/account_sequence above.
  duration_ms: string | null;
  is_short_duration_profit: Generated<boolean>;
  eligible_realized_pnl: string | null;
  ineligible_short_duration_profit: Generated<string>;
  allocated_open_commission: Generated<string>;
  net_realized_pnl: string | null;
  eligibility_reason: 'eligible' | 'short_duration_profit' | 'loss_counted' | 'breakeven' | null;
}

export type PositionReductionQueueStatus = 'queued' | 'executed' | 'cancelled' | 'failed';

// Prompt 7 Appendix 07-C §12 — see the matching migration's doc comment.
export interface PositionReductionQueueTable {
  id: Generated<string>;
  account_id: string;
  position_id: string;
  idempotency_key: string;
  mode: 'partial' | 'full';
  requested_quantity: string | null;
  status: Generated<PositionReductionQueueStatus>;
  queued_at: Timestamp;
  executed_at: Timestamp | null;
  cancelled_at: Timestamp | null;
  execution_order_id: string | null;
  failure_reason: string | null;
  created_at: GeneratedTimestamp;
}

export type PendingOrderType = 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop';
export type PendingOrderStatus =
  'active' | 'triggered' | 'filled' | 'cancelled' | 'rejected' | 'suspended_market_data' | 'failed';

// Prompt 7 Appendix 07-D — see the matching migration's doc comment.
export interface PendingOrdersTable {
  id: Generated<string>;
  account_id: string;
  symbol: TradableSymbol;
  side: OrderSide;
  order_type: PendingOrderType;
  quantity: string;
  trigger_price: string;
  requested_stop_loss: string | null;
  requested_take_profit: string | null;
  time_in_force: Generated<'GTC'>;
  status: Generated<PendingOrderStatus>;
  version: Generated<number>;
  idempotency_key: string;
  rejection_code: string | null;
  execution_order_id: string | null;
  trigger_market_sequence: string | null;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  triggered_at: Timestamp | null;
  filled_at: Timestamp | null;
  cancelled_at: Timestamp | null;
}

export type AlertDirection = 'cross_above' | 'cross_below';
export type AlertSource = 'bid' | 'ask' | 'mid';
export type AlertRecurrence = 'once' | 'every_crossing';

export interface PriceAlertsTable {
  id: Generated<string>;
  user_id: string;
  symbol: TradableSymbol;
  direction: AlertDirection;
  threshold_price: string;
  source: Generated<AlertSource>;
  recurrence: AlertRecurrence;
  enabled: Generated<boolean>;
  last_observed_side_above: boolean | null;
  last_triggered_at: Timestamp | null;
  trigger_count: Generated<number>;
  version: Generated<number>;
  idempotency_key: string;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface AlertNotificationsTable {
  id: Generated<string>;
  alert_id: string;
  user_id: string;
  symbol: TradableSymbol;
  direction: AlertDirection;
  threshold_price: string;
  triggering_price: string;
  source: AlertSource;
  read_at: Timestamp | null;
  occurred_at: GeneratedTimestamp;
}

// Prompt 08 Phase C — see the matching migration's doc comment.
export type PerformanceCycleStatus = 'active' | 'payout_pending' | 'closed';

export interface PerformanceCyclesTable {
  id: Generated<string>;
  account_id: string;
  cycle_number: number;
  status: Generated<PerformanceCycleStatus>;
  opened_at: GeneratedTimestamp;
  closed_at: Timestamp | null;
  version: Generated<number>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export type PerformanceReviewCaseStatus = 'open' | 'closed';

export interface PerformanceReviewCasesTable {
  id: Generated<string>;
  account_id: string;
  opened_at: GeneratedTimestamp;
  status: Generated<PerformanceReviewCaseStatus>;
  created_at: GeneratedTimestamp;
}

// Prompt 08 Phase D — see the matching migration's doc comment.
export type PayoutRequestStatus =
  | 'pending_review'
  | 'needs_information'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled';

export interface PayoutRequestsTable {
  id: Generated<string>;
  account_id: string;
  cycle_id: string;
  cycle_number: number;
  idempotency_key: string;
  status: Generated<PayoutRequestStatus>;
  requested_net_trader_cash: string;
  requested_gross_base: string;
  trader_split_rate: string;
  cap_applied: string;
  buffer_floor_at_request: string;
  eligible_excess_at_request: string;
  approved_gross_base: string | null;
  trader_net_cash: string | null;
  wariba_share: string | null;
  rejection_code: string | null;
  provider: string | null;
  provider_reference: string | null;
  currency: Generated<string>;
  requested_at: GeneratedTimestamp;
  reviewed_at: Timestamp | null;
  reviewed_by: string | null;
  paid_at: Timestamp | null;
  version: Generated<number>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface Database {
  'app.user_profiles': UserProfilesTable;
  'app.user_consents': UserConsentsTable;
  'app.policy_versions': PolicyVersionsTable;
  'app.symbol_spec_sets': SymbolSpecSetsTable;
  'app.products': ProductsTable;
  'app.product_versions': ProductVersionsTable;
  'app.purchase_orders': PurchaseOrdersTable;
  'app.payment_attempts': PaymentAttemptsTable;
  'app.payment_events': PaymentEventsTable;
  'app.receipts': ReceiptsTable;
  'app.trading_accounts': TradingAccountsTable;
  'app.account_state_transitions': AccountStateTransitionsTable;
  'app.account_daily_snapshots': AccountDailySnapshotsTable;
  'app.risk_violations': RiskViolationsTable;
  'app.trading_ledger_entries': TradingLedgerEntriesTable;
  'app.symbol_specs': SymbolSpecsTable;
  'app.account_exposure_limits': AccountExposureLimitsTable;
  'app.positions': PositionsTable;
  'app.trade_orders': TradeOrdersTable;
  'app.fills': FillsTable;
  'app.outbox_events': OutboxEventsTable;
  'app.staff_members': StaffMembersTable;
  'app.position_reduction_queue': PositionReductionQueueTable;
  'app.pending_orders': PendingOrdersTable;
  'app.price_alerts': PriceAlertsTable;
  'app.alert_notifications': AlertNotificationsTable;
  'app.performance_cycles': PerformanceCyclesTable;
  'app.performance_review_cases': PerformanceReviewCasesTable;
  'app.payout_requests': PayoutRequestsTable;
  'audit.audit_events': AuditEventsTable;
}
