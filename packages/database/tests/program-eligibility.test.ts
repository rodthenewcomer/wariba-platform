import { describe, expect, it } from 'vitest';
import { projectAccountBalances } from '../src/program-eligibility';

const GENERATED_SCENARIOS = 5_000;

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe('account/program/risk balance separation', () => {
  it('keeps an authorized payout debit financial and payout-eligible, but risk-neutral', () => {
    expect(
      projectAccountBalances({
        ledgerEntries: [
          { entry_type: 'initial_balance', amount: '10000', reference_type: null },
          { entry_type: 'realized_pnl', amount: '1000', reference_type: 'fill' },
          { entry_type: 'payout_debit', amount: '-500', reference_type: 'payout_request' },
        ],
        ineligibleShortDurationProfit: '0',
      }),
    ).toEqual({
      accountBalance: '10500.00',
      programEligibleBalance: '10500.00',
      riskAdjustedBalance: '11000.00',
      ineligibleShortDurationProfit: '0.00',
      payoutRiskNeutralAdjustment: '500.00',
    });
  });

  it('neutralizes payout reversal with its debit while retaining trading losses', () => {
    const projection = projectAccountBalances({
      ledgerEntries: [
        { entry_type: 'initial_balance', amount: '10000', reference_type: null },
        { entry_type: 'realized_pnl', amount: '-200', reference_type: 'fill' },
        { entry_type: 'payout_debit', amount: '-500', reference_type: 'payout_request' },
        { entry_type: 'reversal', amount: '500', reference_type: 'payout_request' },
      ],
      ineligibleShortDurationProfit: '0',
    });
    expect(projection.accountBalance).toBe('9800.00');
    expect(projection.riskAdjustedBalance).toBe('9800.00');
    expect(projection.payoutRiskNeutralAdjustment).toBe('0.00');
  });

  it('excludes short-duration positive profit from program and risk projections', () => {
    const projection = projectAccountBalances({
      ledgerEntries: [
        { entry_type: 'initial_balance', amount: '10000', reference_type: null },
        { entry_type: 'realized_pnl', amount: '50', reference_type: 'fill' },
      ],
      ineligibleShortDurationProfit: '50',
    });
    expect(projection.accountBalance).toBe('10050.00');
    expect(projection.programEligibleBalance).toBe('10000.00');
    expect(projection.riskAdjustedBalance).toBe('10000.00');
  });

  it('property: neutralizes only authorized payout effects and retains every real loss across 5,000 seeds', () => {
    for (let seed = 1; seed <= GENERATED_SCENARIOS; seed += 1) {
      const random = seeded(seed);
      const initial = 5_000 + Math.floor(random() * 95_001);
      const tradingLoss = (1 + Math.floor(random() * 1_000)).toFixed(2);
      const payout = (1 + Math.floor(random() * 2_000)).toFixed(2);
      const projection = projectAccountBalances({
        ledgerEntries: [
          { entry_type: 'initial_balance', amount: initial.toFixed(2), reference_type: null },
          { entry_type: 'realized_pnl', amount: `-${tradingLoss}`, reference_type: 'fill' },
          { entry_type: 'payout_debit', amount: `-${payout}`, reference_type: 'payout_request' },
        ],
        ineligibleShortDurationProfit: '0',
      });

      expect(projection.riskAdjustedBalance).toBe((initial - Number(tradingLoss)).toFixed(2));
      expect(projection.accountBalance).toBe(
        (initial - Number(tradingLoss) - Number(payout)).toFixed(2),
      );
      expect(projection.payoutRiskNeutralAdjustment).toBe(payout);
    }
  });
});
