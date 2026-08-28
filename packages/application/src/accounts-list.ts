import type { Db } from '@wariba/database';

export interface AccountSummaryDTO {
  id: string;
  publicId: string;
  programType: 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_PERFORMANCE';
  /**
   * Which product this account belongs to, independent of the phase it is in.
   *
   * `programType` conflates the two: a FLEX account in Evaluation is
   * `WARIBA_FLEX`, but the same trader's Performance account is
   * `WARIBA_PERFORMANCE` — the family is gone, and an INSTANT account is
   * indistinguishable from a ONE Performance account. Every surface that
   * labelled an account from `programType` alone therefore told a FLEX
   * Evaluation trader they held WARIBA ONE.
   */
  productFamily: 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_INSTANT';
  /** From the pinned policy, so the phase and the rules can never disagree. */
  accountPhase: 'evaluation' | 'performance';
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
  /** Parent Evaluation for a Performance account, resolved from the same owner-scoped list. */
  sourceEvaluationAccountId: string | null;
  sourceEvaluationPublicId: string | null;
  /** Child Performance for a successful Evaluation, resolved from the same owner-scoped list. */
  performanceAccountId: string | null;
  performanceAccountPublicId: string | null;
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
      'app.trading_accounts.product_family',
      'app.trading_accounts.nominal_balance',
      'app.trading_accounts.currency',
      'app.trading_accounts.status',
      'app.trading_accounts.source_evaluation_account_id',
      'app.trading_accounts.created_at',
      'app.trading_accounts.kyc_sandbox_verified',
      'app.trading_accounts.payout_method_sandbox_configured',
      'app.policy_versions.semantic_version as policyVersion',
      'app.policy_versions.status as policyStatus',
      'app.policy_versions.account_phase as accountPhase',
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
      productFamily: row.product_family,
      /*
       * A V1 policy row predates the phase column and leaves it null. The
       * program type is the only thing that can answer for those accounts, and
       * it answers correctly: V1 had exactly two programs, one per phase.
       */
      accountPhase:
        row.accountPhase ??
        (row.program_type === 'WARIBA_PERFORMANCE' ? 'performance' : 'evaluation'),
      nominalBalance: row.nominal_balance,
      nominalCurrency: row.currency,
      status: row.status,
      policyVersion: row.policyVersion,
      policyStatus: row.policyStatus,
      createdAt: row.created_at.toISOString(),
      kycSandboxVerified: row.kyc_sandbox_verified,
      payoutMethodConfigured: row.payout_method_sandbox_configured,
      sourceEvaluationAccountId: row.source_evaluation_account_id,
      sourceEvaluationPublicId: null,
      performanceAccountId: null,
      performanceAccountPublicId: null,
    };
  });

  const byId = new Map(accounts.map((account) => [account.id, account]));
  for (const account of accounts) {
    if (!account.sourceEvaluationAccountId) continue;
    const parent = byId.get(account.sourceEvaluationAccountId);
    if (!parent) continue;
    account.sourceEvaluationPublicId = parent.publicId;
    parent.performanceAccountId = account.id;
    parent.performanceAccountPublicId = account.publicId;
  }

  return [...accounts].sort((a, b) => {
    const rankA = ATTENTION_REQUIRED_RANK[a.status] ?? 99;
    const rankB = ATTENTION_REQUIRED_RANK[b.status] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
