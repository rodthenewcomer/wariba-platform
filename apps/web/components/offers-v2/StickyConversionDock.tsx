'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { useSelectedOffer } from './useSelectedOffer';
import { checkoutHref, formatXof, FAMILY_META } from '../commerce/offer-ui';
import { trackCommerceEvent } from '../commerce/commerce-analytics';

interface StickyConversionDockProps {
  offers: readonly CanonicalOfferReadModel[];
  fallback: CanonicalOfferReadModel;
  sandboxCheckoutAvailable: boolean;
}

/**
 * The persistent conversion dock — desktop only.
 *
 * `OfferConfigurator` already ships an excellent mobile pay bar
 * (`.commerce-mobile-paybar`, fixed, hides near the footer) and, in Compare
 * mode, its own desktop `.commerce-compare-dock` — this component
 * deliberately does not duplicate either on small screens or while the
 * engine is still in view. It exists so a visitor convinced by section 7, 8
 * or 9 has somewhere to act on desktop too, without scrolling back up.
 *
 * Visible only once `#configurator-end` — a sentinel at the true bottom of
 * the Decision Engine's own document flow, not its `<h2>` — has scrolled
 * out of view above the viewport. It used to watch the title, which broke
 * once Compare mode's full-width matrix made the section taller than one
 * screen: the title left the viewport while the visitor was still inside
 * the section's own fixed dock, and the two showed at once.
 */
export function StickyConversionDock({
  offers,
  fallback,
  sandboxCheckoutAvailable,
}: StickyConversionDockProps) {
  const selected = useSelectedOffer(offers, fallback);
  const meta = FAMILY_META[selected.productFamily];
  const isFlex = selected.productFamily === 'WARIBA_FLEX';
  const [visible, setVisible] = useState(false);
  const seenRef = useRef(false);

  useEffect(() => {
    const target = document.getElementById('configurator-end');
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Above the viewport (scrolled past), not merely off-screen below.
        const scrolledPast = entry.boundingClientRect.top < 0 && !entry.isIntersecting;
        if (scrolledPast) seenRef.current = true;
        setVisible(seenRef.current && !entry.isIntersecting && scrolledPast);
      },
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 hidden justify-center px-6 pb-6 transition-all duration-300 lg:flex"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-6 rounded-full border border-[color:var(--commerce-rule-strong)] bg-[color:var(--wariba-canvas-elevated)] py-3 pl-6 pr-3 shadow-[0_20px_60px_-20px_rgb(0_0_0_/_70%)]">
        <div>
          <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.1em] text-[color:var(--wariba-on-dark-dim)]">
            {meta.short} · {selected.sizeCode}
          </p>
          <p className="font-mono text-base font-bold tabular-nums text-[color:var(--wariba-on-dark)]">
            {formatXof(selected.upfrontPrice)}
            {isFlex ? (
              <span className="ml-2 font-sans text-xs font-normal text-[color:var(--wariba-on-dark-dim)]">
                puis {formatXof(selected.activationPrice)} après réussite
              </span>
            ) : null}
          </p>
        </div>
        {sandboxCheckoutAvailable ? (
          <Link
            href={checkoutHref(selected)}
            onClick={() =>
              trackCommerceEvent('commerce_checkout_started', {
                offerId: selected.offerId,
                source: 'offres_sticky_dock',
              })
            }
            className="wariba-cta-primary shrink-0"
          >
            Continuer
            <ArrowRightIcon size="sm" />
          </Link>
        ) : (
          <button type="button" disabled className="wariba-cta-primary shrink-0 opacity-60">
            Bientôt
          </button>
        )}
      </div>
    </div>
  );
}
