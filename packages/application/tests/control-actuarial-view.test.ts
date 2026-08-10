import { describe, expect, it } from 'vitest';
import { MINIMUM_COMPARABLE_SAMPLE } from '@wariba/domain';
import type { PersistedActuarialVarianceRun } from '@wariba/database';
import { resolveActuarialModelValidation } from '../src/control-actuarial-view';

/**
 * Prompt 09 milestone 4 — the actuarial console must never report the model
 * as validated.
 *
 * The failure this guards against is subtle: coverage answers "is the sample
 * big enough to compare?", and it is tempting to read `comparable` as "the
 * model checks out". No tolerance band exists anywhere in the platform that
 * would justify that step, so the surface says NOT VALIDATED in every case
 * and names what is missing.
 */
function varianceRun(
  overrides: Partial<PersistedActuarialVarianceRun>,
): PersistedActuarialVarianceRun {
  return {
    id: 'run-1',
    scenarioRunId: 'scenario-run-1',
    scenarioName: 'base',
    scenarioVersion: 1,
    asOf: '2026-08-01T00:00:00.000Z',
    modelCohortSize: 1000,
    actualSampleSize: 0,
    coverage: 'insufficient_data',
    metrics: [],
    executedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('resolveActuarialModelValidation', () => {
  it('reports not validated when no comparison has ever been recorded', () => {
    const validation = resolveActuarialModelValidation([]);
    expect(validation.validated).toBe(false);
    expect(validation.latestCoverage).toBeNull();
    expect(validation.latestSampleSize).toBeNull();
    expect(validation.reason).toContain('Aucune comparaison');
  });

  it('reports not validated when the sample is too small to interpret', () => {
    const validation = resolveActuarialModelValidation([
      varianceRun({ coverage: 'partial', actualSampleSize: 5 }),
    ]);
    expect(validation.validated).toBe(false);
    expect(validation.latestCoverage).toBe('partial');
    expect(validation.latestSampleSize).toBe(5);
  });

  it('still reports not validated when coverage is comparable', () => {
    const validation = resolveActuarialModelValidation([
      varianceRun({ coverage: 'comparable', actualSampleSize: 5000 }),
    ]);
    // Sample sufficiency is not model correctness. Promoting one to the
    // other would be inventing a certification the platform never performed.
    expect(validation.validated).toBe(false);
    expect(validation.reason).toContain('NON VALIDÉ');
  });

  it('reads the most recent run, which the loader returns first', () => {
    const validation = resolveActuarialModelValidation([
      varianceRun({ id: 'newest', coverage: 'comparable', actualSampleSize: 900 }),
      varianceRun({ id: 'older', coverage: 'partial', actualSampleSize: 2 }),
    ]);
    expect(validation.latestSampleSize).toBe(900);
  });

  it('publishes the canonical comparability threshold rather than a local copy', () => {
    expect(resolveActuarialModelValidation([]).minimumComparableSample).toBe(
      MINIMUM_COMPARABLE_SAMPLE,
    );
  });
});
