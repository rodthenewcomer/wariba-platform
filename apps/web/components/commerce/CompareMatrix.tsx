'use client';

import type { KeyboardEvent } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRightIcon, ChevronDownIcon } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { buildSpecs, type DisplayMode, type Spec } from './rule-specs';
import { checkoutHref, formatXof } from './offer-ui';
import { trackCommerceEvent } from './commerce-analytics';

interface CompareMatrixProps {
  familyOffers: readonly CanonicalOfferReadModel[];
  familyShort: string;
  displayMode: DisplayMode;
  selectedOfferId: string;
  onSelectSize: (offer: CanonicalOfferReadModel) => void;
  performanceExpanded: boolean;
  onTogglePerformance: () => void;
  reduced: boolean;
  sandboxCheckoutAvailable: boolean;
  pathname: string;
}

/** Only the rows that make sense side by side across five sizes — `nominal` and `entry` are implied by the column header and the active family, so they'd just repeat the same value five times. */
const COMPARABLE_PRIMARY_KEYS = new Set(['target', 'daily', 'maxloss', 'bestday']);

function rowsFor(offers: readonly CanonicalOfferReadModel[], displayMode: DisplayMode) {
  const perOffer = offers.map((offer) => buildSpecs(offer, displayMode));
  const primaryKeys = perOffer[0]!.primary
    .map((spec) => spec.key)
    .filter((key) => COMPARABLE_PRIMARY_KEYS.has(key));
  const performanceKeys = perOffer[0]!.performance.map((spec) => spec.key);

  const rowFor = (specsList: readonly Spec[][], key: string) =>
    specsList.map((specs) => specs.find((spec) => spec.key === key)!);

  return {
    primaryRows: primaryKeys.map((key) => ({
      key,
      label: perOffer[0]!.primary.find((spec) => spec.key === key)!.label,
      values: rowFor(
        perOffer.map((s) => s.primary),
        key,
      ),
    })),
    performanceRows: performanceKeys.map((key) => ({
      key,
      label: perOffer[0]!.performance.find((spec) => spec.key === key)!.label,
      values: rowFor(
        perOffer.map((s) => s.performance),
        key,
      ),
    })),
  };
}

/**
 * Size-comparison matrix — the same family's five sizes side by side,
 * reusing `buildSpecs` (the single source `RuleSurface` also reads from) so
 * a percent/amount switch or a rule change can never drift between the two
 * views. Scrolls horizontally within its own container on narrow screens
 * rather than shrinking five columns to unreadable text or letting the
 * page itself overflow.
 *
 * This is the *default* view, not a mode behind a second click: a visitor
 * lands on the full account matrix — every size, every rule, one glance —
 * with the active column boxed the way a chosen row is boxed anywhere else
 * on the site. Its own header cells double as the size selector, so there
 * is no separate row of size pills competing for the same job in this mode.
 *
 * Every column carries its own buying opportunity — a CTA row beneath the
 * rules, quiet for the four unselected sizes and full-strength for the
 * chosen one — because a comparison table that only converts through a
 * sidebar the visitor has to look away from is half a comparison table.
 * `OfferConfigurator` drops its own Decision Card in this view for exactly
 * that reason: the matrix gets the width, and buying stays inside it.
 */
export function CompareMatrix({
  familyOffers,
  familyShort,
  displayMode,
  selectedOfferId,
  onSelectSize,
  performanceExpanded,
  onTogglePerformance,
  reduced,
  sandboxCheckoutAvailable,
  pathname,
}: CompareMatrixProps) {
  const { primaryRows, performanceRows } = rowsFor(familyOffers, displayMode);

  const moveSelection = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % familyOffers.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + familyOffers.length) % familyOffers.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = familyOffers.length - 1;
        break;
      default:
        return;
    }
    const next = familyOffers[nextIndex];
    if (!next) return;
    event.preventDefault();
    onSelectSize(next);
    const headers =
      event.currentTarget.closest('tr')?.querySelectorAll<HTMLButtonElement>('[data-size-header]');
    headers?.[nextIndex]?.focus();
  };

  const cellTone = (offerId: string) =>
    offerId === selectedOfferId ? 'bg-[color:var(--commerce-accent-wash)]' : '';

  /*
   * Shared, fixed column widths for both tables below.
   *
   * Two separate `<table>`s — one for the primary rows, one (inside the
   * Performance collapse) for the rest — each sized their columns off their
   * own content by default. "Réserve de sécurité" and "Journées
   * Performance" are wider labels than "Objectif de performance" fits on
   * one line, so the two tables landed on two different label-column
   * widths and every size column below drifted out of register with the
   * one above it — the selected-column highlight visibly broke step
   * between the two tables. `table-layout: fixed` plus this one shared
   * `<colgroup>`, rendered identically in both, makes that impossible: a
   * column's width is a fact about the matrix, not about which table
   * happens to be drawing it this render.
   */
  const sizeColumnWidth = `${78 / familyOffers.length}%`;
  const columns = (
    <colgroup>
      <col style={{ width: '22%' }} />
      {familyOffers.map((offer) => (
        <col key={offer.offerId} style={{ width: sizeColumnWidth }} />
      ))}
    </colgroup>
  );

  /** Same tone language as `RuleSurface`'s pills, applied as text colour here
      instead of a pill, so the row that defines the family (`accent`) and
      the row that pays out (`emerald`) still read as distinct across five
      columns rather than five identical white numbers. */
  const valueColor = (spec: Spec) => {
    switch (spec.tone) {
      case 'accent':
        return 'var(--commerce-accent-text)';
      case 'emerald':
        return 'var(--wariba-accent-emerald)';
      case 'amber':
        return 'var(--wariba-accent-amber)';
      default:
        return 'var(--wariba-color-ink-50)';
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[640px] border-collapse text-left text-sm"
          style={{ tableLayout: 'fixed' }}
        >
          {columns}
          <thead>
            <tr className="border-b border-[color:var(--commerce-rule)]">
              <th className="py-3 pr-4 align-bottom font-semibold text-[color:var(--wariba-color-ink-300)]">
                {familyShort}
              </th>
              {familyOffers.map((offer, index) => {
                const active = offer.offerId === selectedOfferId;
                return (
                  <th key={offer.offerId} className="px-1.5 py-2 text-center align-bottom">
                    <button
                      type="button"
                      data-size-header
                      aria-pressed={active}
                      aria-label={`Sélectionner la taille ${offer.sizeCode}`}
                      onClick={() => onSelectSize(offer)}
                      onKeyDown={(event) => moveSelection(event, index)}
                      className={
                        active
                          ? 'wariba-focus-ring w-full rounded-[var(--wariba-radius-lg)] border border-[color:var(--commerce-accent-edge)] bg-[color:var(--commerce-accent-wash)] px-3 py-2.5 shadow-[0_0_0_1px_var(--commerce-accent-edge),0_12px_28px_-16px_var(--commerce-accent-glow)] transition-colors'
                          : 'wariba-focus-ring w-full rounded-[var(--wariba-radius-lg)] border border-transparent px-3 py-2.5 transition-colors hover:border-[color:var(--commerce-rule-strong)]'
                      }
                    >
                      {active ? (
                        <span
                          className="block text-[8px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: 'var(--commerce-accent-text)' }}
                        >
                          Votre choix
                        </span>
                      ) : (
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--wariba-color-ink-300)]">
                          Taille
                        </span>
                      )}
                      <span
                        className="mt-1 block text-lg font-bold tracking-[-0.02em]"
                        style={{
                          color: active
                            ? 'var(--commerce-accent-text)'
                            : 'var(--wariba-color-ink-50)',
                        }}
                      >
                        {offer.sizeCode}
                      </span>
                      <span className="mt-1 block font-mono text-xs font-bold tabular-nums text-[color:var(--wariba-accent-emerald)]">
                        {formatXof(offer.upfrontPrice)}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {primaryRows.map((row) => (
              <tr key={row.key} className="border-b border-[color:var(--commerce-rule)]">
                <td className="py-2.5 pr-4 text-[color:var(--wariba-color-ink-300)]">
                  {row.label}
                </td>
                {row.values.map((spec, index) => (
                  <td
                    key={familyOffers[index]!.offerId}
                    className={`px-3 py-2.5 text-center font-mono font-semibold tabular-nums ${cellTone(familyOffers[index]!.offerId)}`}
                    style={{ color: valueColor(spec) }}
                  >
                    {spec.value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3" />
              {familyOffers.map((offer) => {
                const active = offer.offerId === selectedOfferId;
                const label = active ? `Continuer avec ${offer.sizeCode}` : `Choisir ${offer.sizeCode}`;
                return (
                  <td key={offer.offerId} className={`px-1.5 pt-3 text-center ${cellTone(offer.offerId)}`}>
                    {sandboxCheckoutAvailable ? (
                      <Link
                        href={checkoutHref(offer)}
                        onClick={() => {
                          onSelectSize(offer);
                          trackCommerceEvent('commerce_checkout_started', {
                            offerId: offer.offerId,
                            source: pathname,
                            ctaLocation: 'compare_column',
                          });
                        }}
                        className={
                          active
                            ? 'wariba-focus-ring inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold text-white transition-[filter] hover:brightness-110'
                            : 'wariba-focus-ring inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-full border px-2 text-[11px] font-semibold transition-colors'
                        }
                        style={
                          active
                            ? { background: 'var(--commerce-accent)' }
                            : {
                                borderColor: 'var(--commerce-rule-strong)',
                                color: 'var(--wariba-color-ink-200)',
                              }
                        }
                      >
                        {label}
                        <ArrowRightIcon size="sm" className="size-3" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex min-h-9 w-full items-center justify-center rounded-full border border-[color:var(--commerce-rule)] px-2 text-[11px] font-semibold text-[color:var(--wariba-color-ink-300)]"
                      >
                        Bientôt
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 border-t border-[color:var(--commerce-rule)] pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--wariba-color-ink-200)]">
          Performance
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]">
          Ce qui s’applique une fois en Performance, pour chaque taille.
        </p>
        <button
          type="button"
          onClick={onTogglePerformance}
          aria-expanded={performanceExpanded}
          aria-controls="compare-performance-panel"
          className="wariba-focus-ring mt-3 flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-[color:var(--wariba-brand-300)] transition-colors hover:text-[color:var(--wariba-brand-200)]"
        >
          {performanceExpanded ? 'Masquer les règles Performance' : 'Voir les règles Performance'}
          <ChevronDownIcon
            size="sm"
            className={`transition-transform duration-200 ${performanceExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        <motion.div
          id="compare-performance-panel"
          initial={false}
          animate={{ height: performanceExpanded ? 'auto' : 0, opacity: performanceExpanded ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 0.24, ease: [0.2, 0, 0, 1] }}
          className="overflow-hidden"
        >
          <div className="mt-4 overflow-x-auto rounded-[var(--wariba-radius-lg)] bg-[color:var(--commerce-well)]">
            <table
              className="w-full min-w-[640px] border-collapse text-left text-sm"
              style={{ tableLayout: 'fixed' }}
            >
              {columns}
              <tbody>
                {performanceRows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-[color:var(--commerce-rule)] last:border-b-0"
                  >
                    <td className="py-2.5 pr-4 text-[color:var(--wariba-color-ink-300)]">
                      {row.label}
                    </td>
                    {row.values.map((spec, index) => (
                      <td
                        key={familyOffers[index]!.offerId}
                        className={`px-3 py-2.5 text-center font-mono font-semibold tabular-nums ${cellTone(familyOffers[index]!.offerId)}`}
                        style={{ color: valueColor(spec) }}
                        data-wrap={spec.wrap ? 'true' : undefined}
                      >
                        {spec.value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
