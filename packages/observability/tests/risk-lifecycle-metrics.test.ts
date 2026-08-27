import { describe, expect, it } from 'vitest';
import {
  RISK_LIFECYCLE_METRICS,
  buildRiskLifecycleDimensions,
  createRiskLifecycleRecorder,
  type MetricSample,
} from '../src/risk-lifecycle-metrics';

const BASE = {
  productFamily: 'WARIBA_ONE',
  accountPhase: 'performance',
  nominalBalance: '10000.00',
  policySemanticVersion: '2.0.0-one',
} as const;

describe('risk lifecycle metrics', () => {
  it('records a counter with only the allow-listed dimensions', () => {
    const samples: MetricSample[] = [];
    const recorder = createRiskLifecycleRecorder((sample) => samples.push(sample));
    recorder.increment(RISK_LIFECYCLE_METRICS.HARD_BREACHES_TOTAL, {
      ...BASE,
      reasonCode: 'MAXIMUM_LOSS_BREACHED',
    });
    expect(samples).toHaveLength(1);
    expect(samples[0]?.metric).toBe('wariba_hard_breaches_total');
    expect(samples[0]?.value).toBe(1);
    expect(samples[0]?.dimensions).toStrictEqual({
      productFamily: 'WARIBA_ONE',
      accountPhase: 'performance',
      nominalBalance: '10000.00',
      policySemanticVersion: '2.0.0-one',
      reasonCode: 'MAXIMUM_LOSS_BREACHED',
    });
  });

  it('drops high-cardinality fields rather than passing them through', () => {
    const dimensions = buildRiskLifecycleDimensions({
      ...BASE,
      accountId: 'e2f1c9a0-0000-4000-8000-000000000000',
      userId: 'a-user',
      correlationId: 'a-correlation',
    });
    expect(dimensions).not.toHaveProperty('accountId');
    expect(dimensions).not.toHaveProperty('userId');
    expect(dimensions).not.toHaveProperty('correlationId');
  });

  it('omits an unknown country instead of bucketing it', () => {
    expect(buildRiskLifecycleDimensions({ ...BASE, country: '' })).not.toHaveProperty('country');
    expect(buildRiskLifecycleDimensions({ ...BASE, country: 'CI' }).country).toBe('CI');
  });

  it('carries a monetary amount for the excluded short-duration profit counter', () => {
    const samples: MetricSample[] = [];
    const recorder = createRiskLifecycleRecorder((sample) => samples.push(sample));
    recorder.increment(RISK_LIFECYCLE_METRICS.SHORT_PROFIT_EXCLUDED_AMOUNT, BASE, 399.7);
    expect(samples[0]?.value).toBeCloseTo(399.7, 2);
  });

  it('refuses a non-finite value rather than emitting NaN into a series', () => {
    const recorder = createRiskLifecycleRecorder(() => undefined);
    expect(() =>
      recorder.increment(RISK_LIFECYCLE_METRICS.PAYOUT_PAID_TOTAL, BASE, Number.NaN),
    ).toThrow(/non-finite/);
  });
});
