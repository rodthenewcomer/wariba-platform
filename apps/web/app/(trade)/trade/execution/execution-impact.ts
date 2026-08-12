import {
  computeLevelPnlPreview,
  computeRiskRewardRatio,
  estimateRequiredMargin,
  quotedPrice,
} from '@wariba/domain';
import type { AccountRisk, MarketTick, SymbolSpec } from '@wariba/contracts';
import { CONCENTRATION_BUCKET_LABEL } from '../trade-labels';
import { protectionPriceErrorFor, triggerPriceErrorFor, type TicketDraft } from '../ticket-draft';
import type { ExecutionSide, TicketOrderKind } from './execution-contract';

/**
 * W4 §8/§9/§30/§32/§33/§34 — every number the Trade Impact and Protection
 * sections display, derived in one place from canonical helpers only.
 *
 * The truth rule this module implements: a metric appears only when a
 * canonical, instrument-correct helper already exists for it, and it is
 * computed by calling that helper — never by an approximation written here to
 * fill a slot. Concretely:
 *
 * - **Estimated margin** — `estimateRequiredMargin` (@wariba/domain), the same
 *   function Guardian called before W4, at the same mid price, so the figure
 *   is unchanged by the redesign.
 * - **DLL / maximum-loss remaining** — read verbatim from the server's risk
 *   snapshot. Never recomputed from balance or equity (§33).
 * - **Concentration** — the server's own used/limit/ratio per bucket (§35).
 * - **Potential SL loss / TP gain** — `computeLevelPnlPreview`, the helper the
 *   chart's SL/TP drag preview already uses, which itself calls the server's
 *   `computeRealizedPnl`. It is instrument-correct because it takes the
 *   symbol's own `contractSize`, so no per-asset-class special case is
 *   invented here (§34).
 * - **R:R** — `computeRiskRewardRatio`, a pure price-distance ratio (§29), not
 *   a promise of realized P&L.
 *
 * **Why the protection preview is per side.** Both the entry reference price
 * and therefore both figures depend on which side is submitted — a buy opens
 * at the ask, a sell at the bid (`quotedPrice`, the server's own rule). One
 * ticket can be submitted either way, so a single unlabelled number would be
 * ambiguous exactly where money is involved. The panel renders a Vente column
 * and an Achat column instead (§29 option A).
 *
 * Everything here is an *estimate* and is labelled as one: the executed fill
 * price includes deterministic adverse slippage the browser does not model,
 * and a stop order may gap past its trigger entirely.
 */

export interface ConcentrationBucketView {
  bucket: string;
  label: string;
  usedFormatted: string;
  limitFormatted: string;
  usedRatioPercent: number;
}

export interface TradeImpactView {
  quantityFormatted: string;
  marginEstimatedFormatted: string;
  dailyLossRemainingFormatted: string;
  maximumLossRemainingFormatted: string;
  concentration: ConcentrationBucketView[];
  isPriceStale: boolean;
}

export interface SideProtectionPreview {
  side: ExecutionSide;
  /** The price this side is expected to open at — ask for a buy, bid for a sell, or the trigger for a pending order. */
  referencePriceFormatted: string;
  stopLossPnlFormatted: string | null;
  takeProfitPnlFormatted: string | null;
  riskRewardFormatted: string | null;
}

export interface ProtectionPreviewView {
  /** Null when no protection level is set, or when no reference price exists yet. */
  sides: SideProtectionPreview[] | null;
  /** True for Stop entries, where the fill may gap past the trigger. */
  triggerMayGap: boolean;
}

export interface ExecutionImpactInput {
  spec: SymbolSpec | undefined;
  tick: MarketTick | null;
  risk: AccountRisk | null;
  equity: string | null;
  draft: TicketDraft;
}

/**
 * Guardian's data, unchanged. Null until a symbol spec, a live tick and a
 * priced account all exist — no fabricated numbers before then, exactly as the
 * pre-W4 panel behaved.
 */
export function deriveTradeImpact(input: ExecutionImpactInput): TradeImpactView | null {
  const { spec, tick, risk, draft } = input;
  if (!spec || !tick || !risk) return null;

  const midPrice = ((Number(tick.bid) + Number(tick.ask)) / 2).toFixed(spec.pricePrecision);
  const marginEstimated = estimateRequiredMargin({
    quantity: draft.quantity,
    price: midPrice,
    contractSize: spec.contractSize,
    leverage: spec.leverage,
  });

  return {
    quantityFormatted: draft.quantity,
    marginEstimatedFormatted: `${marginEstimated} USD`,
    dailyLossRemainingFormatted: `${risk.dailyLoss.remaining} USD`,
    maximumLossRemainingFormatted: `${risk.maximumLoss.remaining} USD`,
    concentration: risk.concentration.map((bucket) => ({
      bucket: bucket.bucket,
      label: CONCENTRATION_BUCKET_LABEL[bucket.bucket] ?? bucket.bucket,
      usedFormatted: bucket.usedQuantity,
      limitFormatted: bucket.limitQuantity,
      usedRatioPercent: Number(bucket.usedRatio) * 100,
    })),
    isPriceStale: tick.marketStatus === 'stale',
  };
}

/** A clean decimal literal, or null — the guard that keeps a half-typed price out of Decimal. */
function usablePrice(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '' || protectionPriceErrorFor(trimmed) !== null) return null;
  return trimmed;
}

/**
 * The price a given side is expected to enter at.
 *
 * Market: the side's own executable quote (`quotedPrice` — the server's rule,
 * not a re-implementation). Limit/Stop: the trigger price, because that is the
 * level the order is intended to fill at; a stop may gap past it, which is why
 * the caller flags that case rather than implying a guarantee (§19).
 */
function referencePriceFor(params: {
  orderKind: TicketOrderKind;
  side: ExecutionSide;
  triggerPrice: string;
  tick: MarketTick;
}): string | null {
  if (params.orderKind === 'market') {
    return quotedPrice({
      bid: params.tick.bid,
      ask: params.tick.ask,
      positionSide: params.side,
      action: 'open',
    });
  }
  if (triggerPriceErrorFor(params.orderKind, params.triggerPrice) !== null) return null;
  return params.triggerPrice.trim();
}

export function deriveProtectionPreview(input: ExecutionImpactInput): ProtectionPreviewView {
  const { spec, tick, draft, equity } = input;
  const triggerMayGap = draft.orderKind === 'stop';
  const stopLoss = usablePrice(draft.stopLoss);
  const takeProfit = usablePrice(draft.takeProfit);
  if (!spec || !tick || equity === null || (!stopLoss && !takeProfit)) {
    return { sides: null, triggerMayGap };
  }
  // A malformed quantity would throw inside the Decimal-based helpers, and an
  // invalid one has no meaningful impact to preview.
  const quantity = usablePrice(draft.quantity);
  if (!quantity) return { sides: null, triggerMayGap };

  const sides: SideProtectionPreview[] = [];
  for (const side of ['sell', 'buy'] as const) {
    const referencePrice = referencePriceFor({
      orderKind: draft.orderKind,
      side,
      triggerPrice: draft.triggerPrice,
      tick,
    });
    if (!referencePrice) continue;

    const level = (levelPrice: string): string =>
      computeLevelPnlPreview({
        levelPrice,
        referencePrice,
        positionSide: side,
        quantity,
        contractSize: spec.contractSize,
        pricePrecision: spec.pricePrecision,
        accountEquity: equity,
      }).estimatedPnl;

    sides.push({
      side,
      referencePriceFormatted: referencePrice,
      stopLossPnlFormatted: stopLoss ? `${level(stopLoss)} USD` : null,
      takeProfitPnlFormatted: takeProfit ? `${level(takeProfit)} USD` : null,
      riskRewardFormatted: computeRiskRewardRatio({
        stopLossPrice: stopLoss,
        takeProfitPrice: takeProfit,
        referencePrice,
      }),
    });
  }

  return { sides: sides.length > 0 ? sides : null, triggerMayGap };
}
