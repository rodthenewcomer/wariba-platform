'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { ArrowRightIcon, CheckIcon } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { checkoutHref, FAMILY_META, formatXof, xofParts } from './offer-ui';
import { trackCommerceEvent } from './commerce-analytics';

interface DecisionCardProps {
  selected: CanonicalOfferReadModel;
  familyMeta: (typeof FAMILY_META)[keyof typeof FAMILY_META];
  sandboxCheckoutAvailable: boolean;
  pathname: string;
}

const INCLUDED = [
  'Accès complet au poste de travail WariX',
  'Journal de trading et suivi de performance',
  'Règles figées à l’achat, consultables à tout moment',
  'Centre d’aide et support',
] as const;

interface LifecycleStep {
  label: string;
  /** Present only on the two steps that are an actual payment — everything
      else in the journey is a state change, not a figure. */
  value?: string;
}

function lifecycleFor(offer: CanonicalOfferReadModel): readonly LifecycleStep[] {
  const today = { label: 'Aujourd’hui', value: formatXof(offer.upfrontPrice) };
  switch (offer.productFamily) {
    case 'WARIBA_ONE':
      return [today, { label: 'Évaluation' }, { label: 'Validation' }, { label: 'Performance' }];
    case 'WARIBA_FLEX':
      return [
        today,
        { label: 'Évaluation' },
        { label: 'Réussite' },
        { label: 'Activation', value: formatXof(offer.activationPrice) },
        { label: 'Performance' },
      ];
    case 'WARIBA_INSTANT':
      return [today, { label: 'Sans évaluation' }, { label: 'Performance directement' }];
  }
}

/**
 * The right-hand Decision Card — P0 per the CRO brief: whatever the rule
 * surface on the left is doing (expanded, collapsed, mid-comparison), the
 * price and the action stay this easy to find. Price and CTA both crossfade
 * on selection change rather than snapping, and idle/hover/press states are
 * real motion, not a single `hover:scale`.
 *
 * "Votre parcours" fills the card's own black space with the one thing
 * worth putting there — the payment shape of the choice just made — rather
 * than generic benefit copy competing with the price for attention. The
 * truthful benefit list this replaced as the card's main content is still
 * here, just demoted below the CTA, where it supports the decision instead
 * of padding it out.
 */
export function DecisionCard({
  selected,
  familyMeta,
  sandboxCheckoutAvailable,
  pathname,
}: DecisionCardProps) {
  const isFlex = selected.productFamily === 'WARIBA_FLEX';
  const isInstant = selected.productFamily === 'WARIBA_INSTANT';
  const ctaLabel = `Choisir ${familyMeta.short} ${selected.sizeCode}`;
  const eyebrow = isFlex
    ? 'À régler aujourd’hui'
    : isInstant
      ? 'Sans évaluation'
      : 'Paiement unique';
  const steps = lifecycleFor(selected);

  return (
    <aside className="commerce-price-panel" aria-label="Résumé du prix">
      <div className="lg:sticky lg:top-24">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-color-ink-300)]">
          {eyebrow}
        </p>
        <div className="relative mt-2 h-[2.75rem] overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={selected.offerId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              className="absolute inset-0 font-mono text-4xl font-bold tabular-nums tracking-[-0.03em] text-[color:var(--wariba-accent-emerald)]"
            >
              {xofParts(selected.upfrontPrice).value}{' '}
              <span className="text-xl font-semibold text-[color:var(--wariba-color-ink-300)]">
                {xofParts(selected.upfrontPrice).currency}
              </span>
            </motion.p>
          </AnimatePresence>
        </div>

        {isInstant ? (
          <p className="mt-3 text-sm font-semibold text-[color:var(--wariba-color-ink-100)]">
            Performance directement
          </p>
        ) : null}

        {isFlex ? (
          <div className="mt-6 space-y-3 border-t border-[color:var(--commerce-rule)] pt-5 text-sm">
            <PriceLine
              label="À l’activation, après réussite"
              value={formatXof(selected.activationPrice)}
            />
            <PriceLine
              label="Total si vous réussissez"
              value={formatXof(selected.totalPriceIfSuccess)}
              strong
            />
            <p className="rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-accent-emerald-edge)] bg-[color:var(--wariba-accent-emerald-wash)] p-3 text-xs leading-relaxed text-[color:var(--wariba-color-ink-100)]">
              Le montant d’activation est figé aujourd’hui. Si vous ne réussissez pas l’évaluation,
              il n’est jamais prélevé.
            </p>
          </div>
        ) : null}

        <div className="mt-6 border-t border-[color:var(--commerce-rule)] pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--wariba-color-ink-300)]">
            Votre parcours
          </p>
          {/*
           * One continuous line behind every row, not a segment per row.
           * The earlier version gave each `<li>` its own `flex-1` segment
           * stretched to that row's height — reasonable in theory, but the
           * line was `--commerce-rule`, a hairline-divider grey barely
           * visible on this background, so in practice it read as never
           * reaching Performance at all. This version is one accent-
           * coloured line the full height of the list, sitting behind
           * flex-centred dots (`items-center` on each row, not a manual
           * `mt-1` guess), so every dot sits on it exactly and it provably
           * reaches the last row because it *is* the last row's height.
           */}
          <ol className="relative mt-3">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-[3px] w-px"
              style={{ background: 'var(--commerce-accent-edge)' }}
            />
            {steps.map((step) => (
              <li key={step.label} className="relative flex items-center gap-2.5 py-1.5">
                <span
                  aria-hidden="true"
                  className="relative z-10 size-1.5 shrink-0 rounded-full"
                  style={{
                    background: step.value
                      ? 'var(--commerce-accent)'
                      : 'var(--commerce-rule-strong)',
                  }}
                />
                <span className="flex flex-1 items-baseline justify-between gap-3">
                  <span
                    className={
                      step.value
                        ? 'text-sm font-semibold text-[color:var(--wariba-color-ink-50)]'
                        : 'text-sm text-[color:var(--wariba-color-ink-300)]'
                    }
                  >
                    {step.label}
                  </span>
                  {step.value ? (
                    <span className="font-mono text-sm font-bold tabular-nums text-[color:var(--wariba-accent-emerald)]">
                      {step.value}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {sandboxCheckoutAvailable ? (
          <Link
            href={checkoutHref(selected)}
            onClick={() =>
              trackCommerceEvent('commerce_checkout_started', {
                offerId: selected.offerId,
                source: pathname,
                ctaLocation: 'decision_card',
              })
            }
            className="commerce-primary-action group relative mt-2 w-full overflow-hidden active:scale-[0.985]"
          >
            {/* Idle-to-hover sweep — a light band travels left to right on hover, not a flat brightness change. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={selected.offerId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="relative inline-flex items-center gap-1.5"
              >
                {ctaLabel}
                <ArrowRightIcon
                  size="sm"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </motion.span>
            </AnimatePresence>
          </Link>
        ) : (
          <div className="mt-2">
            <button type="button" disabled className="commerce-primary-action w-full">
              Bientôt disponible
            </button>
            <p className="mt-3 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]">
              Les parcours sont consultables. Le paiement ouvrira plus tard.
            </p>
          </div>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-[color:var(--wariba-color-ink-300)]">
          Compte simulé · Règles applicables visibles avant de continuer
        </p>

        <Link
          href={familyMeta.path}
          className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[color:var(--wariba-color-cobalt-300)] transition-colors hover:text-[color:var(--wariba-color-cobalt-400)]"
        >
          En savoir plus sur ce parcours
          <ArrowRightIcon size="sm" />
        </Link>

        {/* What the fee actually buys. Only things that exist today — the
            phase forbids filling a panel with promises. Subordinate to the
            decision above it: smaller, quieter, last. */}
        <ul className="mt-6 space-y-2 border-t border-[color:var(--commerce-rule)] pt-5">
          {INCLUDED.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]"
            >
              <CheckIcon
                size="sm"
                className="mt-0.5 shrink-0 text-[color:var(--wariba-accent-emerald)]"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function PriceLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[color:var(--wariba-color-ink-300)]">{label}</span>
      <strong
        className={
          strong
            ? 'font-mono text-base font-bold tabular-nums text-[color:var(--wariba-accent-emerald)]'
            : 'font-mono font-semibold tabular-nums text-[color:var(--wariba-accent-emerald)]'
        }
      >
        {value}
      </strong>
    </div>
  );
}
