import type { Db } from '@wariba/database';
import { RISK_RULE_LABELS } from './risk-view';

export type ActivityItemKind = 'state_transition' | 'risk_violation' | 'fill';
export type ActivitySeverity = 'information' | 'warning' | 'danger' | 'success';

export interface ActivityItem {
  id: string;
  kind: ActivityItemKind;
  label: string;
  detail?: string;
  timestampLabel: string;
  occurredAt: string;
  severity: ActivitySeverity;
}

export interface BuildRecentActivityViewParams {
  accountId: string;
  limit?: number;
}

function formatTimestampLabel(date: Date): string {
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}

const TRANSITION_REASON_LABEL: Record<string, string> = {
  daily_loss_limit_reached: 'Limite de perte quotidienne atteinte',
  daily_loss_limit_reset: 'Blocage temporaire levé',
  maximum_loss_breach: 'Perte maximale atteinte',
  evaluation_target_reached: 'Objectif de profit atteint',
  evaluation_pass_finalized: 'Passage validé',
};

const TRANSITION_SEVERITY: Record<string, ActivitySeverity> = {
  daily_loss_limit_reached: 'warning',
  daily_loss_limit_reset: 'information',
  maximum_loss_breach: 'danger',
  evaluation_target_reached: 'success',
  evaluation_pass_finalized: 'success',
};

/**
 * Prompt 06 recent_activity_view — merges state transitions, risk-violation
 * evidence, and trade fills into one chronological feed. Also doubles as
 * the "notifications" content for this pass (scope reduction approved
 * 2026-08-04, see DECISION_LOG.md): no dedicated notifications table/read-
 * status exists yet, and every event a trader would want to be notified
 * about already has a real row in one of these three tables.
 */
export async function buildRecentActivityView(
  db: Db,
  params: BuildRecentActivityViewParams,
): Promise<ActivityItem[]> {
  const limit = params.limit ?? 20;

  const [transitions, violations, fills] = await Promise.all([
    db
      .selectFrom('app.account_state_transitions')
      .select(['id', 'from_status', 'to_status', 'reason', 'occurred_at'])
      .where('account_id', '=', params.accountId)
      .orderBy('occurred_at', 'desc')
      .limit(limit)
      .execute(),
    db
      .selectFrom('app.risk_violations')
      .select([
        'id',
        'rule_code',
        'severity',
        'consequence',
        'threshold_value',
        'observed_value',
        'occurred_at',
      ])
      .where('account_id', '=', params.accountId)
      .orderBy('occurred_at', 'desc')
      .limit(limit)
      .execute(),
    db
      .selectFrom('app.fills')
      .select([
        'id',
        'symbol',
        'side',
        'fill_type',
        'quantity',
        'price',
        'realized_pnl',
        'occurred_at',
      ])
      .where('account_id', '=', params.accountId)
      .orderBy('occurred_at', 'desc')
      .limit(limit)
      .execute(),
  ]);

  const items: ActivityItem[] = [
    ...transitions.map((row): ActivityItem => ({
      id: `transition-${row.id}`,
      kind: 'state_transition',
      label: TRANSITION_REASON_LABEL[row.reason] ?? row.reason,
      detail: `${row.from_status ?? '—'} → ${row.to_status}`,
      timestampLabel: formatTimestampLabel(row.occurred_at),
      occurredAt: row.occurred_at.toISOString(),
      severity: TRANSITION_SEVERITY[row.reason] ?? 'information',
    })),
    ...violations.map((row): ActivityItem => ({
      id: `violation-${row.id}`,
      kind: 'risk_violation',
      label: RISK_RULE_LABELS[row.rule_code] ?? row.rule_code,
      ...(row.threshold_value && row.observed_value
        ? {
            detail: `Seuil ${formatUsd(row.threshold_value)} · observé ${formatUsd(row.observed_value)}`,
          }
        : {}),
      timestampLabel: formatTimestampLabel(row.occurred_at),
      occurredAt: row.occurred_at.toISOString(),
      severity:
        row.severity === 'critical'
          ? 'danger'
          : row.severity === 'warning'
            ? 'warning'
            : 'information',
    })),
    ...fills.map((row): ActivityItem => ({
      id: `fill-${row.id}`,
      kind: 'fill',
      label: `${row.side === 'buy' ? 'Achat' : 'Vente'} ${row.symbol}`,
      detail:
        row.fill_type === 'close'
          ? `${row.quantity} @ ${row.price} · PnL ${formatUsd(row.realized_pnl)}`
          : `${row.quantity} @ ${row.price}`,
      timestampLabel: formatTimestampLabel(row.occurred_at),
      occurredAt: row.occurred_at.toISOString(),
      severity: 'information',
    })),
  ];

  return items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
}
