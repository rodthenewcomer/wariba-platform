'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { AccountTelemetry } from '@wariba/application/presentation';
import { RiskMeter } from '../../../components/hub/RiskMeter';
import { TelemetryStrip, type TelemetryFigure } from './TelemetryStrip';
import { useAccountTelemetry } from './useAccountTelemetry';

/**
 * The figures that move, kept current.
 *
 * ## Why the server's snapshot is a prop and not a fetch
 *
 * The page is server-rendered with a complete, correct snapshot. This
 * component starts from that and only replaces it once a *newer* one arrives,
 * so the first paint is real data with no spinner, no layout shift and no
 * count-up from zero. §39's "avoid client waterfalls" is the performance
 * reading of this; the product reading is that a trading dashboard should
 * never show a trader a skeleton where their balance goes.
 *
 * ## Why "Actualisé il y a 3 s" and not "LIVE"
 *
 * §23. This polls. Calling it live would be a claim about tick-by-tick
 * currency that a four-second interval does not support, and a pulsing green
 * dot on a figure that has not changed in an hour is a lie about market
 * activity. The label states the one thing that is actually true: when this
 * was last confirmed.
 */

const REFRESH_INTERVAL_MS = 4000;

/** A relative age that stays honest as it grows. */
function ageLabel(seconds: number): string {
  if (seconds < 5) return 'à l’instant';
  if (seconds < 60) return `il y a ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.floor(minutes / 60)} h`;
}

export interface LiveTelemetryProps {
  accountId: string;
  /** The server's snapshot — always what renders until something newer lands. */
  initial: {
    balance: number;
    balanceFormatted: string;
    balanceLabel: string;
    pnlToday: number;
    pnlTodayFormatted: string;
    pnlTodayLabel: string;
    dailyRemainingFormatted: string;
    dailyBudgetFormatted: string;
    dailyRemainingPercent: number;
    maximumRemainingFormatted: string;
    maximumBudgetFormatted: string;
    maximumRemainingPercent: number;
    maximumLossFloorFormatted: string;
    binding: 'daily' | 'maximum';
    objectivePercent: number | null;
    capturedAt: string;
  };
  /** §11 — a full bar on an untested account stays neutral, not green. */
  tested: boolean;
  /** Polling is pointless on a finished account: nothing will move again. */
  live?: boolean;
  /**
   * The account is over — breached or closed.
   *
   * §10.4: a terminal account must not retain healthy praise. The risk budgets
   * are the sharpest case, because a breach on the *maximum* loss leaves the
   * *daily* budget genuinely untouched — so the engine reports 100 %, and two
   * full bars appear beside a panel reading "Terminé, 0 %". Both figures are
   * arithmetically true and the pair is a lie: it tells a trader whose account
   * just ended that they have all their room left.
   */
  terminal?: boolean;
  /**
   * The page's primary action, for narrow viewports only.
   *
   * §25: the decision must not sit below three secondary metrics. On a phone
   * the risk meters are two full-width blocks, and putting "Ouvrir WariX"
   * after them pushed the one thing the screen exists to offer past the fold
   * at 390px. On a laptop the action lives in the hero's side column instead,
   * which is why this copy is `lg:hidden` — the same responsive-duplication
   * the header's own copy of the button already uses.
   */
  mobileAction?: ReactNode;
}

export function LiveTelemetry({
  accountId,
  initial,
  tested,
  live = true,
  terminal = false,
  mobileAction,
}: LiveTelemetryProps) {
  const { telemetry, updatedAt, stale, stopped, refresh } = useAccountTelemetry(accountId, {
    intervalMs: REFRESH_INTERVAL_MS,
    enabled: live,
  });

  const current: Pick<
    AccountTelemetry,
    | 'balanceFormatted'
    | 'pnlTodayFormatted'
    | 'dailyLossRemainingFormatted'
    | 'maximumLossRemainingFormatted'
  > & {
    balance: number;
    pnlToday: number;
    dailyRemainingPercent: number;
    maximumRemainingPercent: number;
    binding: 'daily' | 'maximum';
    objectivePercent: number | null;
  } = telemetry
    ? {
        balance: Number.parseFloat(telemetry.balance),
        balanceFormatted: telemetry.balanceFormatted,
        pnlToday: Number.parseFloat(telemetry.pnlToday),
        pnlTodayFormatted: telemetry.pnlTodayFormatted,
        dailyLossRemainingFormatted: telemetry.dailyLossRemainingFormatted,
        maximumLossRemainingFormatted: telemetry.maximumLossRemainingFormatted,
        dailyRemainingPercent: telemetry.room.dailyRemainingPercent,
        maximumRemainingPercent: telemetry.room.maximumRemainingPercent,
        binding: telemetry.room.binding,
        objectivePercent: telemetry.progressPercent,
      }
    : {
        balance: initial.balance,
        balanceFormatted: initial.balanceFormatted,
        pnlToday: initial.pnlToday,
        pnlTodayFormatted: initial.pnlTodayFormatted,
        dailyLossRemainingFormatted: initial.dailyRemainingFormatted,
        maximumLossRemainingFormatted: initial.maximumRemainingFormatted,
        dailyRemainingPercent: initial.dailyRemainingPercent,
        maximumRemainingPercent: initial.maximumRemainingPercent,
        binding: initial.binding,
        objectivePercent: initial.objectivePercent,
      };

  /*
   * A terminal account keeps the figures that are still facts about it — what
   * it was worth, how far it got — and drops the two that describe room to
   * keep trading, because there is none and the budgets say otherwise.
   */
  const figures: TelemetryFigure[] = [
    {
      label: initial.pnlTodayLabel,
      value: current.pnlTodayFormatted,
      numericValue: current.pnlToday,
      signed: true,
      unit: 'USD',
    },
    ...(terminal
      ? []
      : [
          {
            label: 'Risque jour restant',
            value: current.dailyLossRemainingFormatted,
            hint: `${current.dailyRemainingPercent} % du budget`,
          },
          {
            label: 'Perte max. restante',
            value: current.maximumLossRemainingFormatted,
            hint: `${current.maximumRemainingPercent} % du budget`,
          },
        ]),
    ...(current.objectivePercent !== null
      ? [
          {
            label: 'Objectif',
            value: `${current.objectivePercent} %`,
            hint: null,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <TelemetryStrip
        balance={{
          value: current.balance,
          formatted: current.balanceFormatted,
          label: initial.balanceLabel,
        }}
        figures={figures}
      />

      {mobileAction ? <div className="lg:hidden">{mobileAction}</div> : null}

      {terminal ? (
        <p
          className="border-t border-[color:var(--warix-border-subtle)] pt-5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]"
          data-testid="terminal-risk-note"
        >
          Ce compte est terminé. Les limites de risque ne s’appliquent plus.
        </p>
      ) : (
        <div className="grid gap-x-8 gap-y-5 border-t border-[color:var(--warix-border-subtle)] pt-5 sm:grid-cols-2">
          <RiskMeter
            label="Perte quotidienne"
            remainingFormatted={current.dailyLossRemainingFormatted}
            budgetFormatted={initial.dailyBudgetFormatted}
            percent={current.dailyRemainingPercent}
            tested={tested}
            binding={current.binding === 'daily'}
          />
          <RiskMeter
            label="Perte maximale"
            remainingFormatted={current.maximumLossRemainingFormatted}
            budgetFormatted={initial.maximumBudgetFormatted}
            percent={current.maximumRemainingPercent}
            tested={tested}
            binding={current.binding === 'maximum'}
            footnote={`Plancher ${initial.maximumLossFloorFormatted}`}
          />
        </div>
      )}

      {live && !stopped ? (
        <FreshnessLabel
          updatedAt={updatedAt}
          stale={stale}
          capturedAt={initial.capturedAt}
          onRetry={refresh}
        />
      ) : null}
    </div>
  );
}

/**
 * When the figures above were last confirmed.
 *
 * Its own component so the once-a-second re-render to age the label does not
 * re-render the strip and the meters with it.
 */
function FreshnessLabel({
  updatedAt,
  stale,
  capturedAt,
  onRetry,
}: {
  updatedAt: Date | null;
  stale: boolean;
  capturedAt: string;
  onRetry: () => void;
}) {
  const reference = updatedAt ?? new Date(capturedAt);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const tick = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - reference.getTime()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [reference]);

  return (
    <p
      className="flex items-center gap-1.5 text-[length:var(--wariba-font-size-label-sm)]"
      style={{
        color: stale ? 'var(--wariba-accent-amber)' : 'var(--wariba-text-tertiary)',
      }}
      data-testid="telemetry-freshness"
      // Politely announced: a trader using a screen reader should learn that
      // the figures went stale, but not have every four-second refresh spoken.
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: stale ? 'var(--wariba-accent-amber)' : 'var(--wariba-accent-emerald)',
        }}
      />
      {stale
        ? `Données non actualisées — dernière mise à jour ${ageLabel(seconds)}`
        : `Actualisé ${ageLabel(seconds)}`}
      {/*
       * §40 — a visible way to try again. The loop retries on its own, but a
       * line that only says "stale" leaves the trader with nothing to do and
       * no way to tell a blip from a dead session.
       */}
      {stale ? (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 rounded-[4px] px-1.5 py-px font-medium underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
          data-testid="telemetry-retry"
        >
          Réessayer
        </button>
      ) : null}
    </p>
  );
}
