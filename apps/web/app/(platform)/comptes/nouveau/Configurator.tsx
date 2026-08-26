'use client';

import { useState } from 'react';
import type { OfferConfiguration } from '@wariba/application';
import { ActionLink } from '../../../../components/hub/Action';
import { StatusPill } from '../../../../components/hub/StatusPill';
import { Surface, SurfaceTitle } from '../../../../components/hub/Surface';
import { HubIcon } from '../../../../components/hub/icons';

/**
 * Choosing an account.
 *
 * ## Why this is a configurator and not a pricing grid
 *
 * Three cards side by side make a trader compare prices. A configurator makes
 * them compare *what they are agreeing to* — which for a prop account is the
 * profit target, the two loss limits and the consistency rule, all of which
 * scale with the size they pick. Those numbers change as the selection
 * changes, in the summary, where the decision is actually made.
 *
 * ## Two steps, because there are two decisions
 *
 * The prompt's template has five. WARIBA has one purchasable program and no
 * paid add-ons, so steps three and four would be a wizard pretending to ask
 * questions the product does not have. Inventing a platform picker or an
 * "options" step to fill a template is the same class of fabrication as
 * inventing a metric. The page says so rather than padding itself.
 *
 * ## Every figure comes from the published policy
 *
 * `buildOfferCatalog` reads `policy_versions.parameters_json` for the version
 * in force and multiplies it against each product's own nominal. Nothing here
 * is a literal, so the offer cannot drift away from what the risk engine will
 * enforce.
 */
export function Configurator({
  offers,
  policyVersion,
  rulesAvailable,
}: {
  offers: readonly OfferConfiguration[];
  policyVersion: string | null;
  rulesAvailable: boolean;
}) {
  const [selectedCode, setSelectedCode] = useState(
    () =>
      offers.find((offer) => offer.product.code === '25K')?.product.code ??
      offers[0]?.product.code ??
      '',
  );

  const selected = offers.find((offer) => offer.product.code === selectedCode) ?? offers[0];
  if (!selected) return null;

  return (
    /*
     * `pb-28` below `lg` reserves the sticky bar's own height (§19: the bar
     * must never hide required content). Without it the last size card sits
     * under the bar and cannot be tapped — the classic sticky-CTA bug, and
     * the one that costs the sale.
     */
    <div className="grid gap-5 pb-28 lg:grid-cols-[1fr_22rem] lg:items-start lg:pb-0">
      <div className="flex flex-col gap-5">
        {/* Step 1 — the program. One purchasable program, stated as a fact
            rather than dressed up as a choice between two. */}
        <Surface className="flex flex-col gap-4 p-5 sm:p-6">
          <SurfaceTitle>Étape 1 · Programme</SurfaceTitle>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-start gap-3 rounded-[10px] border border-[color:var(--wariba-accent-indigo-edge)] bg-[color:var(--wariba-accent-indigo-wash)] p-4">
              <span aria-hidden="true" className="mt-0.5 text-[color:var(--wariba-accent-indigo)]">
                <HubIcon role="success" size={20} active />
              </span>
              <div>
                <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                  WARIBA ONE · Évaluation
                </p>
                <p className="mt-1 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                  Atteignez l’objectif en respectant les règles pour débloquer un compte
                  Performance.
                </p>
              </div>
            </div>
            <div className="flex flex-1 items-start gap-3 rounded-[10px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] p-4 opacity-70">
              <span aria-hidden="true" className="mt-0.5 text-[color:var(--wariba-text-tertiary)]">
                <HubIcon role="shield" size={20} />
              </span>
              <div>
                <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                  WARIBA Performance
                </p>
                <p className="mt-1 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                  {/* Not sold. Earned. Saying so here prevents the obvious
                      question and the support ticket behind it. */}
                  Ne s’achète pas : il se débloque en réussissant une évaluation.
                </p>
              </div>
            </div>
          </div>
        </Surface>

        {/* Step 2 — the size. */}
        <Surface className="flex flex-col gap-4 p-5 sm:p-6">
          <SurfaceTitle>Étape 2 · Taille du compte</SurfaceTitle>
          <div
            role="radiogroup"
            aria-label="Taille du compte"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {offers.map((offer) => {
              const active = offer.product.code === selected.product.code;
              return (
                <button
                  key={offer.product.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`offer-${offer.product.code}`}
                  onClick={() => setSelectedCode(offer.product.code)}
                  className={[
                    'flex min-h-[88px] flex-col items-start justify-center gap-1 rounded-[10px] border p-4 text-left',
                    'transition-[background-color,border-color] duration-[var(--wariba-component-workstation-motion-interaction)]',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2',
                    'focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none',
                    active
                      ? 'border-[color:var(--wariba-accent-indigo)] bg-[color:var(--wariba-accent-indigo-wash)]'
                      : 'border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] hover:border-[color:var(--warix-border-strong)]',
                  ].join(' ')}
                >
                  <span className="wariba-data text-[length:var(--wariba-font-size-heading-sm)] font-bold text-[color:var(--wariba-text-primary)]">
                    {offer.nominalFormatted}
                  </span>
                  <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                    {offer.priceFormatted}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Aucune option payante, aucun module additionnel : le prix affiché est le prix final.
          </p>
        </Surface>
      </div>

      {/* The summary. Sticky on desktop so the terms stay beside the choice;
          a fixed bar on a phone so the price and the action never scroll away. */}
      <Surface
        tone="accent"
        data-testid="offer-summary"
        className="flex flex-col gap-4 p-5 sm:p-6 lg:sticky lg:top-[calc(var(--hub-header-height)+20px)]"
      >
        <SurfaceTitle>Récapitulatif</SurfaceTitle>

        <div>
          <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            WARIBA ONE · Évaluation
          </p>
          <p className="wariba-data mt-1 text-[28px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--wariba-text-primary)]">
            {selected.nominalFormatted}
          </p>
          <p className="mt-2 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            Capital simulé — nominal non détenu
          </p>
        </div>

        {rulesAvailable ? (
          <dl className="flex flex-col divide-y divide-[color:var(--warix-border-subtle)] border-y border-[color:var(--warix-border-subtle)]">
            {selected.rules.map((rule) => (
              <div key={rule.label} className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                  {rule.label}
                </dt>
                <dd className="wariba-data text-right text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
                  {rule.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          /* No published policy, so no terms. Stating that is the only honest
             option — an offer page that invents plausible rules is worse than
             one that admits the terms are unavailable. */
          <p className="rounded-[10px] border border-[color:var(--wariba-accent-amber-edge)] bg-[color:var(--wariba-accent-amber-wash)] p-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
            Les règles publiées ne sont pas disponibles pour le moment. L’achat est suspendu jusqu’à
            leur publication.
          </p>
        )}

        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
            Total
          </span>
          <span className="wariba-data text-[length:var(--wariba-font-size-heading-sm)] font-bold text-[color:var(--wariba-text-primary)]">
            {selected.priceFormatted}
          </span>
        </div>

        {rulesAvailable ? (
          <ActionLink
            href={`/checkout?product=${selected.product.code}`}
            size="lg"
            className="w-full"
            data-testid="offer-checkout"
          >
            Continuer vers le paiement
          </ActionLink>
        ) : (
          <button
            type="button"
            disabled
            className="min-h-[48px] w-full rounded-[10px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-tertiary)]"
          >
            Achat indisponible
          </button>
        )}

        <div className="flex items-center justify-between gap-2">
          <StatusPill tone="neutral" size="sm">
            Trading simulé
          </StatusPill>
          {policyVersion ? (
            <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              Règles {policyVersion}
            </span>
          ) : null}
        </div>
      </Surface>

      {/*
       * The decision, kept in reach on a phone — §19.
       *
       * The summary card is the third thing on the page at 390px: below the
       * programme step and below five size cards. A trader who has just tapped
       * "25 000 USD" has to scroll past everything they already decided to
       * find the button, and the price they are agreeing to is off-screen
       * while they do it. The bar carries both, so the figure and the action
       * stay together wherever the page is scrolled to.
       *
       * It sits above the 70px bottom navigation rather than over it, so the
       * two never fight, and it repeats no information the summary does not
       * already own — same `selected`, same formatting, one source.
       */}
      {rulesAvailable ? (
        <div
          className="fixed inset-x-0 bottom-[70px] z-30 border-t border-[color:var(--warix-border-subtle)] bg-[color:color-mix(in_srgb,var(--warix-panel)_96%,transparent)] px-4 py-3 backdrop-blur-[12px] lg:hidden"
          data-testid="configurator-sticky-cta"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                {selected.nominalFormatted}
              </p>
              <p className="wariba-data truncate text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                {selected.priceFormatted}
              </p>
            </div>
            <ActionLink
              href={`/checkout?product=${selected.product.code}`}
              size="md"
              data-testid="offer-checkout-sticky"
            >
              Continuer
            </ActionLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
