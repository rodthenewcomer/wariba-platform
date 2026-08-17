'use client';

import { memo } from 'react';
import { Tooltip, WariXNotificationsIcon, WariXRiskIcon } from '@wariba/ui';
import type { AccountRisk } from '@wariba/contracts';
import type { RealtimeConnectionState } from '../../../../lib/realtime-client';
import { TradeRiskDetail } from '../TradeRiskDetail';
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
  /** The transport's own state, verbatim — this bar reports it, it never derives it. */
  connectionState: RealtimeConnectionState;
  unreadCount: number;
  onOpenNotifications: () => void;
}

const DASH = '—';

/**
 * Final closure §H — a healthy feed is a dot, not a word.
 *
 * `CONNECTÉ` was on screen permanently, which is the one condition a trader
 * never needs told: the feed working is the baseline, and a label that is always
 * true spends header width and attention on nothing. It becomes the green dot
 * alone, with the sentence moved into the accessible name and the tooltip.
 *
 * The abnormal states keep their words, in the trader's terms rather than the
 * transport's: what a trader needs is not "the socket is resyncing" but "the
 * numbers you are reading are behind". Nothing here changes when a state is
 * entered — that is the realtime client's business, unchanged — and
 * `data-connection` keeps exactly the three values it already published, so
 * every existing check still reads the same state it did before.
 */
const CONNECTION_PRESENTATION: Record<
  RealtimeConnectionState,
  { attribute: 'open' | 'resyncing' | 'closed'; label: string; text: string | null }
> = {
  open: { attribute: 'open', label: 'Flux en temps réel opérationnel', text: null },
  resyncing: { attribute: 'resyncing', label: 'Données retardées', text: 'Données retardées' },
  connecting: { attribute: 'closed', label: 'Reconnexion…', text: 'Reconnexion…' },
  closed: { attribute: 'closed', label: 'Hors ligne', text: 'Hors ligne' },
};

function amount(formatted: string): string {
  return formatted.endsWith(' USD') ? formatted.slice(0, -4) : formatted;
}

function Metric({
  label,
  value,
  title,
  className = '',
}: {
  label: string;
  value: string;
  title?: string;
  className?: string;
}) {
  const content = (
    <div className={`flex h-full shrink-0 items-center gap-2 px-2.5 ${className}`}>
      <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
        {label}
      </span>
      <span className="wariba-data whitespace-nowrap text-[11px] font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-primary)]">
        {value}
      </span>
    </div>
  );
  return title ? (
    <Tooltip label={title} side="bottom">
      {content}
    </Tooltip>
  ) : (
    content
  );
}

function Seam({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`my-2 w-px shrink-0 self-stretch bg-[color:var(--wariba-component-workstation-border-hairline)] ${className}`}
    />
  );
}

/** Compact, scan-first account instrumentation. All values remain server-authored. */
export const WorkstationStatusBar = memo(function WorkstationStatusBar({
  accounts,
  activeAccountId,
  balanceFormatted,
  equityFormatted,
  risk,
  connectionState,
  unreadCount,
  onOpenNotifications,
}: WorkstationStatusBarProps) {
  const connection = CONNECTION_PRESENTATION[connectionState];
  const healthy = connection.text === null;

  return (
    <header
      data-testid="workstation-status-bar"
      className="relative z-30 flex h-[var(--wariba-component-workstation-statusbar-mobile-height)] min-w-0 shrink-0 items-stretch overflow-visible border-b border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-1 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)] lg:h-[var(--wariba-component-workstation-statusbar-height)] lg:px-2"
    >
      <div className="relative flex shrink-0 items-center pl-1.5 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:bg-[color:var(--wariba-component-workstation-identity-rule)]">
        <WorkstationAccountSwitcher accounts={accounts} activeAccountId={activeAccountId} />
      </div>

      <Seam />
      <div data-testid="workstation-metrics" className="flex min-w-0 items-stretch">
        <Metric
          label="Solde"
          value={amount(balanceFormatted)}
          className="hidden min-[1180px]:flex"
        />
        <Seam className="hidden min-[1180px]:block" />
        <Metric label="Equity" value={amount(equityFormatted)} />
        <Seam className="hidden lg:block" />
        <Metric
          label="PMJ"
          value={risk ? amount(`${risk.dailyLoss.remaining} USD`) : DASH}
          title="PMJ — Perte maximale journalière"
          className="hidden lg:flex"
        />
        <Seam className="hidden min-[1050px]:block" />
        <Metric
          label="PM"
          value={risk ? amount(`${risk.maximumLoss.remaining} USD`) : DASH}
          title="PM — Perte maximale"
          className="hidden min-[1050px]:flex"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        {risk ? (
          <TradeRiskDetail
            risk={risk}
            triggerLabel={
              <>
                <span className="hidden xl:inline">Risque</span>
                <WariXRiskIcon className="xl:hidden" />
              </>
            }
            triggerClassName="flex h-8 min-w-8 items-center justify-center rounded-[6px] px-2 text-[10px] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-tertiary)] transition-colors hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]"
          />
        ) : null}

        <span
          role="status"
          aria-label={connection.label}
          title={connection.label}
          data-testid="workstation-connection"
          data-connection={connection.attribute}
          className={`flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-[6px] px-2 text-[10px] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] ${
            healthy
              ? 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
              : 'bg-[color:var(--wariba-component-workstation-wash-warning)] text-[color:var(--wariba-component-workstation-trading-warning)]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              healthy
                ? 'bg-[color:var(--wariba-component-workstation-text-financial-positive)]'
                : 'bg-[color:var(--wariba-component-workstation-trading-warning)]'
            }`}
          />
          {/* The exception speaks on a phone too, not only from 760 up — a
              degraded feed is precisely the state a trader must not have to
              infer from a colour. At 320 the header has no room for the word
              beside the equity, and the amber dot and wash carry it there. */}
          {connection.text !== null ? (
            <span className="hidden min-[360px]:inline">{connection.text}</span>
          ) : null}
        </span>

        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          data-testid="workstation-notifications"
          className="relative flex h-8 min-w-8 items-center justify-center rounded-[6px] px-2 text-[color:var(--wariba-component-workstation-text-tertiary)] transition-colors hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
        >
          <WariXNotificationsIcon />
          {unreadCount > 0 ? (
            <span className="wariba-data absolute right-0 top-0 min-w-3.5 rounded-full bg-[color:var(--wariba-component-workstation-trading-danger)] px-0.5 text-center text-[8px] font-bold leading-3.5 text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
});
