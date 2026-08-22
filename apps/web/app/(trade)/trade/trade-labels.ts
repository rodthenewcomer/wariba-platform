import type { BadgeVariant } from '@wariba/ui';
import type {
  FillDTO,
  MarketStatus,
  OrderDTO,
  OrderType,
  PendingOrderType,
} from '@wariba/contracts';

export const MARKET_STATUS_LABEL: Record<MarketStatus, string> = {
  open: 'Ouvert',
  stale: 'Non actualisé',
  closed: 'Fermé',
};

export const CONCENTRATION_BUCKET_LABEL: Record<string, string> = {
  forex: 'Forex (EUR/USD, GBP/USD, USD/JPY)',
  xauusd: 'Or (XAUUSD)',
  nas100: 'Indices (NAS100)',
};

export const PENDING_ORDER_TYPE_LABEL: Record<PendingOrderType, string> = {
  buy_limit: 'Achat Limite',
  sell_limit: 'Vente Limite',
  buy_stop: 'Achat Stop',
  sell_stop: 'Vente Stop',
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  market_open: 'Ouverture',
  partial_close: 'Clôture partielle',
  full_close: 'Clôture',
  close_all: 'Tout fermer',
  modify_sl: 'Modif. SL',
  modify_tp: 'Modif. TP',
};

export const ORDER_STATUS_LABEL: Record<OrderDTO['status'], string> = {
  received: 'Reçu',
  validated: 'Validé',
  accepted: 'Accepté',
  filled: 'Exécuté',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
};

export const ORDER_STATUS_BADGE_VARIANT: Record<OrderDTO['status'], BadgeVariant> = {
  received: 'neutral',
  validated: 'neutral',
  accepted: 'information',
  filled: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

export const ELIGIBILITY_LABEL: Record<NonNullable<FillDTO['eligibilityReason']>, string> = {
  eligible: 'Éligible',
  short_duration_profit: 'Profit < 60 s',
  loss_counted: 'Perte comptée',
  breakeven: 'Neutre',
};

export const ELIGIBILITY_BADGE_VARIANT: Record<
  NonNullable<FillDTO['eligibilityReason']>,
  BadgeVariant
> = {
  eligible: 'success',
  short_duration_profit: 'warning',
  loss_counted: 'information',
  breakeven: 'neutral',
};

/**
 * UTC throughout WariX (RiskRibbon's "Reset 00:00 UTC", TradeChart's explicit
 * UTC axis) — the History tab keeps that same reference timezone rather than
 * silently switching to the browser's local time.
 */
export function formatOrderTimestamp(iso: string): string {
  return `${new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso))} UTC`;
}

/**
 * VX1 §16 — money on a chart chip, at the width a chart chip has.
 *
 * `+95.70 USD` is what every panel in WariX writes, and it is right there: a
 * panel has a column header to hoist the unit into. A chip standing on a price
 * line has neither, and three characters of currency word crowd out the figure
 * they qualify. `$` is the same unit in one glyph.
 *
 * **It is the account's unit, not an assumption about the trader.** Every WariX
 * account is denominated in USD (the account read model formats its nominal in
 * USD, the dock and the execution impact strip both label their figures USD), so
 * this prints the same currency those surfaces do. The day an account can be
 * denominated in something else, this takes the unit as an argument rather than
 * guessing — which is why the symbol lives in one function instead of in every
 * chip.
 *
 * The sign is always explicit: on a trading chart "70.20" and "-70.20" must
 * never be told apart by a character a trader might miss, so a gain carries its
 * `+`.
 */
export function formatMoney(amount: string): string {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return '—';
  const sign = parsed > 0 ? '+' : parsed < 0 ? '−' : '';
  return `${sign}$${Math.abs(parsed).toFixed(2)}`;
}

/**
 * Lot size, as a trader writes it on a chart: `.10`, not `0.1000`.
 *
 * Two decimals is the step the ticket itself uses (0.01), so nothing is rounded
 * away that a trader could have entered. The leading zero goes because the chip
 * is three characters wide and the decimal point already says what this is.
 */
export function formatLotSize(quantity: string): string {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed)) return quantity;
  const fixed = parsed.toFixed(2);
  return fixed.startsWith('0.') ? fixed.slice(1) : fixed;
}

export function formatDuration(durationMs: string | null): string {
  if (durationMs === null) return '—';
  const totalSeconds = Math.max(0, Math.floor(Number(durationMs) / 1_000));
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${seconds.toString().padStart(2, '0')} s`;
}
