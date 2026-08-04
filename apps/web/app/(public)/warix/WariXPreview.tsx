'use client';

import { useState } from 'react';
import { Button, Text } from '@wariba/ui';

const MARKET = [
  { symbol: 'EURUSD', bid: '1.08450', ask: '1.08460', exposure: 'Forex agrégé' },
  { symbol: 'GBPUSD', bid: '1.26000', ask: '1.26020', exposure: 'Forex agrégé' },
  { symbol: 'USDJPY', bid: '150.100', ask: '150.120', exposure: 'Forex agrégé' },
  { symbol: 'XAUUSD', bid: '2 340.20', ask: '2 340.50', exposure: 'XAUUSD' },
  { symbol: 'NAS100', bid: '18 020.0', ask: '18 022.0', exposure: 'NAS100' },
] as const;

export function WariXPreview() {
  const [selected, setSelected] = useState<(typeof MARKET)[number]>(MARKET[0]);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');

  return (
    <div className="overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-ink-950)] shadow-[var(--wariba-shadow-lg)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--wariba-color-ink-700)] px-4 py-4 sm:px-6">
        <div>
          <p className="font-semibold text-[color:var(--wariba-color-bone-50)]">WariX</p>
          <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
            Démonstration locale · aucune commande envoyée
          </p>
        </div>
        <p className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-color-success-100)]">
          SANDBOX CONNECTE
        </p>
      </div>
      <div className="grid lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 border-b border-[color:var(--wariba-color-ink-700)] lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-[1fr_auto_auto] border-b border-[color:var(--wariba-color-ink-700)] px-4 py-3 text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)] sm:px-6">
            <span>Instrument</span>
            <span className="w-24 text-right">Bid</span>
            <span className="w-24 text-right">Ask</span>
          </div>
          {MARKET.map((row) => (
            <button
              key={row.symbol}
              type="button"
              onClick={() => setSelected(row)}
              className={`grid min-h-14 w-full grid-cols-[1fr_auto_auto] items-center border-b border-[color:var(--wariba-color-ink-800)] px-4 text-left transition-colors sm:px-6 ${
                selected.symbol === row.symbol
                  ? 'bg-[color:var(--wariba-color-ink-800)]'
                  : 'hover:bg-[color:var(--wariba-color-ink-900)]'
              }`}
            >
              <span className="font-semibold text-[color:var(--wariba-color-bone-50)]">
                {row.symbol}
              </span>
              <span className="wariba-data w-24 text-right text-[color:var(--wariba-color-ink-200)]">
                {row.bid}
              </span>
              <span className="wariba-data w-24 text-right text-[color:var(--wariba-color-ink-200)]">
                {row.ask}
              </span>
            </button>
          ))}
          <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
            {[
              ['Policy', 'ONE 1.1'],
              ['DLL', '3 % soft lock'],
              ['Max Loss', '10 % EOD'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] p-4"
              >
                <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
                  {label}
                </p>
                <p className="wariba-data mt-2 text-[color:var(--wariba-color-bone-50)]">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <aside className="p-5 sm:p-6">
          <Text variant="label-sm" className="text-[color:var(--wariba-color-ink-300)]">
            Ticket de démonstration
          </Text>
          <p className="wariba-data mt-3 text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            {selected.symbol}
          </p>
          <p className="mt-1 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-300)]">
            Limite : {selected.exposure}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button
              variant={side === 'buy' ? 'primary' : 'secondary'}
              onClick={() => setSide('buy')}
            >
              Achat
            </Button>
            <Button
              variant={side === 'sell' ? 'primary' : 'secondary'}
              onClick={() => setSide('sell')}
            >
              Vente
            </Button>
          </div>
          <div className="mt-5 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] p-4">
            <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
              Prix indicatif sélectionné
            </p>
            <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-data-lg)] text-[color:var(--wariba-color-bone-50)]">
              {side === 'buy' ? selected.ask : selected.bid}
            </p>
          </div>
          <p className="mt-5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-300)]">
            En produit, le serveur décide du prix, du spread, du slippage sandbox et du fill.
          </p>
        </aside>
      </div>
    </div>
  );
}
