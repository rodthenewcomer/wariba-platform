import type { TradableSymbol } from './channels';

/**
 * WX3.1 — where an instrument's own history actually begins.
 *
 * Twelve Data serves EURUSD monthly bars back to 1984. The euro did not exist
 * until 1999; everything before that is a reconstruction from the legacy
 * currency basket the euro replaced. It is genuine vendor data and it is useful
 * for long-horizon structure, but it is not observed EURUSD trading, and
 * showing it on the same footing as post-1999 bars tells a trader the pair
 * traded at 0.65 in 1985 when no such market existed.
 *
 * WX3's rule was "never fabricate". This is the neighbouring rule: never
 * silently present someone else's reconstruction as observation. The archive
 * stays exactly as fetched — deleting a vendor's rows for aesthetics is its own
 * dishonesty — and the boundary is recorded as provenance so the product can
 * decide what to show.
 *
 * Centralized here rather than in the chart, because "when did this instrument
 * start existing" is a property of the instrument, not of a renderer.
 */

export const HISTORY_PROVENANCES = ['instrument', 'synthetic_prehistory'] as const;
export type HistoryProvenance = (typeof HISTORY_PROVENANCES)[number];

/**
 * First instant each instrument genuinely traded, epoch seconds UTC.
 *
 * A symbol absent from this table has no known synthetic prehistory, so all of
 * its archive is treated as instrument history. Absence means "no boundary
 * known", never "no boundary exists" — adding one is a data decision, and it
 * belongs in this table rather than scattered through adapters.
 */
export const INSTRUMENT_HISTORY_START: Partial<Record<TradableSymbol, number>> = {
  // The euro's first trading day. Pre-1999 EUR quotes are reconstructions from
  // the ECU and its legacy constituent currencies.
  EURUSD: Date.UTC(1999, 0, 4) / 1000,
};

export function instrumentHistoryStart(symbol: TradableSymbol): number | null {
  return INSTRUMENT_HISTORY_START[symbol] ?? null;
}

/**
 * Whether a bar is the instrument's own history or a pre-existence
 * reconstruction.
 *
 * Judged on the bar's opening instant: a monthly bucket that opens before the
 * instrument existed is reconstruction even if it happens to run past the
 * launch date, because its open, high and low come from the legacy series.
 */
export function historyProvenanceFor(symbol: TradableSymbol, startTime: number): HistoryProvenance {
  const start = instrumentHistoryStart(symbol);
  if (start === null) return 'instrument';
  return startTime < start ? 'synthetic_prehistory' : 'instrument';
}
