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
  source_purchase_order_id: string;
  program_type: Generated<'WARIBA_ONE' | 'WARIBA_PERFORMANCE'>;
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
  'app.trading_ledger_entries': TradingLedgerEntriesTable;
  'app.outbox_events': OutboxEventsTable;
  'audit.audit_events': AuditEventsTable;
}
