import { describe, expect, it } from 'vitest';
import {
  V2_POLICY_PARAMETERS,
  computeMachineHash,
  evaluateV2CapabilityReadiness,
  parseAndVerifyPolicy,
} from '../src/index';

const expectedHashes = {
  oneEvaluation: 'sha256:2df974ac9d497d9b928d61725f8539e492f5514f51b6510dfc43796c2dd09fb6',
  flexEvaluation: 'sha256:f3a2347cf9beaffaf9293fc39158da74b05aa5eaba1f650ed59e5bcadfc89051',
  onePerformance: 'sha256:248f59456d036513f59f6a8809e73f5c74af5460e7275f074b6785a583e1f098',
  flexPerformance: 'sha256:f42d637e6ba2714b94e3ff9aee13410a50deda2e56664c0850d302ddea3c05e6',
  instantPerformance: 'sha256:f1e8b4413af408f3c914822566dd0ea88c25c7301be7d48510ec0527867f89b4',
} as const;

describe('canonical V2 policy contract', () => {
  it('keeps the five machine-policy hashes stable', () => {
    for (const key of Object.keys(expectedHashes) as (keyof typeof expectedHashes)[]) {
      expect(computeMachineHash(V2_POLICY_PARAMETERS[key])).toBe(expectedHashes[key]);
    }
  });

  it('encodes ONE/FLEX/INSTANT normative risk values and the payout schedule', () => {
    expect(V2_POLICY_PARAMETERS.oneEvaluation).toMatchObject({
      profit_target_rate: '0.08',
      daily_loss_rate: '0.03',
      maximum_loss_rate: '0.08',
      best_day_max_ratio: '0.35',
    });
    expect(V2_POLICY_PARAMETERS.flexEvaluation).toMatchObject({
      profit_target_rate: '0.04',
      daily_loss_rate: '0.03',
      maximum_loss_rate: '0.06',
      best_day_max_ratio: '0.35',
    });
    expect(V2_POLICY_PARAMETERS.instantPerformance).toMatchObject({
      daily_loss_rate: '0.02',
      maximum_loss_rate: '0.05',
      best_day_max_ratio: '0.30',
      permanent_buffer_rate: '0.03',
      payout_split_schedule: ['0.80', '0.80', '0.85', '0.85', '0.90'],
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
