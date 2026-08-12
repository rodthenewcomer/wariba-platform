'use client';

import { Input } from '@wariba/ui';
import { isPendingOrderCreationPriceValid } from '@wariba/domain';
import type { MarketTick, SymbolSpec } from '@wariba/contracts';
import { pendingOrderTypeFor, type ExecutionSide } from './execution-contract';

export interface TriggerPriceControlProps {
  /** Never rendered for 'market' — the caller decides; this narrows the type. */
  orderKind: 'limit' | 'stop';
  spec: SymbolSpec | undefined;
  tick: MarketTick | null;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

/**
 * Which sides this trigger price is currently creatable for.
 *
 * Delegates to `isPendingOrderCreationPriceValid` (@wariba/domain) — the exact
 * function `createPendingOrder` re-runs server-side under lock. W4 §20 is
 * explicit that a side-specific hint is allowed *only* when it comes from that
 * canonical rule, precisely so a third slightly-different bid/ask comparison
 * cannot drift between the Execution Center, the chart context menu and the
 * server. Returns null when there is nothing to compare against, in which case
 * the caller offers both sides and lets the server answer.
 */
export function creatableSidesFor(params: {
  orderKind: 'limit' | 'stop';
  triggerPrice: string;
  tick: MarketTick | null;
  hasError: boolean;
}): Record<ExecutionSide, boolean> | null {
  const { orderKind, triggerPrice, tick, hasError } = params;
  if (hasError || !tick || triggerPrice.trim() === '') return null;
  if (tick.marketStatus !== 'open') return null;
  const check = (side: ExecutionSide): boolean =>
    isPendingOrderCreationPriceValid({
      orderType: pendingOrderTypeFor(orderKind, side),
      triggerPrice: triggerPrice.trim(),
      currentBid: tick.bid,
      currentAsk: tick.ask,
    });
  return { buy: check('buy'), sell: check('sell') };
}

const RELATIONSHIP_HINT: Record<'limit' | 'stop', string> = {
  limit: 'Buy Limit sous l’Ask · Sell Limit au-dessus du Bid.',
  stop: 'Buy Stop au-dessus de l’Ask · Sell Stop sous le Bid. Aucune garantie de prix : un écart de marché peut exécuter au-delà du seuil.',
};

/**
 * W4 §18/§19 — the pending-order trigger level.
 *
 * The copy states the creation-side rule and, for stops, states plainly that
 * the stop price is not a guaranteed fill: the server fills at the first valid
 * quote after the trigger and a gap is explicitly allowed
 * (`clampPendingOrderFillPrice` clamps limit fills and deliberately exempts
 * stops). Nothing here re-implements the pending-order engine; the field is a
 * price input and the sides it is currently valid for come from the canonical
 * helper above.
 */
export function TriggerPriceControl({
  orderKind,
  spec,
  tick,
  value,
  onChange,
  error,
}: TriggerPriceControlProps) {
  const sides = creatableSidesFor({
    orderKind,
    triggerPrice: value,
    tick,
    hasError: Boolean(error),
  });
  const neitherSide = sides !== null && !sides.buy && !sides.sell;

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        label="Prix de déclenchement"
        hideLabel
        type="text"
        inputMode="decimal"
        name="triggerPrice"
        data-testid="trigger-price-input"
        className="wariba-data"
        placeholder={spec ? `0.${'0'.repeat(Math.max(0, spec.pricePrecision - 1))}0` : 'Prix'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...(error ? { errorText: error } : {})}
      />
      <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-tertiary)]">
        {spec ? `Précision : ${spec.pricePrecision} décimales. ` : ''}
        {RELATIONSHIP_HINT[orderKind]}
      </p>
      {neitherSide ? (
        <p
          role="status"
          data-testid="trigger-price-no-side"
          className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-status-warning-text)]"
        >
          Ce seuil n’est valide ni à l’achat ni à la vente par rapport au marché actuel.
        </p>
      ) : null}
    </div>
  );
}
