import { isSizeCommerciallyAvailableInZone, type ReserveZone } from '@wariba/domain';
import { SANDBOX_PRODUCT_FEATURE_FLAGS, isSandboxProductFeatureEnabled } from './commerce';

/**
 * Prompt 09 milestone 5 — what "enabled" actually means for a product.
 *
 * `product_versions.feature_flag_key` is an identifier. Its presence proves
 * nothing about whether a product is live, and turning `feature_flag_key !=
 * null` into a green badge would be inventing a runtime state the column
 * does not carry.
 *
 * There *is* a canonical resolver — `isSandboxProductFeatureEnabled`, backed
 * by `SANDBOX_PRODUCT_FEATURE_FLAGS` in commerce.ts, the single place the
 * catalogue and order-creation paths both consult. But it is a build-time
 * constant, not a flag service: flipping one requires a code change and a
 * deploy, and nothing at runtime can change it. An operator reading this
 * surface needs to know that, because "disabled" here is not something they
 * can act on from Control.
 *
 * Availability has a second, genuinely runtime input: the treasury reserve
 * zone (TREASURY-002). Either one being off is enough to hide a product, so
 * both are reported separately rather than collapsed into one verdict.
 *
 * Prompt 09 adds no flag service, no flag table and no flag editor.
 */
export const FEATURE_FLAG_STATE_SOURCE =
  'SANDBOX_PRODUCT_FEATURE_FLAGS (packages/application/src/commerce.ts)';

export const FEATURE_FLAG_SOURCE_LIMITATION =
  'Constante de build, pas un service de flags : l’état ne peut pas être modifié à l’exécution ni depuis Control. Le changer exige une modification de code et un déploiement.';

export type FeatureFlagState =
  /** No key on the version — the product is not flag-gated at all. */
  | { kind: 'not_gated' }
  /** The key is present in the canonical map, with this value. */
  | { kind: 'known'; enabled: boolean }
  /**
   * A key the canonical map does not define. The resolver treats this as
   * disabled — fail-closed is right — but an operator must not read it as a
   * deliberate "off": it is an unrecognised key.
   */
  | { kind: 'unknown_key' };

export function resolveFeatureFlagState(featureFlagKey: string | null): FeatureFlagState {
  if (featureFlagKey === null) return { kind: 'not_gated' };
  if (!(featureFlagKey in SANDBOX_PRODUCT_FEATURE_FLAGS)) return { kind: 'unknown_key' };
  return {
    kind: 'known',
    enabled:
      SANDBOX_PRODUCT_FEATURE_FLAGS[featureFlagKey as keyof typeof SANDBOX_PRODUCT_FEATURE_FLAGS],
  };
}

export interface CommercialGateEvaluation {
  featureFlagKey: string | null;
  flagState: FeatureFlagState;
  /** What the canonical resolver answers — fail-closed on an unknown key. */
  flagAllows: boolean;
  zone: ReserveZone;
  /** TREASURY-002: the runtime half. Suppresses 50K/100K in defensive, all in critical. */
  zoneAllows: boolean;
  /** Both halves. The same conjunction the catalogue path applies. */
  commerciallyAvailable: boolean;
}

export function evaluateCommercialGate(params: {
  featureFlagKey: string | null;
  productCode: '5K' | '10K' | '25K' | '50K' | '100K';
  zone: ReserveZone;
}): CommercialGateEvaluation {
  const flagAllows = isSandboxProductFeatureEnabled(params.featureFlagKey);
  const zoneAllows = isSizeCommerciallyAvailableInZone({
    zone: params.zone,
    productCode: params.productCode,
  });
  return {
    featureFlagKey: params.featureFlagKey,
    flagState: resolveFeatureFlagState(params.featureFlagKey),
    flagAllows,
    zone: params.zone,
    zoneAllows,
    commerciallyAvailable: flagAllows && zoneAllows,
  };
}

/**
 * RULESET `commercial_constraints.founder_price_must_have_real_cohort`.
 *
 * `founder_price_amount` is stored but never served: no cohort mechanism
 * exists to decide who qualifies for it. Showing the number without this
 * caveat would imply a working founder programme.
 */
export const FOUNDER_COHORT_GATE_IMPLEMENTED = false;
export const FOUNDER_COHORT_GATE_NOTE =
  'FOUNDER_COHORT_GATE = NON IMPLÉMENTÉ. Le prix founder est stocké mais jamais servi : aucun mécanisme de cohorte ne décide qui y a droit.';

/**
 * Pricing across the catalogue is `CANDIDATE_PENDING_ACTUARIAL_MODEL`
 * (OFFER-019). ACTUARIAL-VARIANCE-001 keeps the model unvalidated, so
 * nothing has promoted these numbers since.
 */
export const PRICING_STATUS_NOTE =
  'Grille candidate (OFFER-019) : les prix restent candidats tant que le modèle actuariel n’est pas validé — et ACTUARIAL_MODEL_VALIDATED reste false.';
