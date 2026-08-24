import type { ReactNode } from 'react';
import type { AccountRiskStatus } from '@wariba/application';
import { HubModule, HubModuleTitle } from './HubModule';

const STATUS: Record<AccountRiskStatus, { label: string; accent: string; wash: string }> = {
  normal: {
    label: 'Normal',
    accent: 'var(--wariba-component-workstation-trading-buy)',
    wash: 'var(--wariba-status-success-background)',
  },
  attention: {
    label: 'Attention',
    accent: 'var(--wariba-component-workstation-trading-warning)',
    wash: 'var(--wariba-status-warning-background)',
  },
  'near-limit': {
    label: 'Proche limite',
    accent: 'var(--wariba-component-workstation-trading-warning)',
    wash: 'var(--wariba-status-warning-background)',
  },
  'soft-lock': {
    label: 'Blocage temporaire',
    accent: 'var(--wariba-component-workstation-trading-sell)',
    wash: 'var(--wariba-status-danger-background)',
  },
  'hard-breach': {
    label: 'Limite maximale dépassée',
    accent: 'var(--wariba-component-workstation-trading-sell)',
    wash: 'var(--wariba-status-danger-background)',
  },
  stale: {
    label: 'Données indisponibles',
    accent: 'var(--wariba-text-tertiary)',
    wash: 'var(--wariba-status-neutral-background)',
  },
};

export interface RiskPanelProps {
  status: AccountRiskStatus;
  /** Already formatted by the read model — this component does no math. */
  dailyLossRemaining: string;
  maximumLossRemaining: string;
  nextResetLabel: string;
  pnlTodayFormatted: string;
  detail?: ReactNode;
}

/**
 * Where the trader stands against the limits, in the width of a column.
 *
 * The workstation's `RiskRibbon` is a horizontal bar built for a status strip
 * that spans a terminal; folded into a third of a dashboard it wraps into four
 * ragged lines. Same figures, same vocabulary, same authority — a layout the
 * shape of the space it occupies.
 *
 * Every number arrives pre-formatted from the risk read model. No arithmetic
 * happens on this side of the wire: a risk figure a browser computed is a risk
 * figure the platform cannot stand behind.
 *
 * State is carried by label first and colour second, in that order, so it
 * survives greyscale and colour-blindness — a trader must never need to
 * distinguish amber from red to know whether they can place a trade.
 */
export function RiskPanel({
  status,
  dailyLossRemaining,
  maximumLossRemaining,
  nextResetLabel,
  pnlTodayFormatted,
  detail,
}: RiskPanelProps) {
  const meta = STATUS[status];

  return (
    <HubModule data-testid="risk-panel" className="flex h-full flex-col gap-4 p-5 sm:p-6">
      <HubModuleTitle>Aujourd’hui</HubModuleTitle>

      <div
        role="status"
        className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
        style={{ background: meta.wash }}
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: meta.accent }}
        />
        <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
          {meta.label}
        </span>
      </div>

      <dl className="flex flex-col gap-3">
        {[
          { term: 'PnL du jour', value: pnlTodayFormatted },
          { term: 'Perte quotidienne restante', value: dailyLossRemaining },
          { term: 'Perte max. restante', value: maximumLossRemaining },
          { term: 'Prochain reset', value: nextResetLabel },
        ].map((row) => (
          <div key={row.term} className="flex items-baseline justify-between gap-3">
            <dt className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
              {row.term}
            </dt>
            <dd className="wariba-data text-right text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {detail ? <div className="mt-auto pt-1">{detail}</div> : null}
    </HubModule>
  );
}
