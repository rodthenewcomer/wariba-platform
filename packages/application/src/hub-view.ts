import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';
import { deriveHubDisplayState, isHubStateReadOnly, type HubDisplayState } from '@wariba/domain';
import { loadAccountRiskEngineInputs } from './risk-engine-inputs';

export type AccountBadgeVariant = 'neutral' | 'information' | 'success' | 'warning' | 'danger';

export interface TradingDayItem {
  dateLabel: string;
  finalized: boolean;
  netPnlFormatted: string;
}

export interface BalancePoint {
  /** ISO date (YYYY-MM-DD) — lightweight-charts accepts this as a Time directly. */
  time: string;
  balance: number;
}

/**
 * One finalised session's realised result.
 *
 * Separate from `BalancePoint` because it answers a different question — "what
 * happened that day" rather than "where was the account" — and because only
 * finalised days belong here. An open day's figure is still moving, and a bar
 * chart that redraws its last column every few seconds reads as a bug.
 */
export interface DailyPnlPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  netPnl: number;
}

export interface AccountHubView {
  accountId: string;
  state: HubDisplayState;
  readOnly: boolean;
  statusLabel: string;
  statusVariant: AccountBadgeVariant;
  balanceFormatted: string;
  pnlTodayFormatted: string;
  tradingDays: TradingDayItem[];
  balanceHistory: BalancePoint[];
  /** Closed sessions inside the window the evolution chart would draw. */
  finalizedSessionCount: number;
  /**
   * Whether drawing `balanceHistory` would tell the trader anything.
   *
   * Server-side because it is a statement about the data, not about the
   * viewport: the page should not be re-deriving "is this worth a chart" from
   * a shape it received, and two surfaces asking the question independently is
   * how they end up disagreeing.
   */
  balanceHistoryMeaningful: boolean;
  activatedAtLabel: string | null;
  /** Realised result per finalised session, oldest first. */
  dailyPnl: DailyPnlPoint[];
  /**
   * The same two headline figures, unformatted.
   *
   * Phase 2.5 §12: before this existed, the dashboard recovered the sign of
   * today's P&L with `Number.parseFloat(pnlTodayFormatted.replace(/[^\d.-]/g,''))`
   * — a locale-dependent regex over a display string, deciding whether a
   * trader's day is rendered green or red. The number the colour depends on
   * now travels as a number.
   */
  amounts: {
    balance: string;
    pnlToday: string;
  };
  /**
   * When this snapshot was taken.
   *
   * §23 forbids labelling a surface "live" that is not. The Hub shows
   * "Actualisé il y a 2 s" computed from this instant, which is a claim it can
   * actually keep.
   */
  updatedAt: string;
}

/**
 * A chart is worth drawing when there is a line to draw.
 *
 * An account activated an hour ago has exactly one snapshot, still open, at
 * its opening balance. Plotting it produces a chart whose vertical axis reads
 * 9 999,95 / 10 000,00 / 10 000,05 — an auto-scaled rendering of nothing,
 * occupying the most valuable third of the dashboard and implying a
 * performance history that does not exist. That is not a small chart, it is a
 * misleading one.
 *
 * Two conditions, both necessary. At least two *closed* sessions, because an
 * open day is a number still moving. And at least two distinct balances,
 * because a line that never leaves its own starting value is drawn entirely
 * out of floating-point noise once the axis auto-scales to it.
 */
export function isBalanceHistoryMeaningful(
  points: readonly BalancePoint[],
  finalizedSessionCount: number,
): boolean {
  if (finalizedSessionCount < 2) return false;
  const distinct = new Set(points.map((point) => point.balance));
  return distinct.size >= 2;
}

export interface BuildAccountHubViewParams {
  accountId: string;
  now: Date;
}

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

function formatSignedUsd(amount: string): string {
  const rounded = Math.round(Number.parseFloat(amount));
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('fr-FR')} USD`;
}

// UX Architecture §43 official terminology + Prompt Pack CONTENT vocabulary.
const STATUS_LABEL: Record<HubDisplayState, string> = {
  pending_activation: 'Activation en attente',
  active: 'Actif',
  attention: 'Attention',
  soft_locked: 'Blocage temporaire',
  target_waiting: 'Passage en attente',
  passed: 'Objectif validé',
  breached: 'Limite maximale dépassée',
  inactive: 'Inactif',
  closed: 'Compte terminé',
};

const STATUS_VARIANT: Record<HubDisplayState, AccountBadgeVariant> = {
  pending_activation: 'neutral',
  active: 'success',
  attention: 'warning',
  soft_locked: 'warning',
  target_waiting: 'information',
  passed: 'success',
  breached: 'danger',
  inactive: 'neutral',
  closed: 'neutral',
};

/**
 * Prompt 06 account_hub_view — Zone 1 (UX Architecture §20.2): state,
 * balance, today's PnL. Only callable for accounts past `pending_activation`
 * (same precondition as loadAccountRiskEngineInputs) — the page renders the
 * "no account"/"pending activation" states directly from the lighter
 * AccountSummaryDTO instead of calling this.
 */
export async function buildAccountHubView(
  db: Db,
  params: BuildAccountHubViewParams,
): Promise<AccountHubView> {
  const inputs = await loadAccountRiskEngineInputs(db, params);
  const { result } = inputs;

  const snapshotRows = await db
    .selectFrom('app.account_daily_snapshots')
    .select(['trading_day', 'status', 'realized_net_profit_for_day', 'sod_balance', 'eod_balance'])
    .where('account_id', '=', params.accountId)
    .orderBy('trading_day', 'desc')
    .limit(14)
    .execute();

  const tradingDays: TradingDayItem[] = snapshotRows.map((row) => {
    const finalized = row.status === 'finalized';
    const netPnl = finalized
      ? (row.realized_net_profit_for_day as string)
      : new Decimal(row.eod_balance ?? inputs.currentBalance).minus(row.sod_balance).toFixed(2);
    return {
      dateLabel: new Date(`${row.trading_day}T00:00:00.000Z`).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      }),
      finalized,
      netPnlFormatted: formatSignedUsd(netPnl),
    };
  });

  // Ascending order for the chart (snapshotRows above is newest-first for the list).
  const balanceHistory: BalancePoint[] = [...snapshotRows].reverse().map((row) => ({
    time: row.trading_day,
    balance: Number.parseFloat(row.eod_balance ?? inputs.currentBalance),
  }));

  const state = deriveHubDisplayState({
    accountStatus: inputs.accountStatus,
    attention: {
      dailyLossFloor: result.dailyLoss.floor,
      dailyLossUsed: result.dailyLoss.used,
      maximumLossRemaining: result.maximumLoss.remaining,
      maximumLossBudget: new Decimal(inputs.nominalBalance)
        .times(inputs.policy.parameters.maximum_loss_rate)
        .toFixed(2),
    },
  });

  // Realized-only equity (see risk-engine-inputs.ts doc comment): today's
  // daily reference equals start-of-day balance in this construction, so
  // "PnL du jour" is simply how far the current balance has moved from it.
  const pnlToday = new Decimal(inputs.currentBalance).minus(result.dailyLoss.reference).toFixed(2);

  const activatedAtLabel = inputs.activatedAt
    ? inputs.activatedAt.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const finalizedSessionCount = snapshotRows.filter((row) => row.status === 'finalized').length;

  // Finalised sessions only — see DailyPnlPoint. Ascending, like the chart.
  const dailyPnl: DailyPnlPoint[] = [...snapshotRows]
    .reverse()
    .filter((row) => row.status === 'finalized' && row.realized_net_profit_for_day !== null)
    .map((row) => ({
      date: row.trading_day,
      netPnl: Number.parseFloat(row.realized_net_profit_for_day as string),
    }));

  return {
    dailyPnl,
    amounts: {
      balance: inputs.currentBalance,
      pnlToday,
    },
    updatedAt: params.now.toISOString(),
    accountId: inputs.accountId,
    state,
    readOnly: isHubStateReadOnly(state),
    statusLabel: STATUS_LABEL[state],
    statusVariant: STATUS_VARIANT[state],
    balanceFormatted: formatUsd(inputs.currentBalance),
    pnlTodayFormatted: formatSignedUsd(pnlToday),
    tradingDays,
    balanceHistory,
    finalizedSessionCount,
    balanceHistoryMeaningful: isBalanceHistoryMeaningful(balanceHistory, finalizedSessionCount),
    activatedAtLabel,
  };
}
