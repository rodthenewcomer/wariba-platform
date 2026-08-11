import { describe, expect, it } from 'vitest';
import {
  computeLevelPnlPreview,
  computeRiskRewardRatio,
  estimateRequiredMargin,
  quotedPrice,
} from '@wariba/domain';
import type { AccountRisk, MarketTick, SymbolSpec } from '@wariba/contracts';
import {
  deriveProtectionPreview,
  deriveTradeImpact,
  type ExecutionImpactInput,
} from '../app/(trade)/trade/execution/execution-impact';
import type { TicketDraft } from '../app/(trade)/trade/ticket-draft';

/**
 * W4 §5/§30/§32/§33/§34 — the Execution Center displays no number it invented.
 *
 * This suite is written against the *canonical helpers directly*: each
 * expectation calls `estimateRequiredMargin` / `computeLevelPnlPreview` /
 * `computeRiskRewardRatio` / `quotedPrice` itself and asserts the panel's
 * derivation agrees. That is deliberately not a hard-coded literal — a literal
 * would silently keep passing if someone reimplemented the formula locally with
 * an equal-looking approximation, which is precisely the drift W4 §5 forbids.
 * Written this way, a second implementation can only pass by being identical to
 * the shared one, at which point it is not a second implementation.
 *
 * The other half of the suite is about *not* showing a number: an unpriced
 * account, a missing spec, a missing quote or a half-typed field must produce
 * an absent figure, never a plausible-looking placeholder.
 */

const SPEC: SymbolSpec = {
  symbol: 'EURUSD',
  assetClass: 'forex_major',
  pricePrecision: 5,
  contractSize: '100000',
  leverage: 30,
  minimumQuantity: '0.01',
  maximumQuantity: '10',
  quantityStep: '0.01',
  commissionPerLot: '0.00',
} as SymbolSpec;

const TICK: MarketTick = {
  symbol: 'EURUSD',
  bid: '1.08500',
  ask: '1.08510',
  timestamp: '2026-01-01T00:00:00.000Z',
  marketStatus: 'open',
} as MarketTick;

const RISK: AccountRisk = {
  status: 'active',
  programEligibleBalance: '10000.00',
  programEligibleEquity: '10000.00',
  target: { required: '1000.00', current: '0.00', reached: false },
  dailyLoss: {
    reference: '10000.00',
    floor: '9500.00',
    used: '120.00',
    remaining: '380.00',
    softLockTriggered: false,
  },
  maximumLoss: { floor: '9000.00', remaining: '880.00', breached: false },
  bestDay: { ratio: null, compliant: true },
  eligibility: { passEligible: true, blockingReasons: [] },
  concentration: [
    { bucket: 'forex', usedQuantity: '0.30', limitQuantity: '0.60', usedRatio: '0.5' },
  ],
  shortDurationMonitoring: { status: 'normal', count24h: 0 },
} as AccountRisk;

const DRAFT: TicketDraft = {
  quantity: '0.10',
  stopLoss: '',
  takeProfit: '',
  orderKind: 'market',
  triggerPrice: '',
};

const EQUITY = '10000.00';

function input(overrides: Partial<ExecutionImpactInput> = {}): ExecutionImpactInput {
  return { spec: SPEC, tick: TICK, risk: RISK, equity: EQUITY, draft: DRAFT, ...overrides };
}

function draft(overrides: Partial<TicketDraft>): TicketDraft {
  return { ...DRAFT, ...overrides };
}

describe('deriveTradeImpact', () => {
  it('estimates margin with the canonical helper, at the mid price', () => {
    const impact = deriveTradeImpact(input());
    const midPrice = ((Number(TICK.bid) + Number(TICK.ask)) / 2).toFixed(SPEC.pricePrecision);
    const expected = estimateRequiredMargin({
      quantity: DRAFT.quantity,
      price: midPrice,
      contractSize: SPEC.contractSize,
      leverage: SPEC.leverage,
    });
    expect(impact?.marginEstimatedFormatted).toBe(`${expected} USD`);
  });

  it('reads the two loss budgets verbatim from the server’s snapshot', () => {
    const impact = deriveTradeImpact(input());
    expect(impact?.dailyLossRemainingFormatted).toBe(`${RISK.dailyLoss.remaining} USD`);
    expect(impact?.maximumLossRemainingFormatted).toBe(`${RISK.maximumLoss.remaining} USD`);
  });

  it('passes concentration through with the server’s own used, limit and ratio', () => {
    const impact = deriveTradeImpact(input());
    expect(impact?.concentration).toHaveLength(1);
    const bucket = impact?.concentration[0];
    expect(bucket?.usedFormatted).toBe('0.30');
    expect(bucket?.limitFormatted).toBe('0.60');
    expect(bucket?.usedRatioPercent).toBe(50);
    // A recognised bucket gets its French label, never the raw enum key.
    expect(bucket?.label).not.toBe('forex');
  });

  it('marks the impact as stale rather than hiding it when the quote is stale', () => {
    const impact = deriveTradeImpact(input({ tick: { ...TICK, marketStatus: 'stale' } }));
    expect(impact?.isPriceStale).toBe(true);
  });

  it('returns nothing at all before a spec, a quote or a risk snapshot exists', () => {
    expect(deriveTradeImpact(input({ spec: undefined }))).toBeNull();
    expect(deriveTradeImpact(input({ tick: null }))).toBeNull();
    expect(deriveTradeImpact(input({ risk: null }))).toBeNull();
  });
});

describe('deriveProtectionPreview', () => {
  it('shows nothing while neither protection level is set', () => {
    expect(deriveProtectionPreview(input()).sides).toBeNull();
  });

  it('prices a stop loss per side, from that side’s own entry quote', () => {
    const preview = deriveProtectionPreview(input({ draft: draft({ stopLoss: '1.08000' }) }));
    expect(preview.sides).toHaveLength(2);

    for (const side of preview.sides ?? []) {
      const referencePrice = quotedPrice({
        bid: TICK.bid,
        ask: TICK.ask,
        positionSide: side.side,
        action: 'open',
      });
      expect(side.referencePriceFormatted).toBe(referencePrice);
      expect(side.stopLossPnlFormatted).toBe(
        `${
          computeLevelPnlPreview({
            levelPrice: '1.08000',
            referencePrice,
            positionSide: side.side,
            quantity: DRAFT.quantity,
            contractSize: SPEC.contractSize,
            pricePrecision: SPEC.pricePrecision,
            accountEquity: EQUITY,
          }).estimatedPnl
        } USD`,
      );
      expect(side.takeProfitPnlFormatted).toBeNull();
    }
  });

  it('gives the two sides opposite signs for the same stop price', () => {
    const preview = deriveProtectionPreview(input({ draft: draft({ stopLoss: '1.08000' }) }));
    const sell = preview.sides?.find((side) => side.side === 'sell');
    const buy = preview.sides?.find((side) => side.side === 'buy');
    // A level below the market loses money for a buy and makes money for a
    // sell — which is exactly why a single unlabelled figure would be
    // ambiguous, and why the panel renders one column per side.
    expect(Number.parseFloat(buy?.stopLossPnlFormatted ?? '0')).toBeLessThan(0);
    expect(Number.parseFloat(sell?.stopLossPnlFormatted ?? '0')).toBeGreaterThan(0);
  });

  it('computes R:R with the canonical helper only when both levels are set', () => {
    const slOnly = deriveProtectionPreview(input({ draft: draft({ stopLoss: '1.08000' }) }));
    expect(slOnly.sides?.[0]?.riskRewardFormatted).toBeNull();

    const both = deriveProtectionPreview(
      input({ draft: draft({ stopLoss: '1.08000', takeProfit: '1.09000' }) }),
    );
    for (const side of both.sides ?? []) {
      expect(side.riskRewardFormatted).toBe(
        computeRiskRewardRatio({
          stopLossPrice: '1.08000',
          takeProfitPrice: '1.09000',
          referencePrice: side.referencePriceFormatted,
        }),
      );
    }
  });

  it('uses the trigger level as the entry reference for a pending order', () => {
    const preview = deriveProtectionPreview(
      input({
        draft: draft({ orderKind: 'limit', triggerPrice: '1.07000', stopLoss: '1.06500' }),
      }),
    );
    for (const side of preview.sides ?? []) {
      expect(side.referencePriceFormatted).toBe('1.07000');
    }
  });

  it('flags that a stop entry may gap past its trigger, and only for a stop', () => {
    expect(
      deriveProtectionPreview(input({ draft: draft({ orderKind: 'stop' }) })).triggerMayGap,
    ).toBe(true);
    expect(
      deriveProtectionPreview(input({ draft: draft({ orderKind: 'limit' }) })).triggerMayGap,
    ).toBe(false);
    expect(deriveProtectionPreview(input()).triggerMayGap).toBe(false);
  });

  it('shows no preview at all before the account is priced', () => {
    // `computeLevelPnlPreview` divides by equity for its percent-of-account
    // figure; without a snapshot there is no honest number to show.
    expect(
      deriveProtectionPreview(input({ equity: null, draft: draft({ stopLoss: '1.08000' }) })).sides,
    ).toBeNull();
  });

  it('never throws on a half-typed price or quantity, and shows nothing instead', () => {
    const halfTyped = ['1.', '1.08.5', 'abc', '-1', '', '   '];
    for (const value of halfTyped) {
      expect(() =>
        deriveProtectionPreview(input({ draft: draft({ stopLoss: value }) })),
      ).not.toThrow();
      expect(
        deriveProtectionPreview(input({ draft: draft({ stopLoss: value }) })).sides,
      ).toBeNull();

      // A malformed quantity would throw inside the Decimal-based helpers.
      expect(() =>
        deriveProtectionPreview(input({ draft: draft({ stopLoss: '1.08000', quantity: value }) })),
      ).not.toThrow();
      expect(
        deriveProtectionPreview(input({ draft: draft({ stopLoss: '1.08000', quantity: value }) }))
          .sides,
      ).toBeNull();
    }
  });

  it('shows no preview for a pending order until its trigger price parses', () => {
    expect(
      deriveProtectionPreview(
        input({ draft: draft({ orderKind: 'limit', triggerPrice: '', stopLoss: '1.08000' }) }),
      ).sides,
    ).toBeNull();
    expect(
      deriveProtectionPreview(
        input({ draft: draft({ orderKind: 'limit', triggerPrice: '1.2.3', stopLoss: '1.08000' }) }),
      ).sides,
    ).toBeNull();
  });
});
