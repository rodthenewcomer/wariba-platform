/**
 * The dependency-free half of the application layer.
 *
 * ## Why this subpath exists
 *
 * `@wariba/application`'s main barrel re-exports the read models, and those
 * import `@wariba/database`, which imports `pg`. That is correct for a server
 * component and fatal for a client one: importing anything from the barrel in
 * a `'use client'` module drags a Postgres driver into the browser bundle, and
 * the build fails on `Can't resolve 'fs'`.
 *
 * The modules re-exported here are pure — labels, projections and arithmetic
 * over values they are handed, with no I/O and no database import anywhere in
 * their graph. They are exactly what a client component legitimately needs:
 * the vocabulary and the shapes, never the queries.
 *
 * Importing from `@wariba/application/presentation` in a client component is
 * supported. Importing from `@wariba/application` there is not, and the build
 * will say so.
 */

export { ACCOUNT_STATUS_LABEL, accountStatusLabel } from './account-status-labels';

export {
  deriveAccountLifecycle,
  deriveAccountLifecycleState,
  journeyStepIndex,
  EVALUATION_JOURNEY,
  type AccountLifecycleState,
  type AccountLifecycleView,
  type LifecycleTone,
  type DeriveAccountLifecycleParams,
} from './account-lifecycle';

export {
  deriveKycState,
  kycView,
  reachableKycStates,
  KYC_PROVIDER_INTEGRATED,
  type KycState,
  type KycView,
} from './kyc-state';

export {
  identityEvidenceRequirement,
  type IdentityDecisionStatus,
  type IdentityEvidenceRequirement,
} from './identity-evidence';

export {
  deriveAccountHealth,
  type AccountHealth,
  type AccountHealthView,
  type DeriveAccountHealthParams,
} from './account-health';

export type { AccountSummaryDTO } from './accounts-list';

/*
 * Type-only, and therefore safe here.
 *
 * `command-center.ts` imports `@wariba/database` and must never reach a client
 * bundle — but `export type` is erased entirely at compile time, so this adds
 * no runtime edge. It is the same arrangement `AccountSummaryDTO` above
 * already relies on, and it lets the Hub's polling hook name the shape it
 * receives instead of restating it.
 */
export type { AccountTelemetry } from './command-center';

/* Type-only, same reasoning as above — `activity-view` imports the database. */
export type { ActivityItem } from './activity-view';

/**
 * Phase 3.4.4 §15/§55/§68 — the canonical reason-code vocabulary.
 *
 * Pure: its only import is `@wariba/policies`' registry, which is zod and
 * constants. WariX needs it in a client component to render a server refusal,
 * which is precisely the case this subpath exists for.
 */
export {
  reasonCodeCopy,
  resolveReasonCodeCopy,
  ALL_REASON_CODE_COPY,
  UNKNOWN_REASON_COPY,
  type ReasonCodeCopy,
  type ReasonSeverity,
} from './reason-code-copy';

export {
  projectAccountRules,
  formatRate,
  formatMoney,
  ACCOUNT_RULE_LABEL,
  PRODUCT_FAMILY_LABEL,
  ACCOUNT_PHASE_LABEL,
  type AccountRuleItem,
  type AccountRuleKey,
} from './account-policy-rules';

export {
  deriveAccountNextAction,
  type AccountNextAction,
  type AccountNextActionKind,
  type AccountNextActionFacts,
} from './account-next-action';
