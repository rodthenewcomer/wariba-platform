'use client';

import { memo, useEffect, useRef, useState } from 'react';
import {
  Tooltip,
  WariXMarketFeedIcon,
  WariXNotificationsIcon,
  WariXRiskIcon,
  type MarketFeedState,
} from '@wariba/ui';
import type { AccountRisk } from '@wariba/contracts';
import type { RealtimeConnectionState } from '../../../../lib/realtime-client';
import { TradeRiskDetail } from '../TradeRiskDetail';
import { deriveRiskRibbonStatus } from '../risk-status';
import { flashToneFor, parseFormattedNumber, useValueFlash } from '../use-value-flash';
import {
  WorkstationAccountSwitcher,
  type WorkstationAccountOption,
} from './WorkstationAccountSwitcher';

export interface WorkstationStatusBarProps {
  accounts: readonly WorkstationAccountOption[];
  activeAccountId: string;
  balanceFormatted: string;
  equityFormatted: string;
  /**
   * Unrealised P&L across open positions, formatted with its sign.
   *
   * The server derives this the same way at its own DTO boundary
   * (`equity − balance`, snapshot.ts), so this is that identity rendered, not a
   * second definition of open P&L. Null before the first snapshot arrives.
   */
  openPnlFormatted: string | null;
  risk: AccountRisk | null;
  /** The transport's own state, verbatim — this bar reports it, it never derives it. */
  connectionState: RealtimeConnectionState;
  unreadCount: number;
  onOpenNotifications: () => void;
}

const DASH = '—';

function amount(formatted: string): string {
  return formatted.endsWith(' USD') ? formatted.slice(0, -4) : formatted;
}

/**
 * VX1 §8 — what a metric surface says about itself before it is read.
 *
 * `neutral` is the account's own arithmetic: balance and equity are facts, and
 * facts sit on graphite. `risk` takes its tone from the canonical risk status,
 * so PMJ and PM are quiet while there is room and warm only when the
 * authoritative state says the trader is close. `pnl` is the one metric whose
 * meaning is its sign, so it carries emerald or coral permanently.
 */
type MetricTone = 'neutral' | 'attention' | 'critical' | 'positive' | 'negative';

const METRIC_TONE_CLASS: Record<MetricTone, string> = {
  neutral: 'text-[color:var(--wariba-component-workstation-text-primary)]',
  attention: 'text-[color:var(--wariba-component-workstation-trading-warning)]',
  critical: 'text-[color:var(--wariba-component-workstation-trading-sell)]',
  positive: 'text-[color:var(--wariba-component-workstation-text-financial-positive)]',
  negative: 'text-[color:var(--wariba-component-workstation-text-financial-negative)]',
};

const METRIC_SURFACE_CLASS: Record<MetricTone, string> = {
  neutral: '',
  attention: 'bg-[color:var(--wariba-component-workstation-wash-warning)]',
  critical: 'bg-[color:var(--wariba-component-workstation-wash-sell)]',
  positive: 'bg-[color:var(--wariba-component-workstation-wash-buy)]',
  negative: 'bg-[color:var(--wariba-component-workstation-wash-sell)]',
};

/**
 * VX1-A.1 §2/§3 — the flash a metric may wear.
 *
 * Directional, but never contradicting the figure's own sign (see
 * `flashToneFor`), and always transient: a metric returns to its resting
 * surface when the beat ends. Equity's resting surface is graphite, which is
 * what §3 means by settling neutral — it is financial data, and only PMJ/PM own
 * a persistent risk colour.
 */
const FLASH_CLASS = {
  positive:
    'bg-[color:var(--wariba-component-workstation-flash-positive)] motion-reduce:bg-transparent',
  negative:
    'bg-[color:var(--wariba-component-workstation-flash-negative)] motion-reduce:bg-transparent',
  neutral:
    'bg-[color:var(--wariba-component-workstation-wash-neutral)] motion-reduce:bg-transparent',
} as const;

/**
 * One metric: a micro-caps label and, a full step above it in weight, the
 * figure (VX1 §6).
 *
 * The figure is tabular and its cell never resizes with the digits, so a live
 * equity cannot shove PMJ sideways twice a second. When it changes it washes
 * mint or coral for a beat — the same `useValueFlash` the chart chips use, so
 * the header and the plot agree about what "it moved" looks like.
 */
function Metric({
  label,
  value,
  title,
  tone = 'neutral',
  live = false,
  className = '',
  testId,
}: {
  label: string;
  value: string;
  title?: string;
  tone?: MetricTone;
  live?: boolean;
  className?: string;
  testId?: string;
}) {
  const direction = useValueFlash(value);
  const flashTone = flashToneFor(direction, parseFormattedNumber(value));
  const flashing = live && direction !== null;
  const content = (
    <div
      data-testid={testId}
      data-metric-tone={tone}
      // The harness reads this to photograph a *settled* strip: an evidence shot
      // caught mid-flash shows a transient, not the resting design.
      data-flash={flashing ? flashTone : 'none'}
      className={`flex h-full shrink-0 items-center gap-1.5 rounded-[6px] px-2 transition-[background-color] duration-[var(--wariba-component-workstation-motion-standard)] motion-reduce:transition-none ${
        flashing ? FLASH_CLASS[flashTone] : METRIC_SURFACE_CLASS[tone]
      } ${className}`}
    >
      <span className="whitespace-nowrap text-[9px] font-semibold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
        {label}
      </span>
      <span
        key={value}
        className={`wariba-data whitespace-nowrap text-[length:var(--wariba-component-workstation-type-data-strong)] font-bold leading-none tabular-nums ${
          live
            ? 'motion-safe:animate-[wariba-value-roll_var(--wariba-component-workstation-motion-micro)_var(--wariba-component-workstation-ease-move)]'
            : ''
        } ${METRIC_TONE_CLASS[tone]}`}
      >
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

/**
 * The feed's state, in the global header — VX1-C.1 §3/§4.
 *
 * **The whole readout is one icon.** `CONNECTÉ` went first, because a label
 * that is always true spends header width on nothing. `Hors ligne` and
 * `Reconnexion…` followed, for a subtler reason: the chart already states, in
 * its own plot, that it cannot draw — so a degraded feed was being announced by
 * the header *and* by the chart *and*, on a phone, by a second chart chip, three
 * sentences for one fact. The header now carries the signal glyph and its
 * colour; the one sentence lives where the missing data actually is.
 *
 * `label` is the full sentence and never disappears: it is the tooltip and the
 * accessible name at every state, which is what keeps this legible to a screen
 * reader and to a trader who hovers. `data-connection` keeps exactly the three
 * values it has always published, so every existing check still reads the same
 * state it did before.
 */
const CONNECTION_PRESENTATION: Record<
  RealtimeConnectionState,
  {
    attribute: 'open' | 'resyncing' | 'closed';
    /** Tooltip and accessible name. The only place the words survive. */
    label: string;
    /** VX1-C.1 §3 — how many bars of the feed signal are lit. */
    feed: MarketFeedState;
  }
> = {
  open: { attribute: 'open', label: 'Flux de marché opérationnel', feed: 'healthy' },
  resyncing: { attribute: 'resyncing', label: 'Données retardées', feed: 'degraded' },
  connecting: { attribute: 'closed', label: 'Reconnexion au flux…', feed: 'degraded' },
  closed: { attribute: 'closed', label: 'Flux hors ligne', feed: 'offline' },
};

/**
 * VX1 §28 — PMJ and PM take their colour from the risk state, never from a
 * threshold invented here.
 *
 * `deriveRiskRibbonStatus` is WariX's one derivation of "how close is this
 * account", already used by the risk ribbon: soft-lock and hard-breach come
 * from authoritative flags, attention and near-limit from the domain's own
 * `computeDailyLossUsedRatio`. This maps that status onto the two metrics'
 * tone and nothing else — no gate, no rule, no new number.
 */
function riskToneFor(risk: AccountRisk | null): MetricTone {
  const status = deriveRiskRibbonStatus({ risk, isStale: false, isResyncing: false });
  if (status === 'hard-breach' || status === 'soft-lock') return 'critical';
  if (status === 'near-limit') return 'attention';
  return 'neutral';
}

/** Compact, scan-first account instrumentation. All values remain server-authored. */
export const WorkstationStatusBar = memo(function WorkstationStatusBar({
  accounts,
  activeAccountId,
  balanceFormatted,
  equityFormatted,
  openPnlFormatted,
  risk,
  connectionState,
  unreadCount,
  onOpenNotifications,
}: WorkstationStatusBarProps) {
  const connection = CONNECTION_PRESENTATION[connectionState];
  const healthy = connection.feed === 'healthy';

  /*
   * VX1-C §12 — "Flux rétabli", once, when the feed comes back.
   *
   * A trader who watched the header go amber deserves to be told it is over;
   * a trader who never saw it degrade should not be told anything. So the line
   * appears only on a genuine transition out of an abnormal state, holds for two
   * seconds and leaves the dot on its own again.
   */
  const [recovered, setRecovered] = useState(false);
  // A *first* connection is not a recovery. Every session starts at
  // `connecting` and reaches `open` a moment later, and announcing "Flux
  // rétabli" on every page load would make the one message that matters — the
  // feed came back — the message a trader learns to ignore.
  const hasBeenOpen = useRef(false);
  useEffect(() => {
    if (connectionState !== 'open') return;
    const isRecovery = hasBeenOpen.current;
    hasBeenOpen.current = true;
    if (!isRecovery) return;
    setRecovered(true);
    const timer = setTimeout(() => setRecovered(false), 2_000);
    return () => clearTimeout(timer);
  }, [connectionState]);
  const riskTone = riskToneFor(risk);
  const openPnlValue = openPnlFormatted
    ? Number(openPnlFormatted.replace(/−/g, '-').replace(/[^0-9.-]/g, ''))
    : null;
  const openPnlTone: MetricTone =
    openPnlValue === null || openPnlValue === 0
      ? 'neutral'
      : openPnlValue > 0
        ? 'positive'
        : 'negative';

  return (
    <header
      data-testid="workstation-status-bar"
      className="relative z-30 flex h-[var(--wariba-component-workstation-statusbar-mobile-height)] min-w-0 shrink-0 items-stretch gap-0.5 overflow-visible border-b border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-1 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light),0_1px_0_0_rgba(5,7,12,0.6)] lg:h-[var(--wariba-component-workstation-statusbar-height)] lg:px-2"
    >
      <div className="relative flex shrink-0 items-center pl-1.5 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-[color:var(--wariba-component-workstation-identity-rule)]">
        <WorkstationAccountSwitcher accounts={accounts} activeAccountId={activeAccountId} />
      </div>

      <Seam />
      {/*
       * VX1 §8 — responsive priority, one row.
       *
       * The order is what a trader loses last: equity is the number the account
       * lives by and never drops; open P&L is the reason equity moved and holds
       * to the hybrid band; the balance it is measured against and the two loss
       * budgets fall away as the window narrows, in that order. Everything that
       * leaves the strip is still one press away in the risk detail and the
       * Account tab — nothing is only here.
       */}
      <div data-testid="workstation-metrics" className="flex min-w-0 items-stretch gap-0.5">
        <Metric
          label="Solde"
          value={amount(balanceFormatted)}
          className="hidden min-[1180px]:flex"
          testId="metric-balance"
        />
        <Metric label="Valeur" value={amount(equityFormatted)} live testId="metric-equity" />
        {/*
         * VX1-C.2 §1 — "latent", not "ouvert".
         *
         * The figure and its derivation are untouched: this is still the
         * server's own equity − balance, the same number under a name that says
         * what it is. "P&L ouvert" was a literal reading of *open* P&L, and it
         * left the word OUVERT sitting permanently in the header of a product
         * that had just spent a whole pass removing it as a status — so a
         * trader scanning the strip met the word again and had to decide, each
         * time, that this one meant something else. "Latent" is also the term
         * the market itself uses for unrealised result.
         */}
        <Metric
          label="P&L latent"
          value={openPnlFormatted ?? DASH}
          title="Profit / perte non réalisé"
          tone={openPnlTone}
          live
          className="hidden min-[1100px]:flex"
          testId="metric-open-pnl"
        />
        <Seam className="hidden lg:block" />
        <Metric
          label="PMJ"
          value={risk ? amount(`${risk.dailyLoss.remaining} USD`) : DASH}
          title="PMJ — Perte maximale journalière"
          tone={riskTone}
          className="hidden lg:flex"
          testId="metric-pmj"
        />
        <Metric
          label="PM"
          value={risk ? amount(`${risk.maximumLoss.remaining} USD`) : DASH}
          title="PM — Perte maximale"
          tone={riskTone === 'critical' ? 'critical' : 'neutral'}
          className="hidden min-[1050px]:flex"
          testId="metric-pm"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        {/*
         * VX1 §9 — the risk control appears as a control, and says something
         * only when there is something to say. Its glyph carries the state's
         * tone, so a healthy account shows a quiet icon rather than the word
         * RISQUE printed permanently beside a number that is already on screen.
         */}
        {risk ? (
          <TradeRiskDetail
            risk={risk}
            triggerLabel={<WariXRiskIcon />}
            triggerClassName={`flex h-7 w-7 items-center justify-center rounded-[6px] transition-[background-color,color] duration-[var(--wariba-component-workstation-motion-quick)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] ${
              riskTone === 'critical'
                ? 'bg-[color:var(--wariba-component-workstation-wash-sell)] text-[color:var(--wariba-component-workstation-trading-sell)]'
                : riskTone === 'attention'
                  ? 'bg-[color:var(--wariba-component-workstation-wash-warning)] text-[color:var(--wariba-component-workstation-trading-warning)]'
                  : 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
            }`}
          />
        ) : null}

        <span
          role="status"
          aria-label={connection.label}
          title={connection.label}
          data-testid="workstation-connection"
          data-connection={connection.attribute}
          data-recovered={recovered ? 'true' : 'false'}
          className={`flex h-7 min-w-7 items-center justify-center gap-1.5 rounded-[var(--wariba-component-workstation-radius-control)] px-2 text-[10px] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] transition-[background-color,color] duration-[var(--wariba-component-workstation-motion-standard)] ${
            healthy
              ? // §3/§14 — a healthy feed is mint, and says nothing. The colour
                // is the whole message, which is why no word ever returns; a
                // recovery adds a short pulse on top of it and nothing else.
                `text-[color:var(--wariba-component-workstation-text-financial-positive)] ${
                  recovered
                    ? 'motion-safe:animate-[wariba-feed-recovered_var(--wariba-component-workstation-motion-feedback)_var(--wariba-component-workstation-ease-settle)_2]'
                    : ''
                }`
              : connectionState === 'closed'
                ? 'bg-[color:var(--wariba-component-workstation-wash-sell)] text-[color:var(--wariba-component-workstation-trading-sell)]'
                : 'bg-[color:var(--wariba-component-workstation-wash-warning)] text-[color:var(--wariba-component-workstation-trading-warning)]'
          }`}
        >
          {/*
           * VX1-C.1 §3 — the feed's own signal, not a dot.
           *
           * Three ascending bars carry the state in how many are lit, so a
           * healthy feed needs no word beside it and a degraded one is legible
           * before its label is read. §13 still holds: only the reconnecting
           * state breathes, and only in opacity — healthy and offline are
           * static, because an indicator that pulses forever stops being read.
           */}
          <span
            aria-hidden="true"
            className={
              healthy || connectionState === 'closed'
                ? ''
                : 'motion-safe:animate-[wariba-status-breathe_1.5s_ease-in-out_infinite]'
            }
          >
            <WariXMarketFeedIcon state={connection.feed} size="rail" />
          </span>
          {/*
           * VX1-D.1 §14 — recovery is animated, never written.
           *
           * "Flux rétabli" was the last healthy-state word in the header, and
           * it was still one: it appeared beside the glyph, pushed the layout,
           * and repeated in text what the glyph had already said by turning
           * mint. The transition is now carried entirely by the glyph — a brief
           * stronger pulse on the bars, then back to the ambient sweep — and by
           * the live region below, which is what a screen reader needs and a
           * sighted trader does not.
           *
           * The header therefore has no state word left at all, at any state.
           */}
          <span aria-live="polite" className="sr-only">
            {recovered ? 'Flux de marché rétabli' : ''}
          </span>
        </span>

        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          data-testid="workstation-notifications"
          className="relative flex h-7 w-7 items-center justify-center rounded-[6px] text-[color:var(--wariba-component-workstation-text-tertiary)] transition-[background-color,color] duration-[var(--wariba-component-workstation-motion-quick)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
        >
          <WariXNotificationsIcon />
          {unreadCount > 0 ? (
            <span className="wariba-data absolute right-0 top-0 min-w-3.5 rounded-full bg-[color:var(--wariba-component-workstation-trading-danger)] px-0.5 text-center text-[8px] font-bold leading-3.5 text-white motion-safe:animate-[wariba-badge-pop_var(--wariba-component-workstation-motion-standard)_var(--wariba-component-workstation-ease-settle)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
});
