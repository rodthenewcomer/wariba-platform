'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { InstrumentAvatar, WariXSearchIcon } from '@wariba/ui';
import type { SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { ChartModal } from './ChartModal';
import {
  groupAvailableSymbols,
  INSTRUMENT_NAME,
  matchesMarketQuery,
  type MarketCategoryId,
} from './market-categories';

type SearchCategory = 'all' | MarketCategoryId;

export interface SymbolSearchModalProps {
  open: boolean;
  onClose(): void;
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  selectedSymbol: TradableSymbol;
  onSelectSymbol(symbol: TradableSymbol): void;
}

/**
 * Trader-native instrument switcher. The result set is built exclusively from
 * the symbol specs authorized for the loaded account, so search can never
 * advertise a market the order path cannot trade.
 */
export function SymbolSearchModal({
  open,
  onClose,
  symbolSpecs,
  selectedSymbol,
  onSelectSymbol,
}: SymbolSearchModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => groupAvailableSymbols(symbolSpecs), [symbolSpecs]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCategory('all');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const results = useMemo(
    () =>
      groups.flatMap((group) =>
        (category === 'all' || group.id === category
          ? group.symbols.filter((symbol) => matchesMarketQuery(symbol, query))
          : []
        ).map((symbol) => ({ symbol, group })),
      ),
    [category, groups, query],
  );

  return (
    <ChartModal
      open={open}
      onClose={onClose}
      title="Rechercher un instrument"
      width={720}
      height={610}
      testId="symbol-search-modal"
    >
      <div className="flex min-h-0 flex-1 flex-col bg-[color:var(--wariba-component-workstation-surface-module)]">
        <div className="shrink-0 border-b border-[color:var(--wariba-component-workstation-border-hairline)] px-4 py-3">
          <label className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[color:var(--wariba-component-workstation-text-tertiary)]">
              <WariXSearchIcon size="toolbar" />
            </span>
            <span className="sr-only">Rechercher par symbole ou nom</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Symbole ou nom de l’instrument"
              data-testid="symbol-search-input"
              className="h-10 w-full rounded-[var(--wariba-component-workstation-radius-control)] border border-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-canvas)] pl-10 pr-3 shadow-[inset_0_1px_2px_0_rgba(5,7,12,0.55)] transition-[border-color,box-shadow] duration-[var(--wariba-component-workstation-motion-quick)] text-[length:var(--wariba-component-workstation-type-body)] text-[color:var(--wariba-component-workstation-text-primary)] outline-none placeholder:text-[color:var(--wariba-component-workstation-text-tertiary)] focus:border-[color:var(--wariba-component-workstation-border-focus)] focus:shadow-[inset_0_1px_2px_0_rgba(5,7,12,0.55),0_0_6px_0_var(--wariba-component-workstation-focus-glow)]"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Catégories d’instruments">
            {[
              { id: 'all' as const, label: 'Tous' },
              ...groups.map((group) => ({ id: group.id, label: group.label })),
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                aria-pressed={category === item.id}
                /* VX1-B §22 — a selected filter is cobalt, like every other
                   selected thing in WariX. The bone fill it used to take was the
                   one control on this surface speaking the marketing palette. */
                className={`h-7 rounded-full px-3 text-[length:var(--wariba-component-workstation-type-label)] font-semibold transition-[background-color,color,box-shadow] duration-[var(--wariba-component-workstation-motion-quick)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] ${
                  category === item.id
                    ? 'bg-[color:var(--wariba-component-workstation-wash-selected-strong)] text-[color:var(--wariba-component-workstation-interaction-selected-text)] shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-seam-active)]'
                    : 'bg-[color:var(--wariba-component-workstation-surface-control)] text-[color:var(--wariba-component-workstation-text-secondary)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-seam-hairline)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            /* §29 — compact, factual, and no invented suggestions: the
               catalogue is what it is, and the search says so in one line. */
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-1.5 text-center">
              <span
                aria-hidden="true"
                className="h-px w-8 rounded-full bg-[color:var(--wariba-component-workstation-seam-strong)]"
              />
              <p className="text-[length:var(--wariba-component-workstation-type-data)] font-semibold text-[color:var(--wariba-component-workstation-text-secondary)]">
                Aucun instrument trouvé
              </p>
              <p className="text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
                Essayez un autre symbole ou changez de catégorie.
              </p>
            </div>
          ) : (
            <ul className="space-y-px" aria-label="Instruments disponibles">
              {results.map(({ symbol, group }) => {
                const selected = symbol === selectedSymbol;
                return (
                  <li key={symbol}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSymbol(symbol);
                        onClose();
                      }}
                      aria-current={selected ? 'true' : undefined}
                      data-testid={`symbol-search-result-${symbol}`}
                      /* VX1-E §W — a result is a mini-card carrying the same
                         identity Markets uses, so an instrument looks like
                         itself wherever a trader meets it. */
                      className={`grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--warix-radius-card)] border px-3 py-2 text-left transition-[background-color,box-shadow,border-color] duration-[var(--wariba-component-workstation-motion-quick)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] sm:h-14 sm:grid-cols-[11rem_minmax(0,1fr)_6rem] sm:gap-3 sm:py-0 ${
                        selected
                          ? 'border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface-selected)] shadow-[inset_0_1px_0_0_var(--warix-highlight-inner-strong)]'
                          : 'border-transparent hover:border-[color:var(--warix-border-subtle)] hover:bg-[color:var(--warix-surface-hover)]'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <InstrumentAvatar
                          symbol={symbol}
                          assetClass={symbolSpecs[symbol]?.assetClass}
                          size="md"
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-bold tracking-[-0.01em] text-[color:var(--wariba-component-workstation-text-primary)]">
                            {symbol}
                          </span>
                          <span className="truncate text-[length:var(--wariba-component-workstation-type-meta)] text-[color:var(--wariba-component-workstation-text-tertiary)] sm:hidden">
                            {INSTRUMENT_NAME[symbol]}
                          </span>
                        </span>
                      </span>
                      <span className="hidden truncate text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-secondary)] sm:block">
                        {INSTRUMENT_NAME[symbol]}
                      </span>
                      <span className="text-right text-[length:var(--wariba-component-workstation-type-meta)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
                        {group.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </ChartModal>
  );
}
