'use client';

import { memo } from 'react';
import {
  Badge,
  Button,
  MetricReadout,
  WariXNotificationsIcon,
  WariXRiskIcon,
  type MetricTone,
} from '@wariba/ui';
import type { AccountRisk } from '@wariba/contracts';
import { TradeRiskDetail } from '../TradeRiskDetail';
import { deriveRiskRibbonStatus } from '../risk-status';
import {
  WorkstationAccountSwitcher,
  type WorkstationAccountOption,
} from './WorkstationAccountSwitcher';

export interface WorkstationStatusBarProps {
  accounts: readonly WorkstationAccountOption[];
  activeAccountId: string;
  balanceFormatted: string;
  equityFormatted: string;
  risk: AccountRisk | null;
  connectionOk: boolean;
  isResyncing: boolean;
  unreadCount: number;
  onOpenNotifications: () => void;
}

const RISK_TONE: Record<string, MetricTone> = {
  normal: 'default',
  attention: 'warning',
  'near-limit': 'warning',
  'soft-lock': 'danger',
  'hard-breach': 'danger',
  stale: 'default',
};

/**
 * One metric. `<dt>`/`<dd>` so the value is never an unlabelled number to a
 * screen reader, and `wariba-data` so every figure stays tabular (W1 §11).
 */
function Metric({
  label,
  shortLabel,
  value,
  shortValue,
  tone = 'default',
  className,
}: {
  label: string;
  /** Phone-width label. The full label stays in the accessible name. */
  shortLabel?: string | undefined;
  value: string;
  /** Phone-width value — usually the same figure without its ` USD` suffix. */
  shortValue?: string | undefined;
  tone?: MetricTone | undefined;
  className?: string | undefined;
}) {
  return (
    <MetricReadout
      label={label}
      value={value}
      tone={tone}
      compact
      valueClassName="max-sm:text-[11px]"
      {...(shortLabel === undefined ? {} : { shortLabel })}
      {...(shortValue === undefined ? {} : { shortValue })}
      {...(className === undefined ? {} : { className })}
    />
  );
}

/**
 * The workstation status bar (W1 §11) — one compact horizontal row replacing
 * the 214 px account/risk header stack the W0 audit measured at every desktop
 * width.
 *
 * Three deliberate departures from the block it replaces:
 *
 * - **Connection state appears exactly once.** W0 §3B found it rendered
 *   twice under different names (`AccountContext.statusLabel` "Actif" and
 *   `RiskRibbon`'s own dot). The account's status is now the switcher's dot;
 *   the *transport* state is this one chip and nowhere else.
 * - **No selected-symbol market status.** That is a property of the
 *   instrument, not the account, and it now lives with the chart
 *   (`ChartWorkspace`). Consequently the risk state shown here is derived
 *   without the selected tick — a stale EURUSD feed no longer makes an
 *   untouched account's risk read "Données indisponibles". The *execution*
 *   gate still uses the tick-aware derivation, unchanged, in `ExecutionPanel`.
 * - **Responsive priority, not truncation.** Balance/target/consistency drop
 *   out below wide desktop and the daily-loss figure below `sm`; nothing is
 *   invented and nothing is lost — "Détail des règles" opens the full
 *   server-computed breakdown at every width.
 *
 * Every figure is server-authoritative (`AccountSnapshot` / `AccountRisk`).
 * This component performs no arithmetic.
 */
export const WorkstationStatusBar = memo(function WorkstationStatusBar({
  accounts,
  activeAccountId,
  balanceFormatted,
  equityFormatted,
  risk,
  connectionOk,
  isResyncing,
  unreadCount,
  onOpenNotifications,
}: WorkstationStatusBarProps) {
  // Account-level risk only — see the note above on why the selected
  // symbol's staleness is deliberately not an input here.
  const riskStatus = deriveRiskRibbonStatus({ risk, isStale: false, isResyncing });
  const tone = RISK_TONE[riskStatus] ?? RISK_TONE.normal;
  const connectionLabel = connectionOk
    ? 'Connecté'
    : isResyncing
      ? 'Resynchronisation…'
      : 'Reconnexion…';
  const shortDuration = risk?.shortDurationMonitoring.status;

  return (
    <header
      data-testid="workstation-status-bar"
      className="relative z-30 flex h-[var(--wariba-component-workstation-statusbar-mobile-height)] min-w-0 shrink-0 items-center gap-1.5 overflow-visible border-b border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-1 lg:h-[var(--wariba-component-workstation-statusbar-height)] lg:gap-2 lg:px-2"
    >
      <WorkstationAccountSwitcher accounts={accounts} activeAccountId={activeAccountId} />

      <span
        aria-hidden="true"
        className="h-5 w-px shrink-0 bg-[color:var(--wariba-component-workstation-border-hairline)]"
      />

      {/* `shrink-0`, not `min-w-0`: a squeezed metric list does not truncate
          gracefully, it overlaps the controls to its right — a status bar
          that draws one figure on top of another is worse than one that
          shows fewer. Each metric appears only from the width at which the
          whole row fits, and the bar's own `overflow-x-auto` is the last
          resort. Nothing is clipped and no figure is hidden without being
          reachable through "Détail des règles".

          The ladder has to start at the *narrowest* supported width, not at
          `sm`. Equity + DLL together measure ~150 px, which with the account
          identity (~58), the seam, and the right-hand controls (~96) plus
          gaps and padding needs 364 px — so at 320/360 the row did not fit
          and the bar quietly became sideways-scrollable, putting
          Notifications out of reach (the exact W2 §25 regression). Below
          `sm` only the first metric fits, so only the first one is shown;
          the daily-loss figure returns at `sm` and is reachable at every
          width through "Détail des règles" → "Restant avant blocage". */}
      <dl data-testid="workstation-metrics" className="flex shrink-0 items-center gap-2 xl:gap-3">
        <Metric
          label="Equity"
          shortLabel="Eq"
          value={equityFormatted}
          shortValue={equityFormatted.replace(' USD', '')}
        />
        <Metric
          label="DLL restant"
          shortLabel="DLL"
          value={risk ? `${risk.dailyLoss.remaining} USD` : '—'}
          shortValue={risk ? risk.dailyLoss.remaining : '—'}
          tone={tone}
          className="hidden sm:flex"
        />
        <Metric
          label="Perte max restante"
          value={risk ? `${risk.maximumLoss.remaining} USD` : '—'}
          tone={tone}
          className="hidden xl:flex"
        />
        <Metric label="Balance" value={balanceFormatted} className="hidden 2xl:flex" />
        <Metric
          label="Objectif"
          value={risk ? `${risk.target.current} / ${risk.target.required} USD` : '—'}
          className="hidden 3xl:flex"
        />
        <Metric
          label="Consistance"
          value={
            risk?.bestDay.ratio === null || risk === null
              ? '—'
              : `${(Number(risk.bestDay.ratio) * 100).toFixed(0)} %`
          }
          tone={risk && !risk.bestDay.compliant ? 'warning' : undefined}
          className="hidden 3xl:flex"
        />
      </dl>

      {shortDuration === 'warning' || shortDuration === 'entry_locked' ? (
        <Badge variant="warning" className="shrink-0">
          {shortDuration === 'entry_locked' ? 'Ouvertures suspendues' : 'Profits < 60 s'}
        </Badge>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {risk ? (
          <TradeRiskDetail
            risk={risk}
            triggerLabel={
              <>
                <span className="hidden sm:inline">Risque</span>
                <WariXRiskIcon className="sm:hidden" />
              </>
            }
            triggerClassName="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--wariba-radius-sm)] px-1.5 py-1 text-[length:var(--wariba-font-size-label-sm)] font-medium text-[color:var(--wariba-text-secondary)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--wariba-theme-text)] lg:min-h-0 lg:min-w-0"
          />
        ) : null}

        <span
          role="status"
          aria-label={connectionLabel}
          data-testid="workstation-connection"
          data-connection={connectionOk ? 'open' : isResyncing ? 'resyncing' : 'closed'}
          className="flex items-center gap-1.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              connectionOk
                ? 'bg-[color:var(--wariba-status-success-text)]'
                : 'bg-[color:var(--wariba-status-warning-text)]'
            }`}
          />
          <span className="hidden sm:inline">{connectionLabel}</span>
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          data-testid="workstation-notifications"
          className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0"
        >
          <span aria-hidden="true" className="hidden sm:inline">
            Notifications
          </span>
          <WariXNotificationsIcon className="sm:hidden" />
          {unreadCount > 0 && (
            <Badge variant="danger" className="ml-1.5">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
});
