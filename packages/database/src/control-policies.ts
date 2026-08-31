import { sql } from 'kysely';
import type { Db } from './client';

/**
 * Prompt 09 milestone 5 — the policy explorer.
 *
 * Read-only, and deliberately so. `app.policy_versions` has a lifecycle
 * column (`draft → reviewed → approved → published → retired`), but a schema
 * state machine is not authorization to expose a staff mutation: no write
 * path to this table exists anywhere in application code, only migrations.
 * Control inspects what governance published; it does not publish.
 *
 * "Which policy is currently in force" is not re-derived here. It is the
 * exact row `loadPublishedPolicy` would return — status `published`, newest
 * by `created_at` — because a second answer computed for display could
 * disagree with the one that actually pins new accounts. See policy.ts for
 * why `created_at` and not `effective_from` orders that choice.
 */
export type PolicyProgram = 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_PERFORMANCE';
export type PolicyStatus =
  'draft' | 'reviewed' | 'approved' | 'pilot_ready' | 'published' | 'retired';

export const POLICY_PROGRAMS: readonly PolicyProgram[] = [
  'WARIBA_ONE',
  'WARIBA_FLEX',
  'WARIBA_PERFORMANCE',
];
export const POLICY_STATUSES: readonly PolicyStatus[] = [
  'draft',
  'reviewed',
  'approved',
  'pilot_ready',
  'published',
  'retired',
];

export interface ControlPolicyFilters {
  program?: PolicyProgram;
  status?: PolicyStatus;
  /** Matches the semantic version as literal text. */
  semanticVersion?: string;
  /** true → retired_at is set; false → retired_at is null. */
  retired?: boolean;
}

export interface ControlPolicyRow {
  id: string;
  program: PolicyProgram;
  semanticVersion: string;
  status: PolicyStatus;
  effectiveFrom: Date | null;
  retiredAt: Date | null;
  humanDocumentHash: string | null;
  machineHash: string | null;
  createdAt: Date;
  /** True only for the row the loader would actually resolve for its program. */
  currentlyEffective: boolean;
}

export interface ControlPolicyPage {
  policies: readonly ControlPolicyRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const CONTROL_POLICIES_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/**
 * The policy version each program is actually running on.
 *
 * Same selection as `loadPublishedPolicy`: `status = 'published'`, newest by
 * `created_at`. Not the newest row, not the highest semantic version, not
 * "retired_at is null" — each of those would be an invented rule that could
 * disagree with the engine on the one question this surface exists to
 * answer.
 */
export async function resolveEffectivePolicyVersionIds(db: Db): Promise<ReadonlySet<string>> {
  const rows = await db
    .selectFrom('app.policy_versions')
    .select(['id', 'program'])
    .where('status', '=', 'published')
    .orderBy('program', 'asc')
    .orderBy('created_at', 'desc')
    .execute();

  const effective = new Map<string, string>();
  for (const row of rows) {
    if (!effective.has(row.program)) effective.set(row.program, row.id);
  }
  return new Set(effective.values());
}

export async function searchControlPolicies(
  db: Db,
  params: { filters?: ControlPolicyFilters; page?: number; pageSize?: number } = {},
): Promise<ControlPolicyPage> {
  const filters = params.filters ?? {};
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? CONTROL_POLICIES_PAGE_SIZE),
  );

  let base = db.selectFrom('app.policy_versions');
  if (filters.program) base = base.where('program', '=', filters.program);
  if (filters.status) base = base.where('status', '=', filters.status);
  if (filters.semanticVersion) {
    base = base.where('semantic_version', '=', filters.semanticVersion);
  }
  if (filters.retired !== undefined) {
    base = filters.retired
      ? base.where('retired_at', 'is not', null)
      : base.where('retired_at', 'is', null);
  }

  const [rows, totals, effectiveIds] = await Promise.all([
    base
      .select([
        'id',
        'program',
        'semantic_version',
        'status',
        'effective_from',
        'retired_at',
        'human_document_hash',
        'machine_hash',
        'created_at',
      ])
      .orderBy('program', 'asc')
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute(),
    base.select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
    resolveEffectivePolicyVersionIds(db),
  ]);

  return {
    policies: rows.map((row) => ({
      id: row.id,
      program: row.program,
      semanticVersion: row.semantic_version,
      status: row.status,
      effectiveFrom: row.effective_from,
      retiredAt: row.retired_at,
      humanDocumentHash: row.human_document_hash,
      machineHash: row.machine_hash,
      createdAt: row.created_at,
      currentlyEffective: effectiveIds.has(row.id),
    })),
    total: Number(totals?.count ?? 0),
    page,
    pageSize,
  };
}

export interface ControlPolicyUsage {
  /** Accounts pinned to this exact policy version. */
  accountCount: number;
  evaluationAccountCount: number;
  performanceAccountCount: number;
}

export interface ControlPolicyDetail extends ControlPolicyRow {
  /** Exactly as stored. Never normalized into plausible-looking policy data. */
  parametersJson: unknown;
  usage: ControlPolicyUsage;
}

export async function loadControlPolicyDetail(
  db: Db,
  policyVersionId: string,
): Promise<ControlPolicyDetail | null> {
  const row = await db
    .selectFrom('app.policy_versions')
    .selectAll()
    .where('id', '=', policyVersionId)
    .executeTakeFirst();
  if (!row) return null;

  const [usage, effectiveIds] = await Promise.all([
    // Evidence, not a control: Control never migrates an account to a newer
    // policy, and never rewrites the version an account was pinned to.
    db
      .selectFrom('app.trading_accounts')
      .select((eb) => [
        eb.fn.countAll().as('total'),
        sql<string>`count(*) filter (where program_type = 'WARIBA_ONE')`.as('evaluation'),
        sql<string>`count(*) filter (where program_type = 'WARIBA_PERFORMANCE')`.as('performance'),
      ])
      .where('policy_version_id', '=', policyVersionId)
      .executeTakeFirst(),
    resolveEffectivePolicyVersionIds(db),
  ]);

  return {
    id: row.id,
    program: row.program,
    semanticVersion: row.semantic_version,
    status: row.status,
    effectiveFrom: row.effective_from,
    retiredAt: row.retired_at,
    humanDocumentHash: row.human_document_hash,
    machineHash: row.machine_hash,
    createdAt: row.created_at,
    currentlyEffective: effectiveIds.has(row.id),
    parametersJson: row.parameters_json,
    usage: {
      accountCount: Number(usage?.total ?? 0),
      evaluationAccountCount: Number(usage?.evaluation ?? 0),
      performanceAccountCount: Number(usage?.performance ?? 0),
    },
  };
}
