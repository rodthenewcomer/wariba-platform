import {
  loadActuarialScenarioRunModel,
  loadRecentActuarialVarianceRuns,
  measureActuarialActuals,
  recordActuarialVarianceRun,
  recordStaffAuditEvent,
  type Db,
  type PersistedActuarialVarianceRun,
} from '@wariba/database';
import {
  MINIMUM_COMPARABLE_SAMPLE,
  type ActuarialActuals,
  type VarianceCoverage,
} from '@wariba/domain';
import { loadActuarialControlState } from './actuarial-scenarios';

/**
 * Prompt 09 milestone 4 — the actuarial console's read model.
 *
 * The three halves are kept apart on purpose, because conflating them is the
 * failure this surface exists to prevent:
 *
 * - **MODEL** is simulation. Each scenario run carries its own immutable
 *   snapshot of the assumptions it executed under.
 * - **ACTUAL** is measured from rows the platform really wrote. Nothing is
 *   imputed, extrapolated, or defaulted to the model.
 * - **VARIANCE** is a third, immutable artifact referencing both. It is
 *   never written back into either side.
 *
 * Control adds no fourth calculator. `measureActuarialActuals` and
 * `compareModelToActual` are the engines from Appendix 08-A; this module
 * reads them and presents them.
 */
export interface ActuarialModelValidation {
  /**
   * Always false. Typed as the literal so no future edit can flip it
   * without a reviewer noticing the type change.
   */
  validated: false;
  /** Coverage of the most recent variance run, or null if none exists. */
  latestCoverage: VarianceCoverage | null;
  latestSampleSize: number | null;
  minimumComparableSample: number;
  reason: string;
}

const NO_VARIANCE_RUN_REASON =
  'Aucune comparaison MODEL / ACTUAL n’a été enregistrée : le modèle n’a jamais été confronté aux données réelles.';
const INSUFFICIENT_REASON =
  'La dernière comparaison ne dispose pas d’assez d’observations réelles pour être interprétée.';
/**
 * Even at `comparable`, coverage answers "is the sample large enough to
 * compare?" — not "does the model match reality?". No tolerance band exists
 * anywhere in the platform that would turn a comparison into a verdict, so
 * promoting sample sufficiency into validation would be inventing the
 * certification this field is supposed to report.
 */
const NO_VALIDATION_MECHANISM_REASON =
  'La couverture mesure la taille de l’échantillon, pas la justesse du modèle. Aucun seuil de validation canonique n’existe : le modèle reste NON VALIDÉ.';

export function resolveActuarialModelValidation(
  varianceRuns: readonly PersistedActuarialVarianceRun[],
): ActuarialModelValidation {
  const latest = varianceRuns[0];
  if (!latest) {
    return {
      validated: false,
      latestCoverage: null,
      latestSampleSize: null,
      minimumComparableSample: MINIMUM_COMPARABLE_SAMPLE,
      reason: NO_VARIANCE_RUN_REASON,
    };
  }
  return {
    validated: false,
    latestCoverage: latest.coverage,
    latestSampleSize: latest.actualSampleSize,
    minimumComparableSample: MINIMUM_COMPARABLE_SAMPLE,
    reason: latest.coverage === 'comparable' ? NO_VALIDATION_MECHANISM_REASON : INSUFFICIENT_REASON,
  };
}

export interface ActuarialConsoleView {
  scenarios: Awaited<ReturnType<typeof loadActuarialControlState>>['scenarios'];
  runs: Awaited<ReturnType<typeof loadActuarialControlState>>['runs'];
  defaultRunInput: Awaited<ReturnType<typeof loadActuarialControlState>>['defaultRunInput'];
  /** Measured now from persisted operations — a measurement, not a projection. */
  actuals: ActuarialActuals;
  varianceRuns: readonly PersistedActuarialVarianceRun[];
  validation: ActuarialModelValidation;
  measuredAt: Date;
}

export async function buildActuarialConsoleView(db: Db): Promise<ActuarialConsoleView> {
  const [state, actuals, varianceRuns] = await Promise.all([
    loadActuarialControlState(db),
    measureActuarialActuals(db),
    loadRecentActuarialVarianceRuns(db),
  ]);

  return {
    scenarios: state.scenarios,
    runs: state.runs,
    defaultRunInput: state.defaultRunInput,
    actuals,
    varianceRuns,
    validation: resolveActuarialModelValidation(varianceRuns),
    measuredAt: new Date(),
  };
}

export interface RecordActuarialVarianceParams {
  scenarioRunId: string;
  executedBy: string;
  executedByRole: string;
  correlationId?: string;
}

/**
 * Records one immutable MODEL vs ACTUAL comparison.
 *
 * The MODEL side is read back from the referenced run's own snapshot, never
 * supplied by the caller — a variance whose model half came from the browser
 * would compare reality against whatever the operator typed. The ACTUAL side
 * is measured fresh. Neither existing artifact is modified.
 */
export async function recordActuarialVariance(
  db: Db,
  params: RecordActuarialVarianceParams,
): Promise<PersistedActuarialVarianceRun> {
  const model = await loadActuarialScenarioRunModel(db, params.scenarioRunId);
  const now = new Date();
  const run = await recordActuarialVarianceRun(db, {
    scenarioRunId: params.scenarioRunId,
    model,
    executedBy: params.executedBy,
    now,
  });

  await recordStaffAuditEvent(db, {
    actorId: params.executedBy,
    actorRole: params.executedByRole,
    permission: 'actuarial.modify',
    action: 'actuarial.variance_recorded',
    targetType: 'actuarial_variance_run',
    targetId: run.id,
    before: null,
    after: {
      scenarioRunId: run.scenarioRunId,
      coverage: run.coverage,
      actualSampleSize: run.actualSampleSize,
    },
    reason: 'Compare persisted actuarial model against measured actuals',
    correlationId: params.correlationId ?? run.id,
    occurredAt: run.executedAt,
  });

  return run;
}
