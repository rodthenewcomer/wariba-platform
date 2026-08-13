'use client';

import { memo, type ReactNode } from 'react';
import { computeDailyLossUsedRatio } from '@wariba/domain';
import {
  Badge,
  MetricReadout,
  MetricSeam,
  WariXNotificationsIcon,
  WariXRiskIcon,
  type MetricEmphasis,
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

const DASH = '—';

/** `10 050.00 USD` → `["10 050.00", "USD"]`; a placeholder keeps no unit. */
function splitAmount(formatted: string): { value: string; unit?: string } {
  if (formatted === DASH) return { value: DASH };
  return formatted.endsWith(' USD')
    ? { value: formatted.slice(0, -4), unit: 'USD' }
    : { value: formatted };
}

/**
 * One metric. `<dt>`/`<dd>` so the value is never an unlabelled number to a
 * screen reader, and `wariba-data` so every figure stays tabular (W1 §11).
 *
 * Stacked, not inline: the WX1 bar ran label and value on one baseline at one
 * step apart, which is precisely what made eight independent facts read as a
 * single sentence. Label above, value below, and the value a full step larger
 * gives each metric its own block the eye can land on.
 */
function Metric({
  label,
  shortLabel,
  formatted,
  tone = 'default',
  emphasis = 'support',
  consumedRatio,
  className,
}: {
  label: string;
  /** Phone-width label. The full label stays in the accessible name. */
  shortLabel?: string | undefined;
  /** Server-formatted amount, ` USD` suffix included where it has one. */
  formatted: string;
  tone?: MetricTone | undefined;
  emphasis?: MetricEmphasis | undefined;
  /** 0..1, from a canonical helper. Draws the consumption rule under the figure. */
  consumedRatio?: number | undefined;
  className?: string | undefined;
}) {
  const { value, unit } = splitAmount(formatted);
  return (
    <MetricReadout
      label={label}
      value={value}
      shortValue={value}
      tone={tone}
      emphasis={emphasis}
      {...(consumedRatio === undefined ? {} : { consumedRatio })}
      {...(unit === undefined ? {} : { unit })}
      {...(shortLabel === undefined ? {} : { shortLabel })}
      {...(className === undefined ? {} : { className })}
    />
  );
}

/**
 * A run of metrics that belong to one question, held together by proximity and
 * separated from the next question by a seam.
 *
 * §6's "readable in ~3 seconds" is a grouping problem, not a size problem: the
 * eye needs to see *three* things — who, how much, how much room is left —
 * before it starts reading individual figures.
 */
function MetricGroup({
  children,
  tinted = false,
  className,
}: {
  children: ReactNode;
  /** Risk states tint their own group rather than recolouring the whole bar. */
  tinted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        'flex shrink-0 items-center gap-3 rounded-[7px] px-2 py-1 xl:gap-4',
        tinted
          ? 'bg-[color:var(--wariba-component-workstation-wash-warning)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-trading-warning)]/25'
          : '',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

/**
 * The workstation instrumentation bar (W1 §11, visual closure §6).
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
 * The visual closure adds a fourth: **the bar is grouped**. Identity, equity,
 * the two loss budgets and the programme figures are four blocks separated by
 * seams, with the equity figure carrying the only `lead` emphasis on the left
 * side. When the account is in a warning or locked risk state the budget group
 * — and only that group — takes an amber wash, so the bar reports risk by
 * colour without any of it becoming decoration.
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
  const budgetsAtRisk = tone === 'warning' || tone === 'danger';
  /*
   * Final closure §12 — the daily-loss budget shows how much of itself is gone.
   *
   * `computeDailyLossUsedRatio` is the canonical @wariba/domain helper, fed the
   * three authoritative fields the risk DTO already carries (reference, floor,
   * used) and evaluated with decimal.js. It is the *same* call
   * `deriveRiskRibbonStatus` already makes for the tone above, so the rule and
   * the colour can never disagree, and no arithmetic on money happens in this
   * browser.
   *
   * Only the daily loss gets a rule. `maximumLoss` carries `floor`, `remaining`
   * and `breached` but no `used` and no reference, so there is no canonical
   * ratio for it — and deriving one here would be exactly the invented client
   * math §12 forbids. Max loss keeps the tone escalation and nothing more.
   */
  const dailyLossConsumed = risk ? Number(computeDailyLossUsedRatio(risk.dailyLoss)) : undefined;
  const connectionLabel = connectionOk
    ? 'Connecté'
    : isResyncing
      ? 'Resynchronisation…'
      : 'Reconnexion…';
  const shortDuration = risk?.shortDurationMonitoring.status;

  return (
    <header
      data-testid="workstation-status-bar"
      className="relative z-30 flex h-[var(--wariba-component-workstation-statusbar-mobile-height)] min-w-0 shrink-0 items-stretch gap-1 overflow-visible border-b border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-1 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)] lg:h-[var(--wariba-component-workstation-statusbar-height)] lg:gap-1.5 lg:px-2"
    >
      {/* Identity carries the only copper in the bar — WARIBA's own mark on the
          account, and the reason the left edge reads as "whose desk is this"
          before any figure is read. */}
      <div className="relative flex shrink-0 items-center pl-2.5 before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-[3px] before:rounded-r-full before:bg-[color:var(--wariba-component-workstation-identity-rule)]">
        <WorkstationAccountSwitcher accounts={accounts} activeAccountId={activeAccountId} />
      </div>

      <MetricSeam className="self-center" />

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
      {/* A plain container: each `MetricReadout` carries its own `<dl>`, so the
          bar can group and seam freely without nesting inside list semantics. */}
      <div
        data-testid="workstation-metrics"
        className="flex shrink-0 items-stretch gap-1 lg:gap-1.5"
      >
        <MetricGroup>
          <Metric label="Equity" shortLabel="Eq" formatted={equityFormatted} emphasis="lead" />
        </MetricGroup>

        <MetricSeam className="hidden self-center sm:block" />

        {/* The two budgets are one question — "how much room is left" — so they
            sit inside one group with no seam between them. */}
        <MetricGroup tinted={budgetsAtRisk} className="hidden sm:flex">
          <Metric
            label="DLL restant"
            shortLabel="DLL"
            formatted={risk ? `${risk.dailyLoss.remaining} USD` : DASH}
            tone={tone}
            emphasis={budgetsAtRisk ? 'lead' : 'support'}
            consumedRatio={dailyLossConsumed}
          />
          <Metric
            label="Perte max restante"
            formatted={risk ? `${risk.maximumLoss.remaining} USD` : DASH}
            tone={tone}
            className="hidden xl:flex"
          />
        </MetricGroup>

        <MetricSeam className="hidden self-center 2xl:block" />

        <MetricGroup className="hidden 2xl:flex">
          <Metric label="Balance" formatted={balanceFormatted} />
          <Metric
            label="Objectif"
            formatted={risk ? `${risk.target.current} / ${risk.target.required} USD` : DASH}
            className="hidden 3xl:flex"
          />
          <Metric
            label="Consistance"
            formatted={
              risk?.bestDay.ratio === null || risk === null
                ? DASH
                : `${(Number(risk.bestDay.ratio) * 100).toFixed(0)} %`
            }
            tone={risk && !risk.bestDay.compliant ? 'warning' : undefined}
            className="hidden 3xl:flex"
          />
        </MetricGroup>
      </div>

      {shortDuration === 'warning' || shortDuration === 'entry_locked' ? (
        <Badge variant="warning" className="shrink-0 self-center">
          {shortDuration === 'entry_locked' ? 'Ouvertures suspendues' : 'Profits < 60 s'}
        </Badge>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1 lg:gap-1.5">
        {risk ? (
          <TradeRiskDetail
            risk={risk}
            triggerLabel={
              <>
                <span className="hidden sm:inline">Risque</span>
                <WariXRiskIcon className="sm:hidden" />
              </>
            }
            triggerClassName="flex min-h-11 min-w-11 items-center justify-center rounded-[8px] px-2 py-1 text-[length:var(--wariba-component-workstation-type-label)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-tertiary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] lg:min-h-8 lg:min-w-0"
          />
        ) : null}

        {/* A chip, not loose text: the transport state is a state, and states in
            WariX are enclosed. The dot keeps its semantic colour and the label
            keeps saying the same thing beside it — colour is never the only
            carrier. */}
        <span
          role="status"
          aria-label={connectionLabel}
          data-testid="workstation-connection"
          data-connection={connectionOk ? 'open' : isResyncing ? 'resyncing' : 'closed'}
          /* Phone widths render the connection state as a dot only, so it takes
             the same 44px key footprint as the two actions beside it — a 32px
             ringed box between two 44px glyphs was the one visibly ragged edge
             of the mobile account bar. */
          /* State by exception, the same rule the Navigator's rows follow: a
             healthy transport is a dot, and only a degraded one takes an
             enclosure. A permanently-filled chip between two bare glyphs read
             as though the connection were selected. */
          className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[8px] px-2 text-[length:var(--wariba-component-workstation-type-label)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] sm:min-h-8 sm:min-w-0 sm:justify-start ${
            connectionOk
              ? 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
              : 'bg-[color:var(--wariba-component-workstation-wash-warning)] text-[color:var(--wariba-component-workstation-trading-warning)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-trading-warning)]/35'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              connectionOk
                ? 'bg-[color:var(--wariba-component-workstation-text-financial-positive)]'
                : 'bg-[color:var(--wariba-component-workstation-trading-warning)]'
            }`}
          />
          <span className="hidden sm:inline">{connectionLabel}</span>
        </span>

        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          data-testid="workstation-notifications"
          className="relative flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[8px] px-2 text-[length:var(--wariba-component-workstation-type-label)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-tertiary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] lg:min-h-8 lg:min-w-8"
        >
          <span aria-hidden="true" className="hidden sm:inline">
            Notifications
          </span>
          <WariXNotificationsIcon className="sm:hidden" />
          {unreadCount > 0 && (
            <Badge variant="danger" className="ml-0.5">
              {unreadCount}
            </Badge>
          )}
        </button>
      </div>
    </header>
  );
});
