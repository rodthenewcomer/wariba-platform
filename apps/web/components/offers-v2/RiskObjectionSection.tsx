'use client';

import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { useSelectedOffer } from './useSelectedOffer';
import { formatRate } from '../commerce/offer-ui';
import { trackCommerceEvent } from '../commerce/commerce-analytics';

interface RiskObjectionSectionProps {
  offers: readonly CanonicalOfferReadModel[];
  fallback: CanonicalOfferReadModel;
}

const FAMILY_SHORT: Record<CanonicalOfferReadModel['productFamily'], string> = {
  WARIBA_ONE: 'ONE',
  WARIBA_FLEX: 'FLEX',
  WARIBA_INSTANT: 'INSTANT',
};

/**
 * Section 07 — Risk / Rule Objection. Reflects the account currently
 * selected in the Decision Engine (via `useSelectedOffer`) rather than a
 * generic example, so the numbers a visitor sees here are the ones that
 * would actually apply to their choice.
 */
export function RiskObjectionSection({ offers, fallback }: RiskObjectionSectionProps) {
  const selected = useSelectedOffer(offers, fallback);
  const rules = selected.evaluationRules ?? selected.performanceRules;
  const target = selected.evaluationRules?.profitTargetRate;

  return (
    <section className="py-16 lg:py-20">
      <div className="commerce-shell">
        <p className="commerce-kicker">
          {FAMILY_SHORT[selected.productFamily]} · {selected.sizeCode}
        </p>
        <h2 className="commerce-section-title mt-5 max-w-2xl">
          Les limites ne devraient jamais être une surprise.
        </h2>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {target ? (
            <RiskTile label="Objectif de performance" value={formatRate(target)} tone="accent" />
          ) : null}
          <RiskTile label="Limite quotidienne" value={formatRate(rules.dailyLossRate)} />
          <RiskTile label="Perte maximale" value={formatRate(rules.maximumLossRate)} tone="amber" />
          <RiskTile label="Meilleure journée" value={formatRate(rules.bestDayMaximumRate)} />
        </div>

        <Link
          href="/aide/risque-regles"
          onClick={() =>
            trackCommerceEvent('commerce_rules_clicked', {
              offerId: selected.offerId,
              ctaLocation: 'risk',
            })
          }
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--wariba-brand-300)] transition-colors hover:text-[color:var(--wariba-brand-200)]"
        >
          Voir toutes les règles
          <ArrowRightIcon size="sm" />
        </Link>
      </div>
    </section>
  );
}

function RiskTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'accent' | 'amber';
}) {
  const valueColor =
    tone === 'accent'
      ? 'text-[color:var(--wariba-brand-300)]'
      : tone === 'amber'
        ? 'text-[color:var(--wariba-accent-amber)]'
        : 'text-[color:var(--wariba-on-dark)]';
  return (
    <div className="commerce-panel p-4">
      <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]">
        {label}
      </p>
      <p className={`mt-2 font-mono text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}
