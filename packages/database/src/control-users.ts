import { sql } from 'kysely';
import type { Db } from './client';

/**
 * Prompt 09 — the Users explorer's read model.
 *
 * Search, filtering, counting and paging all happen in PostgreSQL. Loading
 * every user and narrowing in the browser would leak the whole roster to
 * anyone who opened dev tools, and would stop working the moment the
 * platform had more traders than fit in one response — so the page only
 * ever receives the rows it displays.
 *
 * Read-only: this module exposes queries and nothing else. Prompt 09 gives
 * Control no way to create, edit or delete a user.
 */
export interface ControlUserRow {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  createdAt: Date;
  accountCount: number;
  /** Distinct account statuses this user holds, for an at-a-glance signal. */
  accountStatuses: readonly string[];
  integrityHolds: number;
  softLockedAccounts: number;
  breachedAccounts: number;
}

export interface ControlUserPage {
  users: readonly ControlUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const CONTROL_USERS_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export interface ControlUserSearch {
  /** Matches email, first name, last name, or an exact account public id. */
  query?: string;
  page?: number;
  pageSize?: number;
}

/**
 * One aggregate per user rather than a query per row: the account rollup is
 * computed in the same statement, so a page of 25 users costs one round trip
 * instead of 26.
 */
export async function searchControlUsers(
  db: Db,
  params: ControlUserSearch = {},
): Promise<ControlUserPage> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? CONTROL_USERS_PAGE_SIZE));
  const query = params.query?.trim();

  // ILIKE with an escaped pattern: a user searching for "a_b" means those
  // characters, not "a<any>b", and `%` in a search box must not turn into a
  // full-table scan of everything.
  const pattern = query ? `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;

  const base = db
    .selectFrom('auth.users')
    .leftJoin('app.user_profiles', 'app.user_profiles.user_id', 'auth.users.id');

  const filtered = pattern
    ? base.where((eb) =>
        eb.or([
          eb(sql<string>`coalesce(${eb.ref('auth.users.email')}, '')`, 'ilike', pattern),
          eb(
            sql<string>`coalesce(${eb.ref('app.user_profiles.first_name')}, '')`,
            'ilike',
            pattern,
          ),
          eb(sql<string>`coalesce(${eb.ref('app.user_profiles.last_name')}, '')`, 'ilike', pattern),
          eb.exists(
            eb
              .selectFrom('app.trading_accounts')
              .select('app.trading_accounts.id')
              .whereRef('app.trading_accounts.user_id', '=', 'auth.users.id')
              .where('app.trading_accounts.public_id', 'ilike', pattern),
          ),
        ]),
      )
    : base;

  const [rows, totals] = await Promise.all([
    filtered
      .select((eb) => [
        'auth.users.id as user_id',
        'auth.users.email',
        'auth.users.created_at',
        'app.user_profiles.first_name',
        'app.user_profiles.last_name',
        'app.user_profiles.country',
        eb
          .selectFrom('app.trading_accounts')
          .select((inner) => inner.fn.countAll().as('count'))
          .whereRef('app.trading_accounts.user_id', '=', 'auth.users.id')
          .as('account_count'),
        eb
          .selectFrom('app.trading_accounts')
          .select(sql<string[]>`array_agg(distinct status)`.as('statuses'))
          .whereRef('app.trading_accounts.user_id', '=', 'auth.users.id')
          .as('account_statuses'),
        eb
          .selectFrom('app.trading_accounts')
          .select((inner) => inner.fn.countAll().as('count'))
          .whereRef('app.trading_accounts.user_id', '=', 'auth.users.id')
          .where('app.trading_accounts.integrity_hold', '=', true)
          .as('integrity_holds'),
        eb
          .selectFrom('app.trading_accounts')
          .select((inner) => inner.fn.countAll().as('count'))
          .whereRef('app.trading_accounts.user_id', '=', 'auth.users.id')
          .where('app.trading_accounts.status', '=', 'soft_locked')
          .as('soft_locked'),
        eb
          .selectFrom('app.trading_accounts')
          .select((inner) => inner.fn.countAll().as('count'))
          .whereRef('app.trading_accounts.user_id', '=', 'auth.users.id')
          .where('app.trading_accounts.status', '=', 'breached')
          .as('breached'),
      ])
      .orderBy('auth.users.created_at', 'desc')
      .orderBy('auth.users.id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute(),
    filtered.select((eb) => eb.fn.count('auth.users.id').distinct().as('count')).executeTakeFirst(),
  ]);

  return {
    users: rows.map((row) => ({
      userId: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      country: row.country,
      createdAt: row.created_at,
      accountCount: Number(row.account_count ?? 0),
      accountStatuses: (row.account_statuses ?? []).filter(
        (status): status is string => status !== null,
      ),
      integrityHolds: Number(row.integrity_holds ?? 0),
      softLockedAccounts: Number(row.soft_locked ?? 0),
      breachedAccounts: Number(row.breached ?? 0),
    })),
    total: Number(totals?.count ?? 0),
    page,
    pageSize,
  };
}

export interface ControlUserAccount {
  id: string;
  publicId: string;
  programType: string;
  nominalBalance: string;
  currency: string;
  status: string;
  integrityHold: boolean;
  kycSandboxVerified: boolean;
  payoutMethodSandboxConfigured: boolean;
  activatedAt: Date | null;
  createdAt: Date;
}

export interface ControlUserLifecycleEvent {
  accountId: string;
  accountPublicId: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string;
  occurredAt: Date;
}

export interface ControlUserDetail {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  language: string | null;
  createdAt: Date;
  accounts: readonly ControlUserAccount[];
  lifecycle: readonly ControlUserLifecycleEvent[];
  payoutRequestCount: number;
  openReviewCases: number;
}

export async function loadControlUserDetail(
  db: Db,
  userId: string,
): Promise<ControlUserDetail | null> {
  const user = await db
    .selectFrom('auth.users')
    .leftJoin('app.user_profiles', 'app.user_profiles.user_id', 'auth.users.id')
    .select([
      'auth.users.id as user_id',
      'auth.users.email',
      'auth.users.created_at',
      'app.user_profiles.first_name',
      'app.user_profiles.last_name',
      'app.user_profiles.country',
      'app.user_profiles.language',
    ])
    .where('auth.users.id', '=', userId)
    .executeTakeFirst();
  if (!user) return null;

  const [accounts, lifecycle, payouts, reviews] = await Promise.all([
    db
      .selectFrom('app.trading_accounts')
      .select([
        'id',
        'public_id',
        'program_type',
        'nominal_balance',
        'currency',
        'status',
        'integrity_hold',
        'kyc_sandbox_verified',
        'payout_method_sandbox_configured',
        'activated_at',
        'created_at',
      ])
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute(),
    db
      .selectFrom('app.account_state_transitions')
      .innerJoin(
        'app.trading_accounts',
        'app.trading_accounts.id',
        'app.account_state_transitions.account_id',
      )
      .select([
        'app.account_state_transitions.account_id',
        'app.trading_accounts.public_id',
        'app.account_state_transitions.from_status',
        'app.account_state_transitions.to_status',
        'app.account_state_transitions.reason',
        'app.account_state_transitions.occurred_at',
      ])
      .where('app.trading_accounts.user_id', '=', userId)
      .orderBy('app.account_state_transitions.occurred_at', 'desc')
      .limit(25)
      .execute(),
    db
      .selectFrom('app.payout_requests')
      .innerJoin(
        'app.trading_accounts',
        'app.trading_accounts.id',
        'app.payout_requests.account_id',
      )
      .select((eb) => eb.fn.countAll().as('count'))
      .where('app.trading_accounts.user_id', '=', userId)
      .executeTakeFirst(),
    db
      .selectFrom('app.performance_review_cases')
      .innerJoin(
        'app.trading_accounts',
        'app.trading_accounts.id',
        'app.performance_review_cases.account_id',
      )
      .select((eb) => eb.fn.countAll().as('count'))
      .where('app.trading_accounts.user_id', '=', userId)
      .where('app.performance_review_cases.status', '=', 'open')
      .executeTakeFirst(),
  ]);

  return {
    userId: user.user_id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    country: user.country,
    language: user.language,
    createdAt: user.created_at,
    accounts: accounts.map((row) => ({
      id: row.id,
      publicId: row.public_id,
      programType: row.program_type,
      nominalBalance: row.nominal_balance,
      currency: row.currency,
      status: row.status,
      integrityHold: row.integrity_hold,
      kycSandboxVerified: row.kyc_sandbox_verified,
      payoutMethodSandboxConfigured: row.payout_method_sandbox_configured,
      activatedAt: row.activated_at,
      createdAt: row.created_at,
    })),
    lifecycle: lifecycle.map((row) => ({
      accountId: row.account_id,
      accountPublicId: row.public_id,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      reason: row.reason,
      occurredAt: row.occurred_at,
    })),
    payoutRequestCount: Number(payouts?.count ?? 0),
    openReviewCases: Number(reviews?.count ?? 0),
  };
}
