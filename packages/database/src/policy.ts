import { parseAndVerifyPolicy, type LoadedPolicy } from '@wariba/policies';
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
  program: 'WARIBA_ONE' | 'WARIBA_PERFORMANCE',
): Promise<LoadedPolicy> {
  const row = await trx
    .selectFrom('app.policy_versions')
    .select(['id', 'program', 'semantic_version', 'status', 'parameters_json', 'machine_hash'])
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
    .select(['id', 'program', 'semantic_version', 'status', 'parameters_json', 'machine_hash'])
    .where('id', '=', policyVersionId)
    .executeTakeFirstOrThrow(() => new Error(`Policy version ${policyVersionId} not found.`));

  return parseAndVerifyPolicy(row, { strict: true });
}
