import Decimal from 'decimal.js';
import type { V2AssetGroup } from './margin-exposure';

/**
 * Phase 3.4.3 §48-52 — the margin/exposure calibration model, executable.
 *
 * docs/03-finance/WARIBA_MARGIN_EXPOSURE_CALIBRATION_V1.md worked the
 * candidate 20/15/10 caps out by hand and returned `OPEN_CALIBRATION`. Hand
 * arithmetic cannot be re-run against a changed symbol spec, so this module
 * derives the same matrix from the specs and leverage profiles themselves
 * and attaches a mechanical feasibility verdict to every cell.
 *
 * What it deliberately does NOT do is decide the cap. It answers "is this
 * candidate cap mechanically usable at this size, on this instrument, under
 * these specs" — a necessary condition. Sufficiency needs stop-distance,
 * gap and cohort data the repository does not have, so the summary always
 * reports `ownerDecisionRequired` alongside its recommendation.
 */

export type InstrumentSpecStatus = 'reference_only' | 'open_calibration';

export interface InstrumentCalibrationSpec {
  symbol: string;
  assetGroup: V2AssetGroup;
  /** Units of the base instrument per 1.00 lot. */
  contractSize: string;
  /** Quote used for the notional. `null` when no versioned reference exists (US30, energies). */
  referencePrice: string | null;
  minimumQuantity: string;
  quantityStep: string;
  commissionPerLot: string;
  status: InstrumentSpecStatus;
}

export interface CalibrationProfile {
  profileCode: string;
  productFamily: 'WARIBA_ONE' | 'WARIBA_FLEX' | 'WARIBA_INSTANT';
  accountPhase: 'evaluation' | 'performance';
  candidateMarginCapRate: string;
  leverageByAssetGroup: Readonly<Record<V2AssetGroup, number>>;
  dailyLossRate: string;
  maximumLossRate: string;
}

/** Mechanical usability of one (size × profile × instrument) cell. */
export type CalibrationFeasibility =
  'workable' | 'minimum_only' | 'infeasible' | 'open_calibration';

export interface CalibrationCell {
  nominalBalance: string;
  profileCode: string;
  symbol: string;
  assetGroup: V2AssetGroup;
  leverage: number | null;
  marginCapAmount: string;
  /** Margin consumed by exactly one lot. */
  marginPerLot: string | null;
  /** Margin consumed by the instrument's smallest tradable size. */
  marginPerMinimumQuantity: string | null;
  /** Largest total quantity the cap allows, floored to the instrument's step. */
  maxTotalQuantity: string | null;
  /** Notional reachable at the cap, as a multiple of the nominal balance. */
  usableNotionalRate: string | null;
  /** How many minimum-size positions fit simultaneously under the cap. */
  maxSimultaneousMinimumPositions: number | null;
  /** nominal * 0.005 — the per-position sensitivity budget, not an adopted stop rule. */
  riskBudgetHalfPercent: string;
  /** Loss at maxTotalQuantity if the price moves 1% against the trader, costs included. */
  lossAtCapForOnePercentMove: string | null;
  /** That loss as a fraction of the daily-loss budget: >1 means the cap alone permits a same-day soft lock. */
  dailyBudgetCoverageAtCap: string | null;
  feasibility: CalibrationFeasibility;
}

export interface CalibrationSummary {
  cells: readonly CalibrationCell[];
  infeasibleCells: readonly CalibrationCell[];
  minimumOnlyCells: readonly CalibrationCell[];
  openCalibrationSymbols: readonly string[];
  /** True only when every priced cell is at least `minimum_only`. */
  mechanicallyUsable: boolean;
  /** Always true while any instrument is unpriced or stop/gap data is absent. */
  ownerDecisionRequired: boolean;
}

function floorToStep(value: Decimal, step: string): Decimal {
  const stepDecimal = new Decimal(step);
  if (stepDecimal.lessThanOrEqualTo(0)) throw new Error('Quantity step must be positive.');
  return value.dividedBy(stepDecimal).floor().times(stepDecimal);
}

/** How many decimals a quantity step carries — so a floored quantity prints at the instrument's own precision. */
function stepPrecision(step: string): number {
  const fraction = step.split('.')[1];
  return fraction ? fraction.replace(/0+$/, '').length : 0;
}

/**
 * The number of simultaneous minimum-size positions the cap permits. Three
 * is the practicability probe the calibration document already used: a cap
 * that cannot carry three minimum positions is a real usage constraint,
 * not a theoretical one.
 */
export const SIMULTANEOUS_POSITION_PROBE = 3;

export function calibrateCell(params: {
  nominalBalance: string;
  profile: CalibrationProfile;
  instrument: InstrumentCalibrationSpec;
  /** Adverse move used for the sensitivity column. Defaults to 1% of the reference price. */
  adverseMoveRate?: string;
}): CalibrationCell {
  const { nominalBalance, profile, instrument } = params;
  const leverage = profile.leverageByAssetGroup[instrument.assetGroup];
  const marginCapAmount = new Decimal(nominalBalance).times(profile.candidateMarginCapRate);
  const riskBudgetHalfPercent = new Decimal(nominalBalance).times('0.005').toFixed(2);

  const base: Omit<
    CalibrationCell,
    | 'marginPerLot'
    | 'marginPerMinimumQuantity'
    | 'maxTotalQuantity'
    | 'usableNotionalRate'
    | 'maxSimultaneousMinimumPositions'
    | 'lossAtCapForOnePercentMove'
    | 'dailyBudgetCoverageAtCap'
    | 'feasibility'
  > = {
    nominalBalance,
    profileCode: profile.profileCode,
    symbol: instrument.symbol,
    assetGroup: instrument.assetGroup,
    leverage: instrument.referencePrice === null ? null : leverage,
    marginCapAmount: marginCapAmount.toFixed(2),
    riskBudgetHalfPercent,
  };

  if (instrument.referencePrice === null || instrument.status === 'open_calibration') {
    // No versioned price means no notional, and a fabricated one would turn
    // an unknown into a number someone could publish. Fail open-calibration.
    return {
      ...base,
      marginPerLot: null,
      marginPerMinimumQuantity: null,
      maxTotalQuantity: null,
      usableNotionalRate: null,
      maxSimultaneousMinimumPositions: null,
      lossAtCapForOnePercentMove: null,
      dailyBudgetCoverageAtCap: null,
      feasibility: 'open_calibration',
    };
  }

  if (!Number.isSafeInteger(leverage) || leverage <= 0) {
    throw new Error(`Invalid leverage for ${instrument.assetGroup} in ${profile.profileCode}.`);
  }

  const notionalPerLot = new Decimal(instrument.contractSize).times(instrument.referencePrice);
  const marginPerLot = notionalPerLot.dividedBy(leverage);
  const marginPerMinimumQuantity = marginPerLot.times(instrument.minimumQuantity);
  const rawMaxQuantity = marginCapAmount.dividedBy(marginPerLot);
  const maxTotalQuantity = floorToStep(rawMaxQuantity, instrument.quantityStep);
  const precision = stepPrecision(instrument.quantityStep);

  const usableNotionalRate = maxTotalQuantity
    .times(notionalPerLot)
    .dividedBy(nominalBalance)
    .toFixed(4);
  const maxSimultaneousMinimumPositions = maxTotalQuantity
    .dividedBy(instrument.minimumQuantity)
    .floor()
    .toNumber();

  const adverseMoveRate = params.adverseMoveRate ?? '0.01';
  const adverseMove = new Decimal(instrument.referencePrice).times(adverseMoveRate);
  const lossAtCapForOnePercentMove = maxTotalQuantity
    .times(instrument.contractSize)
    .times(adverseMove)
    .plus(maxTotalQuantity.times(instrument.commissionPerLot))
    .toFixed(2);
  const dailyBudget = new Decimal(nominalBalance).times(profile.dailyLossRate);
  const dailyBudgetCoverageAtCap = dailyBudget.isZero()
    ? null
    : new Decimal(lossAtCapForOnePercentMove).dividedBy(dailyBudget).toFixed(4);

  const feasibility: CalibrationFeasibility = maxTotalQuantity.lessThan(instrument.minimumQuantity)
    ? 'infeasible'
    : maxSimultaneousMinimumPositions < SIMULTANEOUS_POSITION_PROBE
      ? 'minimum_only'
      : 'workable';

  return {
    ...base,
    marginPerLot: marginPerLot.toFixed(2),
    marginPerMinimumQuantity: marginPerMinimumQuantity.toFixed(2),
    maxTotalQuantity: maxTotalQuantity.toFixed(precision),
    usableNotionalRate,
    maxSimultaneousMinimumPositions,
    lossAtCapForOnePercentMove,
    dailyBudgetCoverageAtCap,
    feasibility,
  };
}

export function calibrateMatrix(params: {
  nominalBalances: readonly string[];
  profiles: readonly CalibrationProfile[];
  instruments: readonly InstrumentCalibrationSpec[];
}): CalibrationSummary {
  const cells = params.nominalBalances.flatMap((nominalBalance) =>
    params.profiles.flatMap((profile) =>
      params.instruments.map((instrument) =>
        calibrateCell({ nominalBalance, profile, instrument }),
      ),
    ),
  );

  const infeasibleCells = cells.filter((cell) => cell.feasibility === 'infeasible');
  const minimumOnlyCells = cells.filter((cell) => cell.feasibility === 'minimum_only');
  const openCalibrationSymbols = [
    ...new Set(
      cells.filter((cell) => cell.feasibility === 'open_calibration').map((cell) => cell.symbol),
    ),
  ];

  return {
    cells,
    infeasibleCells,
    minimumOnlyCells,
    openCalibrationSymbols,
    mechanicallyUsable: infeasibleCells.length === 0,
    // Stop distance, gap cost and cohort behaviour are outside this model by
    // construction; an unpriced instrument is a second, independent reason.
    ownerDecisionRequired: true,
  };
}

/**
 * Phase 3.4.3 §51 — the bound a margin cap cannot provide.
 *
 * A margin cap limits how much *collateral* a position consumes, not how
 * much a price move costs. At the candidate 20% Evaluation cap on FX, the
 * seeded 1:50 leverage lets gross notional reach ~10x nominal, so a 1%
 * adverse move costs ~3.3x the whole 3% daily budget. Whatever the cap,
 * keeping a `adverseMoveRate` move inside the daily budget is a bound on
 * notional, not on margin:
 *
 *   notional x adverseMoveRate <= nominal x dailyLossRate
 *   => notional / nominal <= dailyLossRate / adverseMoveRate
 *
 * Returned as a recommendation only. Adopting it means publishing a new
 * policy version (Canonical Policy Contract V2 §8 — a published policy is
 * immutable), never editing the seeded V2 rows in place.
 */
export function deriveGrossNotionalCapRate(params: {
  dailyLossRate: string;
  /** The adverse move the bound is meant to survive. */
  adverseMoveRate: string;
}): string {
  const adverseMoveRate = new Decimal(params.adverseMoveRate);
  if (adverseMoveRate.lessThanOrEqualTo(0)) {
    throw new Error('Adverse move rate must be positive.');
  }
  return new Decimal(params.dailyLossRate).dividedBy(adverseMoveRate).toFixed(2);
}
