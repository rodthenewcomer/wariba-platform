import {
  parseAndVerifyPolicy,
  type EvaluationOnePolicyParameters,
  type LoadedPolicy,
} from '@wariba/policies';
import type { Db } from './client';

/**
 * Loads the currently published policy for a program and parses/verifies it
 * through @wariba/policies. Ordered by `created_at`, not `effective_from` —
 * `effective_from` is a business-meaning "when does this policy start
 * applying" field that can (and, for the seeded v1.1.0 row, does) predate
 * the migration that actually inserts the row, so it is not a reliable
 * "which row is newest" ordering. `created_at` is a DB-side `default now()`
 * that is guaranteed monotonic with migration application order.
 *
 * (This fixes a real bug: activation.ts previously ordered by
 * `effective_from`, which — because the v1.0.0 row was seeded with
 * `effective_from = now()` and the v1.1.0 row was seeded with a hardcoded
 * `effective_from = '2026-08-03T00:00:00Z'` — was silently pinning new
 * account activations to the stale v1.0.0 policy.)
 */
export async function loadPublishedPolicy(
  trx: Db,
  program: 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_PERFORMANCE',
): Promise<LoadedPolicy> {
  const row = await trx
    .selectFrom('app.policy_versions')
    .select([
      'id',
      'program',
      'semantic_version',
      'status',
      'parameters_json',
      'machine_hash',
      'product_family',
      'account_phase',
    ])
    .where('program', '=', program)
    .where('status', '=', 'published')
    .orderBy('created_at', 'desc')
    .executeTakeFirstOrThrow(
      () => new Error(`No published ${program} policy version — cannot proceed without one.`),
    );

  return parseAndVerifyPolicy(row, { strict: true });
}

export async function loadPolicyById(trx: Db, policyVersionId: string): Promise<LoadedPolicy> {
  const row = await trx
    .selectFrom('app.policy_versions')
    .select([
      'id',
      'program',
      'semantic_version',
      'status',
      'parameters_json',
      'machine_hash',
      'product_family',
      'account_phase',
    ])
    .where('id', '=', policyVersionId)
    .executeTakeFirstOrThrow(() => new Error(`Policy version ${policyVersionId} not found.`));

  return parseAndVerifyPolicy(row, { strict: true });
}

export async function loadCompatiblePerformancePolicy(
  trx: Db,
  evaluationPolicyVersionId: string,
): Promise<LoadedPolicy> {
  const link = await trx
    .selectFrom('app.policy_performance_links')
    .select('performance_policy_version_id')
    .where('evaluation_policy_version_id', '=', evaluationPolicyVersionId)
    .executeTakeFirstOrThrow(
      () =>
        new Error(
          `No compatible Performance policy linked to Evaluation policy ${evaluationPolicyVersionId}.`,
        ),
    );
  const performance = await loadPolicyById(trx, link.performance_policy_version_id);
  if (performance.accountPhase !== 'performance') {
    throw new Error(`Linked policy ${performance.id} is not a Performance policy.`);
  }
  return performance;
}

export async function assertPolicyActivationReady(trx: Db, policyVersionId: string): Promise<void> {
  const row = await trx
    .selectFrom('app.policy_versions as policy')
    .leftJoin('app.margin_profiles as margin', 'margin.id', 'policy.margin_profile_id')
    .leftJoin('app.news_calendar_versions as news', 'news.id', 'policy.news_calendar_version_id')
    .leftJoin(
      'app.session_calendar_versions as session',
      'session.id',
      'policy.session_calendar_version_id',
    )
    .select([
      'policy.status',
      'policy.parameters_json',
      'margin.calibration_status',
      'news.source_ready as news_source_ready',
      'session.source_ready as session_source_ready',
    ])
    .where('policy.id', '=', policyVersionId)
    .executeTakeFirstOrThrow(() => new Error(`Policy version ${policyVersionId} not found.`));
  const parameters = row.parameters_json as {
    contract_version?: unknown;
    news_calendar_required?: unknown;
    session_calendar_required?: unknown;
  };
  if (parameters.contract_version !== 'WARIBA_POLICY_V2') return;

  const blockers: string[] = [];
  if (row.status !== 'published') blockers.push('V2_POLICY_NOT_PUBLISHED');
  if (row.calibration_status !== 'validated') blockers.push('MARGIN_CALIBRATION_REQUIRED');
  if (parameters.session_calendar_required === true && row.session_source_ready !== true) {
    blockers.push('MARKET_SESSION_CALENDAR_NOT_READY');
  }
  if (parameters.news_calendar_required === true && row.news_source_ready !== true) {
    blockers.push('NEWS_CALENDAR_NOT_READY');
  }
  if (blockers.length > 0) {
    throw new Error(`V2 activation blocked: ${blockers.join(',')}`);
  }
}

/**
 * The WARIBA ONE sibling of performance.ts's `asPerformancePolicy` —
 * runtime-checked narrowing so a caller that is only ever handed an
 * Evaluation policy can read `profit_target_rate` without a bare cast, and
 * fails loudly rather than silently if it is ever handed the other program.
 */
export function asEvaluationOnePolicy(policy: LoadedPolicy): EvaluationOnePolicyParameters {
  if (policy.accountPhase !== 'evaluation') {
    throw new Error(`Expected a WARIBA_ONE policy, got ${policy.program}.`);
  }
  return policy.parameters as EvaluationOnePolicyParameters;
}
