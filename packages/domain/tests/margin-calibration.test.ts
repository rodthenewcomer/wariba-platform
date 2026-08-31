import { describe, expect, it } from 'vitest';
import {
  calibrateCell,
  calibrateMatrix,
  deriveGrossNotionalCapRate,
  type CalibrationProfile,
  type InstrumentCalibrationSpec,
} from '../src/index';

/**
 * Phase 3.4.3 §49/§50 — the reference dataset is copied from what the
 * repository actually seeds, not invented: `app.symbol_specs` for the
 * WARIBA-SANDBOX-SYMBOLS-1.1.0 set (contract size, minimum quantity, step,
 * commission) and SANDBOX_BASE_PRICES in
 * packages/adapters/src/market-data-provider.ts for the reference quote.
 * US30 and the energies have neither, so they stay unpriced here rather
 * than being given a plausible number.
 */
const INSTRUMENTS: readonly InstrumentCalibrationSpec[] = [
  {
    symbol: 'EURUSD',
    assetGroup: 'FX',
    contractSize: '100000',
    referencePrice: '1.08450',
    minimumQuantity: '0.01',
    quantityStep: '0.01',
    commissionPerLot: '7.00',
    status: 'reference_only',
  },
  {
    symbol: 'GBPUSD',
    assetGroup: 'FX',
    contractSize: '100000',
    referencePrice: '1.26000',
    minimumQuantity: '0.01',
    quantityStep: '0.01',
    commissionPerLot: '7.00',
    status: 'reference_only',
  },
  {
    symbol: 'XAUUSD',
    assetGroup: 'METALS',
    contractSize: '100',
    referencePrice: '2000.00',
    minimumQuantity: '0.01',
    quantityStep: '0.01',
    commissionPerLot: '8.00',
    status: 'reference_only',
  },
  {
    symbol: 'NAS100',
    assetGroup: 'INDICES',
    contractSize: '1',
    referencePrice: '18000.0',
    minimumQuantity: '0.1',
    quantityStep: '0.1',
    commissionPerLot: '0.00',
    status: 'reference_only',
  },
  {
    symbol: 'US30',
    assetGroup: 'INDICES',
    contractSize: '1',
    referencePrice: null,
    minimumQuantity: '0.1',
    quantityStep: '0.1',
    commissionPerLot: '0.00',
    status: 'open_calibration',
  },
];

const EVALUATION_20: CalibrationProfile = {
  profileCode: 'ONE_FLEX_EVALUATION_20',
  productFamily: 'WARIBA_ONE',
  accountPhase: 'evaluation',
  candidateMarginCapRate: '0.20',
  leverageByAssetGroup: { FX: 50, METALS: 20, INDICES: 20, ENERGY: 10 },
  dailyLossRate: '0.03',
  maximumLossRate: '0.08',
};

const PERFORMANCE_15: CalibrationProfile = {
  profileCode: 'ONE_FLEX_PERFORMANCE_15',
  productFamily: 'WARIBA_ONE',
  accountPhase: 'performance',
  candidateMarginCapRate: '0.15',
  leverageByAssetGroup: { FX: 30, METALS: 15, INDICES: 10, ENERGY: 10 },
  dailyLossRate: '0.03',
  maximumLossRate: '0.08',
};

const INSTANT_10: CalibrationProfile = {
  profileCode: 'INSTANT_PERFORMANCE_10',
  productFamily: 'WARIBA_INSTANT',
  accountPhase: 'performance',
  candidateMarginCapRate: '0.10',
  leverageByAssetGroup: { FX: 30, METALS: 10, INDICES: 10, ENERGY: 5 },
  dailyLossRate: '0.02',
  maximumLossRate: '0.05',
};

const NOMINALS = ['5000.00', '10000.00', '25000.00', '50000.00', '100000.00'] as const;
const PROFILES = [EVALUATION_20, PERFORMANCE_15, INSTANT_10] as const;

function instrument(symbol: string): InstrumentCalibrationSpec {
  const found = INSTRUMENTS.find((candidate) => candidate.symbol === symbol);
  if (!found) throw new Error(`Unknown reference instrument ${symbol}.`);
  return found;
}

describe('margin calibration model', () => {
  it('reproduces the hand-computed 5K Evaluation EURUSD cell', () => {
    const cell = calibrateCell({
      nominalBalance: '5000.00',
      profile: EVALUATION_20,
      instrument: instrument('EURUSD'),
    });
    // 100 000 x 1.08450 / 50 = 2 169.00 margin per lot; cap 20% of 5 000 = 1 000.
    expect(cell.marginPerLot).toBe('2169.00');
    expect(cell.marginCapAmount).toBe('1000.00');
    expect(cell.maxTotalQuantity).toBe('0.46');
    expect(cell.feasibility).toBe('workable');
  });

  it('floors the maximum quantity to the instrument step rather than rounding up', () => {
    const cell = calibrateCell({
      nominalBalance: '5000.00',
      profile: EVALUATION_20,
      instrument: instrument('NAS100'),
    });
    // 18 000 / 20 = 900 per lot; 1 000 / 900 = 1.111... -> floored to the 0.1 step.
    expect(cell.maxTotalQuantity).toBe('1.1');
  });

  it('never invents a notional for an instrument with no versioned price', () => {
    const cell = calibrateCell({
      nominalBalance: '100000.00',
      profile: EVALUATION_20,
      instrument: instrument('US30'),
    });
    expect(cell.feasibility).toBe('open_calibration');
    expect(cell.marginPerLot).toBeNull();
    expect(cell.maxTotalQuantity).toBeNull();
    expect(cell.leverage).toBeNull();
  });

  it('flags the 5K INSTANT metal/index cells the V1 document called out', () => {
    const gold = calibrateCell({
      nominalBalance: '5000.00',
      profile: INSTANT_10,
      instrument: instrument('XAUUSD'),
    });
    const nasdaq = calibrateCell({
      nominalBalance: '5000.00',
      profile: INSTANT_10,
      instrument: instrument('NAS100'),
    });
    expect(gold.maxSimultaneousMinimumPositions).toBe(2);
    expect(gold.feasibility).toBe('minimum_only');
    expect(nasdaq.maxSimultaneousMinimumPositions).toBe(2);
    expect(nasdaq.feasibility).toBe('minimum_only');
  });

  it('leaves no priced cell mechanically infeasible under 20/15/10', () => {
    const summary = calibrateMatrix({
      nominalBalances: NOMINALS,
      profiles: PROFILES,
      instruments: INSTRUMENTS,
    });
    expect(summary.infeasibleCells).toHaveLength(0);
    expect(summary.mechanicallyUsable).toBe(true);
    expect(summary.openCalibrationSymbols).toEqual(['US30']);
    // The unpriced instrument alone keeps the verdict with the owner.
    expect(summary.ownerDecisionRequired).toBe(true);
  });

  it('confines every constrained cell to the 5K tier', () => {
    const summary = calibrateMatrix({
      nominalBalances: NOMINALS,
      profiles: PROFILES,
      instruments: INSTRUMENTS,
    });
    const constrainedSizes = new Set(summary.minimumOnlyCells.map((cell) => cell.nominalBalance));
    expect([...constrainedSizes]).toEqual(['5000.00']);
  });

  it('shows the candidate cap alone does not bound a day inside the daily budget', () => {
    // A 1% adverse move at the cap already exceeds the 3% daily budget, which
    // is why §51 cannot conclude from margin alone.
    const cell = calibrateCell({
      nominalBalance: '100000.00',
      profile: EVALUATION_20,
      instrument: instrument('EURUSD'),
    });
    expect(Number(cell.dailyBudgetCoverageAtCap)).toBeGreaterThan(1);
  });

  it('tightens usable notional as the cap drops across the three profiles', () => {
    const usable = PROFILES.map((profile) =>
      Number(
        calibrateCell({ nominalBalance: '25000.00', profile, instrument: instrument('EURUSD') })
          .usableNotionalRate,
      ),
    );
    expect(usable[0]).toBeGreaterThan(usable[1] as number);
    expect(usable[1]).toBeGreaterThan(usable[2] as number);
  });
});

describe('gross notional bound the margin cap cannot provide', () => {
  it('derives 3x nominal for a 3% daily budget surviving a 1% adverse move', () => {
    expect(deriveGrossNotionalCapRate({ dailyLossRate: '0.03', adverseMoveRate: '0.01' })).toBe(
      '3.00',
    );
  });

  it('derives 2x nominal for the tighter INSTANT daily budget', () => {
    expect(deriveGrossNotionalCapRate({ dailyLossRate: '0.02', adverseMoveRate: '0.01' })).toBe(
      '2.00',
    );
  });

  it('is well below what the candidate margin cap alone permits on FX', () => {
    const cell = calibrateCell({
      nominalBalance: '50000.00',
      profile: EVALUATION_20,
      instrument: instrument('EURUSD'),
    });
    const bound = deriveGrossNotionalCapRate({ dailyLossRate: '0.03', adverseMoveRate: '0.01' });
    expect(Number(cell.usableNotionalRate)).toBeGreaterThan(Number(bound));
  });

  it('rejects a non-positive adverse move rather than dividing by zero', () => {
    expect(() =>
      deriveGrossNotionalCapRate({ dailyLossRate: '0.03', adverseMoveRate: '0' }),
    ).toThrow(/positive/);
  });
});
