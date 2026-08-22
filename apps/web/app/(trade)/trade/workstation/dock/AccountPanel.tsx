'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Badge, Text } from '@wariba/ui';
import type { AccountSnapshot } from '@wariba/contracts';

export interface AccountPanelProps {
  snapshot: AccountSnapshot | null;
  accountPublicId: string;
  programLabel: string;
  phaseLabel: string;
  accountStatusLabel: string;
  nominalFormatted: string;
  accountId: string;
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
        {label}
      </dt>
      <dd
        className={`wariba-data text-[length:var(--wariba-font-size-data-xs)] font-medium ${tone ?? 'text-[color:var(--wariba-theme-text)]'}`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * A compact read-only account summary for the dock (W2 §21).
 *
 * Every figure is copied straight from `AccountSnapshot` / `AccountRisk`. This
 * component performs no arithmetic — not a percentage, not a remaining budget,
 * not a ratio — because all of those are already computed server-side and a
 * second browser-side derivation would be a second answer.
 *
 * It is a workstation summary, not a dashboard: no charts, no cards, no
 * Control/admin information. Where a fuller surface exists, it links to it.
 */
export const AccountPanel = memo(function AccountPanel({
  snapshot,
  accountPublicId,
  programLabel,
  phaseLabel,
  accountStatusLabel,
  nominalFormatted,
  accountId,
}: AccountPanelProps) {
  const risk = snapshot?.risk ?? null;
  const isPerformance = snapshot?.programType === 'WARIBA_PERFORMANCE';
  const shortDuration = risk?.shortDurationMonitoring;

  return (
    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
      <section className="flex flex-col">
        <Text variant="label-sm" color="tertiary" className="mb-1">
          Compte
        </Text>
        <dl className="flex flex-col divide-y divide-[color:var(--wariba-border-subtle)]">
          <Figure label="Programme" value={`${programLabel} · ${phaseLabel}`} />
          <Figure label="Taille nominale" value={nominalFormatted} />
          <Figure label="Identifiant" value={accountPublicId} />
          <Figure label="Statut" value={accountStatusLabel} />
        </dl>
      </section>

      <section className="flex flex-col">
        <Text variant="label-sm" color="tertiary" className="mb-1">
          Soldes
        </Text>
        <dl className="flex flex-col divide-y divide-[color:var(--wariba-border-subtle)]">
          <Figure label="Solde" value={snapshot ? `${snapshot.balance} USD` : '—'} />
          <Figure label="Valeur du compte" value={snapshot ? `${snapshot.equity} USD` : '—'} />
          <Figure
            label="Solde éligible"
            value={snapshot ? `${snapshot.programEligibleBalance} USD` : '—'}
          />
        </dl>
      </section>

      <section className="flex flex-col">
        <Text variant="label-sm" color="tertiary" className="mb-1">
          Programme & risque
        </Text>
        <dl className="flex flex-col divide-y divide-[color:var(--wariba-border-subtle)]">
          <Figure
            label="Objectif"
            value={risk ? `${risk.target.current} / ${risk.target.required} USD` : '—'}
          />
          <Figure
            label="DLL restant"
            value={risk ? `${risk.dailyLoss.remaining} USD` : '—'}
            tone={
              risk?.dailyLoss.softLockTriggered
                ? 'text-[color:var(--wariba-status-danger-text)]'
                : undefined
            }
          />
          <Figure
            label="Perte max restante"
            value={risk ? `${risk.maximumLoss.remaining} USD` : '—'}
            tone={
              risk?.maximumLoss.breached
                ? 'text-[color:var(--wariba-status-danger-text)]'
                : undefined
            }
          />
          <Figure
            label="Meilleure journée"
            value={
              risk === null || risk.bestDay.ratio === null
                ? '—'
                : `${(Number(risk.bestDay.ratio) * 100).toFixed(0)} %`
            }
            tone={
              risk && !risk.bestDay.compliant
                ? 'text-[color:var(--wariba-status-warning-text)]'
                : undefined
            }
          />
        </dl>
      </section>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-3">
        {shortDuration && shortDuration.status !== 'normal' ? (
          <Badge variant="warning">
            {shortDuration.status === 'entry_locked'
              ? `Ouvertures suspendues · ${shortDuration.count24h} profits < 60 s (24 h)`
              : `${shortDuration.count24h} profits < 60 s (24 h)`}
          </Badge>
        ) : null}

        <Link
          href="/hub"
          className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-theme-action)] underline decoration-dotted underline-offset-2"
        >
          Hub
        </Link>
        <Link
          href="/comptes"
          className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-theme-action)] underline decoration-dotted underline-offset-2"
        >
          Comptes
        </Link>
        {/* W2 §16/§21 — the Payout Center's canonical home. Deep-linked to this
            account so the route does not have to guess which one the trader
            meant. Offered only where it can be used. */}
        {isPerformance ? (
          <Link
            href={`/payouts?account=${accountId}`}
            className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-theme-action)] underline decoration-dotted underline-offset-2"
          >
            Retraits
          </Link>
        ) : null}
      </div>
    </div>
  );
});
