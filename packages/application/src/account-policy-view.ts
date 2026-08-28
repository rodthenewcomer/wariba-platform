import Decimal from 'decimal.js';
import {
  loadPolicyById,
  loadCompatiblePerformancePolicy,
  evaluateCycleProgress,
  loadV2PolicyRuntimeContext,
  type Db,
} from '@wariba/database';
import type {
  EvaluationOnePolicyParameters,
  PerformancePolicyParameters,
  ProductFamily,
  AccountPhase,
} from '@wariba/policies';
import { V2_POLICY_CONTRACT_VERSION } from '@wariba/policies';
import { accountStatusLabel } from './account-status-labels';
import {
  projectAccountRules,
  formatMoney,
  formatRate,
  ACCOUNT_PHASE_LABEL,
  PRODUCT_FAMILY_LABEL,
  type AccountRuleItem,
} from './account-policy-rules';
import { deriveAccountNextAction, type AccountNextAction } from './account-next-action';
import { loadFlexActivationObligation, type FlexActivationObligationView } from './flex-activation';

/**
 * Phase 3.4.4 §5 — the account's own contract, projected once for every
 * authenticated surface.
 *
 * ## What this owns, and what it deliberately does not
 *
 * This is the *attached rules and lifecycle* projection: which policy this
 * account is pinned to, what that policy says, which external capabilities it
 * requires, where the account sits in its product's lifecycle, and what the
 * trader should do next.
 *
 * It does not re-project the moving risk figures. `risk-view.ts` already owns
 * daily/maximum-loss room and `payout-lifecycle.ts` owns payout state; §5's
 * instruction not to duplicate a field an existing projection owns is the
 * whole reason this file is a composition rather than a superset. Two read
 * models computing the same remaining-loss figure is how two panels on one
 * screen end up disagreeing about the same account.
 *
 * ## Why it accepts every family and both phases
 *
 * `evaluation-performance-handoff.ts` throws unless the evaluation is
 * `WARIBA_ONE` — correct for the ONE handoff it was written for, and the
 * reason a FLEX evaluation had nowhere to render its rules. This one branches
 * on the pinned policy, so ONE V1, ONE V2, FLEX and INSTANT all traverse the
 * same path and INSTANT's absence of an Evaluation parent is a fact rather
 * than a failure.
 */
export interface AccountPolicyView {
  account: {
    id: string;
    publicId: string;
    productFamily: ProductFamily;
    productLabel: string;
    phase: AccountPhase;
    phaseLabel: string;
    /** "WARIBA FLEX · Performance · 50 000 USD" — §9's account header, assembled once. */
    headerLabel: string;
    nominalBalance: string;
    nominalFormatted: string;
    currency: string;
    status: string;
    statusLabel: string;
    activatedAt: string | null;
  };
  policy: {
    versionId: string;
    /** §8 — a secondary detail, never the headline. */
    semanticVersion: string;
    /** V1 accounts keep their contract; only V2 policies carry the exposure guards. */
    isV2: boolean;
    machineHashVerified: boolean;
  };
  rules: readonly AccountRuleItem[];
  limits: AccountLimits;
  capabilities: AccountCapabilities;
  provenance: AccountProvenance;
  flexActivation: FlexActivationObligationView | null;
  nextAction: AccountNextAction;
}

/**
 * The caps, with their live usage deliberately absent.
 *
 * ENG-028 — no live price source is reachable from a server-rendered page, and
 * `positions-view.ts` already refuses to show floating P&L for exactly this
 * reason. Pricing open legs at their entry price to fill a number would put a
 * confident, wrong exposure figure on the Hub. So the ceiling — which is pure
 * policy and always true — is projected here, and current usage travels on the
 * WariX account snapshot, where authoritative prices exist.
 *
 * `null` therefore means "this account's contract has no such cap" (a V1
 * account), never "we could not work it out".
 */
export interface AccountLimits {
  grossExposure: {
    maximumMultiple: string;
    maximumMultipleFormatted: string;
    maximumAmount: string;
    maximumAmountFormatted: string;
  } | null;
  margin: {
    capRate: string;
    capRateFormatted: string;
    calibrationValidated: boolean;
  } | null;
  leverageByAssetGroup: Readonly<Record<string, number>> | null;
}

/**
 * §17/§19/§57 — what the account's policy requires, against what actually
 * exists.
 *
 * `required` comes from the policy; `sourceReady` from the calendar version
 * attached to it. When a policy requires a calendar and no ready source is
 * rattached, the honest platform state is "this control cannot run", and the
 * pre-trade gate already fails closed on it. Surfaces must render that, not a
 * fabricated countdown to an invented CPI print.
 */
export interface AccountCapabilities {
  news: { required: boolean; sourceReady: boolean };
  marketSession: { required: boolean; sourceReady: boolean };
}

/** §45/§52 — where this account came from. INSTANT has no Evaluation parent, and must never be shown one. */
export interface AccountProvenance {
  sourceEvaluationAccountId: string | null;
  /** True for INSTANT: the account started life in Performance, with no Evaluation behind it. */
  startedDirectlyInPerformance: boolean;
}

/**
 * Addressed by id or by public id, never by both.
 *
 * The trader-facing routes carry the public id (`/comptes/PERF-XXXXX/regles`)
 * and the Hub carries the internal one. A union rather than two optional
 * fields so a caller cannot pass neither and get the first account back.
 */
export type BuildAccountPolicyViewParams = { userId: string; now: Date } & (
  { accountId: string; accountPublicId?: never } | { accountPublicId: string; accountId?: never }
);

export async function buildAccountPolicyView(
  db: Db,
  params: BuildAccountPolicyViewParams,
): Promise<AccountPolicyView | null> {
  let query = db
    .selectFrom('app.trading_accounts')
    .select([
      'id',
      'public_id',
      'product_family',
      'program_type',
      'nominal_balance',
      'currency',
      'status',
      'policy_version_id',
      'activated_at',
      'source_evaluation_account_id',
      'kyc_sandbox_verified',
      'payout_method_sandbox_configured',
    ])
    .where('user_id', '=', params.userId);
  query =
    params.accountId !== undefined
      ? query.where('id', '=', params.accountId)
      : query.where('public_id', '=', params.accountPublicId);
  const account = await query.executeTakeFirst();
  if (!account) return null;

  const policy = await loadPolicyById(db, account.policy_version_id);
  const runtime = await loadV2PolicyRuntimeContext(db, policy.id);
  const parameters = policy.parameters as
    EvaluationOnePolicyParameters | PerformancePolicyParameters;
  const v2 = parameters as unknown as {
    contract_version?: unknown;
    gross_exposure_max_multiple?: string;
    candidate_margin_cap_rate?: string;
    news_calendar_required?: boolean;
    session_calendar_required?: boolean;
  };
  const isV2 = v2.contract_version === V2_POLICY_CONTRACT_VERSION;
  const phase = policy.accountPhase;

  /*
   * INSTANT is a Performance account with no Evaluation parent — the absence
   * of `source_evaluation_account_id` is what makes it one, and §30/§45 turn
   * on never implying otherwise. A FLEX or ONE Performance account always has
   * a parent; a Performance account without one started there.
   */
  const startedDirectlyInPerformance =
    phase === 'performance' && account.source_evaluation_account_id === null;

  const evaluationAccountId =
    phase === 'evaluation' ? account.id : account.source_evaluation_account_id;
  const flexActivation =
    policy.productFamily === 'WARIBA_FLEX'
      ? await loadFlexActivationObligation(db, evaluationAccountId)
      : null;

  const performanceChild =
    phase === 'evaluation'
      ? await db
          .selectFrom('app.trading_accounts')
          .select('id')
          .where('source_evaluation_account_id', '=', account.id)
          .where('user_id', '=', params.userId)
          .executeTakeFirst()
      : null;

  /*
   * Cycle progress only exists for a Performance account that has one. A
   * failure to read it must not take the rules panel down with it: an account
   * whose cycle cannot be evaluated still has a contract, and showing its
   * rules is the more useful half.
   */
  let cycle: Awaited<ReturnType<typeof evaluateCycleProgress>> | null = null;
  if (account.program_type === 'WARIBA_PERFORMANCE') {
    cycle = await evaluateCycleProgress(db, account.id).catch(() => null);
  }

  const nextAction = deriveAccountNextAction({
    status: account.status,
    phase,
    // Finalisation is a daily-boundary fact this projection does not hold;
    // `evaluation-performance-handoff.ts` owns that timeline, so pass_pending
    // resolves to "await finalisation" here rather than guessing at review.
    awaitingPassReview: false,
    flexActivation: flexActivation
      ? flexActivation.status === 'activation_due'
        ? 'due'
        : flexActivation.status
      : 'not_applicable',
    performanceAccountExists: performanceChild !== null || phase === 'performance',
    performanceRulesAcknowledged: true,
    cycle: cycle
      ? {
          bufferReached: cycle.bufferReached,
          performanceDaysCompleted: cycle.performanceDaysCompleted,
          performanceDaysRequired: cycle.performanceDaysRequired,
          bestDayCompliant: cycle.consistencyCompliant,
          financiallyEligible:
            cycle.bufferReached &&
            cycle.consistencyCompliant &&
            cycle.performanceDaysCompleted >= cycle.performanceDaysRequired &&
            new Decimal(cycle.eligibleExcess).greaterThan(0),
          payoutUnderReview: cycle.cycleStatus === 'payout_pending',
          inWaribaReview: false,
        }
      : null,
    kycVerified: account.kyc_sandbox_verified,
    payoutMethodConfigured: account.payout_method_sandbox_configured,
  });

  const marginProfile = runtime.marginProfile;
  const nominalFormatted = formatMoney(account.nominal_balance, account.currency);
  const productLabel = PRODUCT_FAMILY_LABEL[policy.productFamily];
  const phaseLabel = ACCOUNT_PHASE_LABEL[phase];

  return {
    account: {
      id: account.id,
      publicId: account.public_id,
      productFamily: policy.productFamily,
      productLabel,
      phase,
      phaseLabel,
      headerLabel: `${productLabel} · ${phaseLabel} · ${nominalFormatted}`,
      nominalBalance: account.nominal_balance,
      nominalFormatted,
      currency: account.currency,
      status: account.status,
      statusLabel: accountStatusLabel(account.status),
      activatedAt: account.activated_at?.toISOString() ?? null,
    },
    policy: {
      versionId: policy.id,
      semanticVersion: policy.semanticVersion,
      isV2,
      machineHashVerified: policy.hashVerified,
    },
    rules: projectAccountRules({
      parameters,
      phase,
      nominalBalance: account.nominal_balance,
      currency: account.currency,
    }),
    limits: {
      grossExposure: v2.gross_exposure_max_multiple
        ? {
            maximumMultiple: v2.gross_exposure_max_multiple,
            maximumMultipleFormatted: `${new Decimal(v2.gross_exposure_max_multiple)
              .toDecimalPlaces(2)
              .toNumber()
              .toLocaleString('fr-FR')} ×`,
            maximumAmount: new Decimal(account.nominal_balance)
              .times(v2.gross_exposure_max_multiple)
              .toFixed(2),
            maximumAmountFormatted: formatMoney(
              new Decimal(account.nominal_balance).times(v2.gross_exposure_max_multiple).toFixed(2),
              account.currency,
            ),
          }
        : null,
      margin: marginProfile
        ? {
            capRate: marginProfile.candidateMarginCapRate,
            capRateFormatted: formatRate(marginProfile.candidateMarginCapRate) ?? '',
            calibrationValidated: marginProfile.calibrationStatus === 'validated',
          }
        : null,
      leverageByAssetGroup: marginProfile?.leverageByAssetGroup ?? null,
    },
    capabilities: {
      news: {
        required: v2.news_calendar_required === true,
        sourceReady: runtime.newsSourceReady,
      },
      marketSession: {
        required: v2.session_calendar_required === true,
        sourceReady: runtime.sessionSourceReady,
      },
    },
    provenance: {
      sourceEvaluationAccountId: account.source_evaluation_account_id,
      startedDirectlyInPerformance,
    },
    flexActivation,
    nextAction,
  };
}

/**
 * Phase 3.4.4 §6/§40 — what an Evaluation trader will actually be paid, from
 * the Performance policy their account is linked to.
 *
 * ## Why this exists
 *
 * The Hub hero showed every Evaluation account `85 % → 90 %`, written as a
 * literal in the page. That is WARIBA ONE V1's schedule. Under V2 the first
 * two cycles pay 80 %, so the number on the hero was wrong for every V2
 * account — and wrong in the flattering direction, on the screen a trader
 * reads before deciding whether to keep going.
 *
 * The successor is not guessed from the family: `app.policy_performance_links`
 * maps the exact Evaluation policy to the exact Performance policy that will
 * be attached on a pass, so a V1 evaluation still resolves to V1's schedule
 * and a V2 one to V2's.
 *
 * Returns null rather than a fallback when no link or schedule exists. A
 * missing successor is a governance gap, and inventing "85 % → 90 %" to fill
 * it is precisely the bug this replaces.
 */
export async function loadSuccessorPayoutSplit(
  db: Db,
  evaluationPolicyVersionId: string,
): Promise<{ firstFormatted: string; finalFormatted: string; rangeFormatted: string } | null> {
  const performance = await loadCompatiblePerformancePolicy(db, evaluationPolicyVersionId).catch(
    () => null,
  );
  if (!performance) return null;

  const parameters = performance.parameters as Partial<PerformancePolicyParameters> & {
    payout_split_schedule?: readonly string[];
  };
  const schedule = parameters.payout_split_schedule;
  const first = schedule?.[0] ?? parameters.trader_split_rate_default;
  const final = schedule?.[schedule.length - 1] ?? parameters.trader_split_rate_final_cycle;
  if (!first || !final) return null;

  const firstFormatted = formatRate(first);
  const finalFormatted = formatRate(final);
  if (!firstFormatted || !finalFormatted) return null;

  return {
    firstFormatted,
    finalFormatted,
    rangeFormatted:
      firstFormatted === finalFormatted ? firstFormatted : `${firstFormatted} → ${finalFormatted}`,
  };
}
