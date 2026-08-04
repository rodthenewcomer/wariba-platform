'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { formatSimulatedPrice, useSimulatedMarket, type SimulatedSymbol } from './useSimulatedMarket';
import { WariXChart } from './WariXChart';

const CYCLE_SYMBOLS: readonly SimulatedSymbol[] = ['EURUSD', 'XAUUSD', 'NAS100'];
const CYCLE_INTERVAL_MS = 6000;

/**
 * Lightweight homepage teaser for WariX — same live simulated-market engine
 * and chart component as the full terminal on /warix, just smaller and with
 * no order ticket. Cycles symbols on its own; the full interactive/animated
 * terminal lives on /warix.
 */
export function WariXMiniPreview() {
  const market = useSimulatedMarket();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % CYCLE_SYMBOLS.length);
    }, CYCLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const symbol = CYCLE_SYMBOLS[index] as SimulatedSymbol;
  const quote = market[symbol];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-color-bone-200)] bg-[color:var(--wariba-color-ink-950)] p-5 shadow-[var(--wariba-shadow-md)] sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--wariba-color-ink-700)] pb-4">
        <p className="font-semibold text-[color:var(--wariba-color-bone-50)]">WariX</p>
        <p className="flex items-center gap-2 text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
          <motion.span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-[color:var(--wariba-color-success-500)]"
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          Démonstration
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="wariba-data text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]">
          {symbol}
        </p>
        <p className="wariba-data text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-300)]">
          {formatSimulatedPrice(quote.bid, quote.decimals)} / {formatSimulatedPrice(quote.ask, quote.decimals)}
        </p>
      </div>
      <div className="mt-3">
        <WariXChart candles={quote.candles} height={220} />
      </div>
    </motion.div>
  );
}
