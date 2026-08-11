'use client';

import type { MarketTick, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { MARKET_STATUS_LABEL, MARKET_STATUS_SHORT_LABEL } from './execution-gating';

export interface ExecutionMarketHeaderProps {
  symbol: TradableSymbol;
  spec: SymbolSpec | undefined;
  tick: MarketTick | null;
  accountPublicId: string;
}

const DASH = '—';

const STATUS_DOT: Record<'open' | 'stale' | 'closed', string> = {
  open: 'bg-[color:var(--wariba-status-success-strong)]',
  stale: 'bg-[color:var(--wariba-status-warning-strong)]',
  closed: 'bg-[color:var(--wariba-text-tertiary)]',
};

/**
 * W4 §13/§14/§15/§57 — the instrument, its state, and the two prices the two
 * side actions reference.
 *
 * Bid sits on the left under the Sell action and Ask on the right under Buy,
 * matching the button order below, because that is the pairing the trader
 * needs to read in one glance — a sell opens at the bid, a buy at the ask
 * (`quotedPrice`, the server's own rule). The quotes are indicative: the fill
 * price is whatever the server computes at execution time, including adverse
 * slippage this display does not model.
 *
 * There is no daily change, no session high/low and no percentage: W3's
 * history has no approved reference semantics for such a figure, and W4 §13 is
 * explicit that this milestone adds no market statistics.
 *
 * The state chip carries its meaning as text, never as colour alone (§63), and
 * a stale or closed quote is marked right next to the numbers rather than
 * hidden behind a tooltip (§57).
 */
export function ExecutionMarketHeader({
  symbol,
  spec,
  tick,
  accountPublicId,
}: ExecutionMarketHeaderProps) {
  const status = tick?.marketStatus ?? null;
  const spread =
    tick && spec ? (Number(tick.ask) - Number(tick.bid)).toFixed(spec.pricePrecision) : null;
  const quotesAreLive = status === 'open';

  return (
    <header className="flex flex-col gap-2 px-3 pb-2.5 pt-1" data-testid="execution-market-header">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
            {symbol}
          </span>
          <span
            className="wariba-data text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-tertiary)]"
            title="Compte"
          >
            {accountPublicId}
          </span>
        </div>
        <span
          className="flex items-center gap-1.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]"
          data-testid="execution-market-status"
          data-market-status={status ?? 'unavailable'}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              status ? STATUS_DOT[status] : 'bg-[color:var(--wariba-text-tertiary)]'
            }`}
          />
          {status ? MARKET_STATUS_SHORT_LABEL[status] : 'Indisponible'}
          {/* The dot is decoration; this is the state a screen reader hears. */}
          <span className="sr-only">
            {status ? MARKET_STATUS_LABEL[status] : 'Cotation indisponible'}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div className="flex flex-col">
          <span className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-wide text-[color:var(--wariba-text-tertiary)]">
            Vente · Bid
          </span>
          <span
            data-testid="execution-bid"
            className={`wariba-data text-[length:var(--wariba-font-size-data-md)] font-semibold tabular-nums ${
              quotesAreLive
                ? 'text-[color:var(--wariba-text-primary)]'
                : 'text-[color:var(--wariba-text-tertiary)]'
            }`}
          >
            {tick?.bid ?? DASH}
          </span>
        </div>

        <div className="flex flex-col items-center pb-0.5">
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Spread
          </span>
          <span className="wariba-data text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-secondary)]">
            {spread ?? DASH}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-wide text-[color:var(--wariba-text-tertiary)]">
            Achat · Ask
          </span>
          <span
            data-testid="execution-ask"
            className={`wariba-data text-[length:var(--wariba-font-size-data-md)] font-semibold tabular-nums ${
              quotesAreLive
                ? 'text-[color:var(--wariba-text-primary)]'
                : 'text-[color:var(--wariba-text-tertiary)]'
            }`}
          >
            {tick?.ask ?? DASH}
          </span>
        </div>
      </div>

      {tick && !quotesAreLive ? (
        <p className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-status-warning-text)]">
          {status === 'stale'
            ? 'Dernier prix connu — le flux n’est plus à jour.'
            : 'Dernier prix connu — marché fermé.'}
        </p>
      ) : null}
    </header>
  );
}
