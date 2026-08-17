'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { WariXSearchIcon } from '@wariba/ui';
import type { SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { ChartModal } from './ChartModal';
import {
  groupAvailableSymbols,
  matchesMarketQuery,
  type MarketCategoryId,
} from './market-categories';

const INSTRUMENT_NAME: Record<TradableSymbol, string> = {
  EURUSD: 'Euro / Dollar US',
  GBPUSD: 'Livre sterling / Dollar US',
  USDJPY: 'Dollar US / Yen japonais',
  XAUUSD: 'Or / Dollar US',
  NAS100: 'Nasdaq 100',
};

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
          ? group.symbols.filter((symbol) => {
              if (matchesMarketQuery(symbol, query)) return true;
              return INSTRUMENT_NAME[symbol]
                .toLocaleUpperCase('fr-FR')
                .includes(query.trim().toLocaleUpperCase('fr-FR'));
            })
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
              className="h-10 w-full rounded-[7px] border border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-canvas)] pl-10 pr-3 text-[length:var(--wariba-component-workstation-type-body)] text-[color:var(--wariba-component-workstation-text-primary)] outline-none placeholder:text-[color:var(--wariba-component-workstation-text-tertiary)] focus:border-[color:var(--wariba-component-workstation-border-focus)]"
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
                className={`h-7 rounded-full px-3 text-[length:var(--wariba-component-workstation-type-label)] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] ${
                  category === item.id
                    ? 'bg-[color:var(--wariba-component-workstation-text-primary)] text-[color:var(--wariba-chart-background)]'
                    : 'bg-[color:var(--wariba-component-workstation-surface-control)] text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="flex h-full min-h-56 items-center justify-center text-[length:var(--wariba-component-workstation-type-body)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
              Aucun instrument disponible pour cette recherche.
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
                      className={`grid h-14 w-full grid-cols-[9rem_minmax(0,1fr)_6rem] items-center gap-3 rounded-[7px] px-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] ${
                        selected
                          ? 'bg-[color:var(--wariba-component-workstation-wash-selected)]'
                          : 'hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)]'
                      }`}
                    >
                      <span className="font-bold tracking-[-0.01em] text-[color:var(--wariba-component-workstation-text-primary)]">
                        {symbol}
                      </span>
                      <span className="truncate text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-secondary)]">
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
