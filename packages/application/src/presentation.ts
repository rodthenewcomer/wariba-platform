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
  deriveAccountHealth,
  type AccountHealth,
  type AccountHealthView,
  type DeriveAccountHealthParams,
} from './account-health';

export type { AccountSummaryDTO } from './accounts-list';
