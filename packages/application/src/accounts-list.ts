import type { Db } from '@wariba/database';

export interface AccountSummaryDTO {
  id: string;
  publicId: string;
  programType: 'WARIBA_ONE' | 'WARIBA_PERFORMANCE';
  nominalBalance: string;
  nominalCurrency: string;
  status: string;
  policyVersion: string;
  policyStatus: 'published' | 'retired';
  createdAt: string;
  /**
   * Whether identity verification has been recorded for this account.
   *
   * Sandbox-only and staff-set (see `trading_accounts.kyc_sandbox_verified`).
   * Carried on the summary so the Hub can render the payout gate without a
   * second query per account — the flag is a boolean the trader is entitled to
   * see, never a document or an identity detail.
   */
  kycSandboxVerified: boolean;
  /** Whether a payout destination has been recorded. Same sandbox caveat. */
  payoutMethodConfigured: boolean;
}

export interface ListAccountsForUserParams {
  userId: string;
}

// Lower rank = surfaced first (UX §20.5 — sort by attention required, then recency).
const ATTENTION_REQUIRED_RANK: Record<string, number> = {
  breached: 0,
  soft_locked: 1,
  pass_pending: 2,
  active: 3,
  inactive: 4,
  pending_activation: 5,
  passed: 6,
  closed: 7,
};

/**
 * All accounts belonging to a user, sorted by how much attention they need.
 * Companion to getLatestAccountForUser (activation.ts), which only ever
 * returns the single most recent one — this is what the Hub's account list/
 * selector and multi-account isolation (Prompt 06 scope #1, #2, #15) need.
 */
export async function listAccountsForUser(
  db: Db,
  params: ListAccountsForUserParams,
): Promise<AccountSummaryDTO[]> {
  const rows = await db
    .selectFrom('app.trading_accounts')
    .innerJoin(
      'app.policy_versions',
      'app.policy_versions.id',
      'app.trading_accounts.policy_version_id',
    )
    .select([
      'app.trading_accounts.id',
      'app.trading_accounts.public_id',
      'app.trading_accounts.program_type',
      'app.trading_accounts.nominal_balance',
      'app.trading_accounts.currency',
      'app.trading_accounts.status',
      'app.trading_accounts.created_at',
      'app.trading_accounts.kyc_sandbox_verified',
      'app.trading_accounts.payout_method_sandbox_configured',
      'app.policy_versions.semantic_version as policyVersion',
      'app.policy_versions.status as policyStatus',
    ])
    .where('app.trading_accounts.user_id', '=', params.userId)
    .orderBy('app.trading_accounts.created_at', 'desc')
    .execute();

  const accounts = rows.map((row): AccountSummaryDTO => {
    if (row.policyStatus !== 'published' && row.policyStatus !== 'retired') {
      throw new Error(`Account references a non-public policy status: ${row.policyStatus}.`);
    }
    return {
      id: row.id,
      publicId: row.public_id,
      programType: row.program_type,
      nominalBalance: row.nominal_balance,
      nominalCurrency: row.currency,
      status: row.status,
      policyVersion: row.policyVersion,
      policyStatus: row.policyStatus,
      createdAt: row.created_at.toISOString(),
      kycSandboxVerified: row.kyc_sandbox_verified,
      payoutMethodConfigured: row.payout_method_sandbox_configured,
    };
  });

  return [...accounts].sort((a, b) => {
    const rankA = ATTENTION_REQUIRED_RANK[a.status] ?? 99;
    const rankB = ATTENTION_REQUIRED_RANK[b.status] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
