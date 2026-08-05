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
  activatedAtLabel: string | null;
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

  return {
    accountId: inputs.accountId,
    state,
    readOnly: isHubStateReadOnly(state),
    statusLabel: STATUS_LABEL[state],
    statusVariant: STATUS_VARIANT[state],
    balanceFormatted: formatUsd(inputs.currentBalance),
    pnlTodayFormatted: formatSignedUsd(pnlToday),
    tradingDays,
    balanceHistory,
    activatedAtLabel,
  };
}
