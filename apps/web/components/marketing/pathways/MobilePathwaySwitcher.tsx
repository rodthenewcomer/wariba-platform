'use client';

import { useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRightIcon, cx } from '@wariba/ui';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';

export interface MobilePathwayFamily {
  id: 'one' | 'flex' | 'instant';
  tabLabel: string;
  /** A CSS colour value — `var(--wariba-brand-300)`, a hex, etc. */
  accent: string;
  eyebrowNumber: string;
  eyebrowLabel: string;
  title: ReactNode;
  supportingCopy: string;
  /** Short truthful differentiators — omit rather than pad to a fixed count. */
  chips?: readonly string[];
  /**
   * The family's existing panel (`OneEvaluationPanel`, `FlexPaymentTimeline`,
   * `InstantAccountPanel`) rendered server-side with the same canonical
   * numbers desktop uses — this component never sees the raw offer data,
   * only the already-built result.
   */
  visual: ReactNode;
  ctaLabel: string;
  ctaHref: string;
  /** Matches the family's desktop button treatment — FLEX is the one primary CTA of the three. */
  ctaVariant: 'primary' | 'secondary';
}

export interface MobilePathwaySwitcherProps {
  families: readonly MobilePathwayFamily[];
  defaultFamilyId: MobilePathwayFamily['id'];
  className?: string;
}

/**
 * Section 04's mobile-only presentation: one active pathway at a time
 * instead of three full scenes stacked in sequence.
 *
 * A close cousin of Section 08's `SurfaceSwitcher` — same tablist pattern,
 * same `AnimatePresence mode="wait"` swap — adapted for a per-family accent
 * colour instead of one fixed brand pill, since ONE / FLEX / INSTANT need to
 * stay visually distinct (Design language: cobalt / indigo / cyan).
 *
 * `key={family.id}` on the animated panel is what makes this "actual
 * conditional rendering" rather than three panels sitting at `opacity: 0` —
 * only the selected family's subtree (including its visual, which carries
 * the heaviest markup) exists in the DOM at any moment.
 */
export function MobilePathwaySwitcher({
  families,
  defaultFamilyId,
  className,
}: MobilePathwaySwitcherProps) {
  const [selectedId, setSelectedId] = useState<MobilePathwayFamily['id']>(defaultFamilyId);
  const reduced = useHydratedReducedMotion();
  const tabsId = useId();
  const selected = families.find((family) => family.id === selectedId) ?? families[0]!;

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Choisissez votre parcours"
        className="inline-flex w-full items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1"
      >
        {families.map((family) => {
          const isSelected = family.id === selectedId;
          return (
            <button
              key={family.id}
              type="button"
              role="tab"
              id={`${tabsId}-tab-${family.id}`}
              aria-selected={isSelected}
              aria-controls={`${tabsId}-panel`}
              onClick={() => setSelectedId(family.id)}
              className={cx(
                'relative min-h-11 flex-1 rounded-full px-3 text-sm font-bold uppercase tracking-[0.04em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-brand-400)]',
                isSelected ? 'text-white' : 'text-white/45 hover:text-white/70',
              )}
            >
              {isSelected ? (
                <motion.span
                  layoutId="pathway-switcher-indicator"
                  transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: `color-mix(in srgb, ${family.accent} 65%, black)` }}
                />
              ) : null}
              <span className="relative">{family.tabLabel}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`${tabsId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-tab-${selected.id}`}
        className="relative mt-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected.id}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3">
              <span className="wariba-figure text-xs font-bold" style={{ color: selected.accent }}>
                {selected.eyebrowNumber}
              </span>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: selected.accent }}
              >
                {selected.eyebrowLabel}
              </p>
            </div>

            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.045em] text-white">
              {selected.title}
            </h3>
            <p className="mt-3 text-base leading-relaxed text-white/62">
              {selected.supportingCopy}
            </p>

            {selected.chips?.length ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {selected.chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full border border-[color:var(--wariba-brand-edge)] bg-[color:var(--wariba-brand-wash)] px-3 py-1.5 text-xs font-semibold text-white/85"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6">{selected.visual}</div>

            <Link
              href={selected.ctaHref}
              className={cx(
                'mt-6',
                selected.ctaVariant === 'primary' ? 'wariba-cta-primary' : 'wariba-cta-secondary',
              )}
            >
              {selected.ctaLabel}
              <ArrowRightIcon size="sm" />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
