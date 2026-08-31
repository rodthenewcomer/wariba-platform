'use client';

import { useEffect } from 'react';

/**
 * The shell's rule for elements that float — Phase 3.4.5A.1 §19, §20.
 *
 * ## The collision this exists to end
 *
 * The mobile purchase bar is `position: fixed`, the footer is not, and neither
 * knew about the other. Scroll to the end of `/offres` on a phone and
 * `ONE 10K · 34 900 FCFA · Choisir` sits on top of the simulated-trading
 * disclosure — the one paragraph on the site that must never be obscured.
 *
 * The bar belongs to commerce and the footer to the shell, so neither can own
 * the fix. The shell can: it publishes *where the reader is* on the document
 * element, and every fixed surface decides for itself what to do about it.
 *
 * ```css
 * [data-wariba-footer='visible'] .commerce-mobile-paybar { … }
 * ```
 *
 * ## Why the footer wins
 *
 * Of the three ways out — hide the bar, pad the footer, shrink the bar — the
 * first is the only one that also improves the page. A purchase bar is for
 * while someone is choosing; by the time they have reached the legal band they
 * have stopped choosing, and a page that ends without a floating control ends
 * cleanly. Padding the footer would just move the overlap to a blank strip.
 *
 * Rendered once by the public shell. It draws nothing.
 */
export function FixedUiCoordinator() {
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;

    const root = document.documentElement;
    const observer = new IntersectionObserver(
      ([entry]) => {
        root.dataset.waribaFooter = entry?.isIntersecting ? 'visible' : 'away';
      },
      /* A small negative bottom margin so the bar retires just *before* the
         footer's first pixel arrives, rather than crossing over it. */
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    );

    observer.observe(footer);
    return () => {
      observer.disconnect();
      delete root.dataset.waribaFooter;
    };
  }, []);

  return null;
}
