import { describe, expect, it } from 'vitest';
import {
  V2_POLICY_PARAMETERS,
  computeMachineHash,
  evaluateV2CapabilityReadiness,
  parseAndVerifyPolicy,
} from '../src/index';

const expectedHashes = {
  oneEvaluation: 'sha256:45854cbeaf63df291ef7a5d8ab930aecebfb4098afce2eddb72083c016f2e862',
  flexEvaluation: 'sha256:a4c9b28f08502dc7284af3aca41ef9092f5e64f1e0f9d50b855f65ea90ba7ff8',
  onePerformance: 'sha256:1f7f85498ed6df454586e3b8b79cc5380c6ff7b523f0cbdde7b6ff5c82adaa5e',
  flexPerformance: 'sha256:4c570850b8e00cbc7352a5b6d1f6fe2547c7468a78ef1db61b13fdb1c8a8392a',
  instantPerformance: 'sha256:d1f368ab61d6009e18a3a57ab6e9089cb15d168c2954826d1e0c3cb6e09bb58a',
} as const;

describe('canonical V2 policy contract', () => {
  it('keeps the five machine-policy hashes stable', () => {
    const actualHashes = Object.fromEntries(
      (Object.keys(expectedHashes) as (keyof typeof expectedHashes)[]).map((key) => [
        key,
        computeMachineHash(V2_POLICY_PARAMETERS[key]),
      ]),
    );
    expect(actualHashes).toEqual(expectedHashes);
  });

  it('encodes ONE/FLEX/INSTANT normative risk values and the payout schedule', () => {
    expect(V2_POLICY_PARAMETERS.oneEvaluation).toMatchObject({
      profit_target_rate: '0.08',
      daily_loss_rate: '0.03',
      maximum_loss_rate: '0.08',
      best_day_max_ratio: '0.35',
      gross_exposure_max_multiple: '3.00',
      margin_calibration_status: 'validated',
    });
    expect(V2_POLICY_PARAMETERS.flexEvaluation).toMatchObject({
      profit_target_rate: '0.04',
      daily_loss_rate: '0.03',
      maximum_loss_rate: '0.06',
      best_day_max_ratio: '0.35',
      gross_exposure_max_multiple: '3.00',
    });
    expect(V2_POLICY_PARAMETERS.instantPerformance).toMatchObject({
      daily_loss_rate: '0.02',
      maximum_loss_rate: '0.05',
      best_day_max_ratio: '0.30',
      permanent_buffer_rate: '0.03',
      payout_split_schedule: ['0.80', '0.80', '0.85', '0.85', '0.90'],
      gross_exposure_max_multiple: '2.00',
    });
  });

  it('loads V2 only when row identity and machine hash agree', () => {
    const parameters = V2_POLICY_PARAMETERS.flexEvaluation;
    const loaded = parseAndVerifyPolicy(
      {
        id: 'flex-v2',
        program: 'WARIBA_FLEX',
        product_family: 'WARIBA_FLEX',
        account_phase: 'evaluation',
        semantic_version: '2.0.0',
        status: 'pilot_ready',
        parameters_json: parameters,
        machine_hash: computeMachineHash(parameters),
      },
      { strict: true },
    );
    expect(loaded.productFamily).toBe('WARIBA_FLEX');
    expect(loaded.accountPhase).toBe('evaluation');

    expect(() =>
      parseAndVerifyPolicy({
        id: 'forged-row',
        program: 'WARIBA_FLEX',
        product_family: 'WARIBA_ONE',
        account_phase: 'evaluation',
        semantic_version: '2.0.0',
        status: 'pilot_ready',
        parameters_json: parameters,
        machine_hash: computeMachineHash(parameters),
      }),
    ).toThrow(/row\/product family mismatch/);
  });

  it('keeps every seeded V2 capability fail-closed while calibration/providers are open', () => {
    const readiness = evaluateV2CapabilityReadiness({
      policy: V2_POLICY_PARAMETERS.instantPerformance,
      marginCalibrationValidated: false,
      sessionCalendarReady: false,
      newsCalendarReady: false,
      purchaseGateEnabled: false,
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.blockingReasonCodes).toEqual([
      'V2_PURCHASE_GATE_DISABLED',
      'MARGIN_CALIBRATION_REQUIRED',
      'MARKET_SESSION_CALENDAR_NOT_READY',
      'NEWS_CALENDAR_NOT_READY',
    ]);
  });
});
