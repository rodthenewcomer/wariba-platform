'use client';

import { memo, useId, useMemo, useState, type ReactNode } from 'react';
import { Text, WariXFavoriteIcon, WariXSearchIcon } from '@wariba/ui';
import type { SymbolSpec, TradableSymbol } from '@wariba/contracts';
import {
  groupAvailableSymbols,
  matchesMarketQuery,
  type MarketCategoryGroup,
} from './market-categories';
import { useTick, type TickStore } from './tick-store';

const MARKET_STATUS_LABEL = {
  open: 'Ouvert',
  stale: 'Périmé',
  closed: 'Fermé',
} as const;

interface MarketRowProps {
  store: TickStore;
  symbol: TradableSymbol;
  spec: SymbolSpec | undefined;
  selected: boolean;
  favorite: boolean;
  onSelect: (symbol: TradableSymbol) => void;
  onToggleFavorite: (symbol: TradableSymbol) => void;
}

/**
 * One instrument. Subscribes to exactly this symbol's tick, so a EURUSD tick
 * never reaches the GBPUSD row, a category heading, the navigator shell, the
 * dock, the status bar or the rail (W2 §11).
 *
 * Shows only current-state truth — bid, ask, spread, market status. There is
 * deliberately no daily/24h/session percentage, no previous close, no
 * sparkline and no high/low: WariX has no historical market data until W3, and
 * a change column with no valid reference price would be a fabrication
 * (W2 §7).
 */
const MarketRow = memo(function MarketRow({
  store,
  symbol,
  spec,
  selected,
  favorite,
  onSelect,
  onToggleFavorite,
}: MarketRowProps) {
  const tick = useTick(store, symbol);
  const spread = tick
    ? (Number(tick.ask) - Number(tick.bid)).toFixed(spec?.pricePrecision ?? 5)
    : null;
  const isStale = tick?.marketStatus === 'stale';

  return (
    <div
      className={`relative flex min-h-11 items-stretch rounded-[var(--wariba-radius-sm)] lg:h-9 lg:min-h-9 ${
        selected
          ? 'bg-[color:var(--wariba-component-workstation-surface-control-active)] before:absolute before:bottom-1 before:left-0 before:top-1 before:z-10 before:w-0.5 before:rounded-r before:bg-[color:var(--wariba-component-workstation-interaction-selected)]'
          : 'hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)]'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(symbol)}
        aria-current={selected ? 'true' : undefined}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-l-[var(--wariba-radius-sm)] px-2 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] lg:min-h-9"
      >
        <span className="flex items-center justify-between gap-2">
          <span
            className={`text-[length:var(--wariba-font-size-body-sm)] font-medium ${
              selected
                ? 'font-bold text-[color:var(--wariba-component-workstation-interaction-selected)]'
                : 'text-[color:var(--wariba-component-workstation-text-primary)]'
            }`}
          >
            {symbol}
          </span>
          <span
            className={`text-[length:var(--wariba-font-size-label-sm)] ${
              isStale
                ? 'text-[color:var(--wariba-component-workstation-trading-warning)]'
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
            }`}
          >
            {tick ? MARKET_STATUS_LABEL[tick.marketStatus] : 'Indisponible'}
          </span>
        </span>
        <span className="flex items-center justify-between gap-2">
          {/* No tick yet means no price — never a remembered value wearing a
              live label (W2 §30).

              Visual closure §13 — the quote moves from `data-xs` (11px) to
              `data-sm` (12px) with tabular figures. This is a price a trader
              scans down a list of instruments to compare; 11px is a density
              choice that costs legibility on the one value in the row that
              matters. The *spread* stays at 11px: it is secondary, and holding
              it a step below keeps the row's own hierarchy. */}
          <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] font-medium tabular-nums text-[color:var(--wariba-component-workstation-text-secondary)]">
            {tick ? `${tick.bid} / ${tick.ask}` : '— / —'}
          </span>
          <span className="wariba-data text-[length:var(--wariba-font-size-data-xs)] tabular-nums text-[color:var(--wariba-component-workstation-text-tertiary)]">
            {spread ?? '—'}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onToggleFavorite(symbol)}
        aria-pressed={favorite}
        aria-label={favorite ? `Retirer ${symbol} des favoris` : `Ajouter ${symbol} aux favoris`}
        className={`flex min-h-11 w-8 shrink-0 items-center justify-center rounded-r-[var(--wariba-radius-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] lg:min-h-9 ${
          favorite
            ? 'text-[color:var(--wariba-color-copper-400)]'
            : 'text-[color:var(--wariba-component-workstation-text-tertiary)] hover:text-[color:var(--wariba-component-workstation-text-secondary)]'
        }`}
      >
        <WariXFavoriteIcon filled={favorite} />
      </button>
    </div>
  );
});

export interface MarketNavigatorProps {
  store: TickStore;
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  selectedSymbol: TradableSymbol;
  favorites: readonly TradableSymbol[];
  onSelectSymbol: (symbol: TradableSymbol) => void;
  onToggleFavorite: (symbol: TradableSymbol) => void;
  /** Rendered beside the title — the collapse control on desktop, nothing in the mobile sheet. */
  headerAction?: ReactNode;
}

/**
 * The Market Navigator (W2 §8).
 *
 * Its catalogue is the account's **received symbol specs** — what the server
 * actually sent for this account — not a hardcoded UI array. An instrument the
 * account has no spec for simply is not in the list, and therefore cannot be
 * presented as tradable.
 *
 * The navigator itself holds no tick subscription: search text and favorites
 * live here, prices live in the rows. So typing in the search box cannot make
 * a price re-render, and a price cannot make a category heading re-render.
 */
export const MarketNavigator = memo(function MarketNavigator({
  store,
  symbolSpecs,
  selectedSymbol,
  favorites,
  onSelectSymbol,
  onToggleFavorite,
  headerAction,
}: MarketNavigatorProps) {
  const [query, setQuery] = useState('');
  const searchId = useId();

  const categories = useMemo(() => groupAvailableSymbols(symbolSpecs), [symbolSpecs]);

  // A favorite for an instrument this account cannot trade is discarded rather
  // than rendered: preferences never create a tradable symbol (W2 §10).
  const availableFavorites = useMemo(
    () => favorites.filter((symbol) => symbolSpecs[symbol] !== undefined),
    [favorites, symbolSpecs],
  );

  const visible = useMemo(() => {
    const filterGroup = (group: MarketCategoryGroup): MarketCategoryGroup | null => {
      const symbols = group.symbols.filter((symbol) => matchesMarketQuery(symbol, query));
      return symbols.length > 0 ? { ...group, symbols } : null;
    };
    const groups = categories
      .map(filterGroup)
      .filter((group): group is MarketCategoryGroup => group !== null);
    const favoriteMatches = availableFavorites.filter((symbol) =>
      matchesMarketQuery(symbol, query),
    );
    return { groups, favoriteMatches };
  }, [categories, availableFavorites, query]);

  const hasResults = visible.groups.length > 0;

  const renderRow = (symbol: TradableSymbol, keyPrefix: string) => (
    <MarketRow
      key={`${keyPrefix}:${symbol}`}
      store={store}
      symbol={symbol}
      spec={symbolSpecs[symbol]}
      selected={symbol === selectedSymbol}
      favorite={availableFavorites.includes(symbol)}
      onSelect={onSelectSymbol}
      onToggleFavorite={onToggleFavorite}
    />
  );

  return (
    <div data-testid="market-navigator" className="flex min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-[color:var(--wariba-component-workstation-border-hairline)] px-2">
        <h2 className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase leading-[var(--wariba-line-height-label-sm)] tracking-[0.08em] text-[color:var(--wariba-component-workstation-text-tertiary)]">
          Marchés
        </h2>
        {headerAction}
      </div>

      <div className="relative h-11 shrink-0 border-b border-[color:var(--wariba-component-workstation-border-hairline)] px-2">
        <label htmlFor={searchId} className="sr-only">
          Rechercher un instrument
        </label>
        <WariXSearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--wariba-component-workstation-text-tertiary)]" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher…"
          data-testid="market-search"
          className="h-full w-full border-0 bg-transparent py-0 pl-8 pr-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-component-workstation-text-primary)] placeholder:text-[color:var(--wariba-component-workstation-text-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1 py-1.5">
        {/* Favorites is a quick-access projection, not a reclassification: an
            instrument shown here is still listed under its real category. */}
        {visible.favoriteMatches.length > 0 && (
          <section aria-labelledby="market-category-favorites">
            <h3
              id="market-category-favorites"
              className="px-1 pb-1 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-wide text-[color:var(--wariba-text-tertiary)]"
            >
              Favoris
            </h3>
            <div className="flex flex-col gap-0.5">
              {visible.favoriteMatches.map((symbol) => renderRow(symbol, 'fav'))}
            </div>
          </section>
        )}

        {visible.groups.map((group) => (
          <section key={group.id} aria-labelledby={`market-category-${group.id}`}>
            <h3
              id={`market-category-${group.id}`}
              className="px-1 pb-1 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-wide text-[color:var(--wariba-text-tertiary)]"
            >
              {group.label}
            </h3>
            <div className="flex flex-col gap-0.5">
              {group.symbols.map((symbol) => renderRow(symbol, group.id))}
            </div>
          </section>
        ))}

        {!hasResults && (
          <Text variant="body-sm" color="tertiary" className="px-2 py-4 block">
            {categories.length === 0
              ? 'Aucun instrument disponible pour ce compte.'
              : `Aucun instrument ne correspond à « ${query.trim()} ».`}
          </Text>
        )}
      </div>
    </div>
  );
});
