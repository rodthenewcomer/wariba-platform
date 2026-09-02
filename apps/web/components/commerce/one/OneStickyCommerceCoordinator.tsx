'use client';

import { useEffect } from 'react';

interface OneStickyCommerceCoordinatorProps {
  configuratorAnchor: string;
  finalCloseId: string;
}

/**
 * ONE's own fixed-UI gate, layered on top of `FixedUiCoordinator`'s
 * `data-wariba-footer` the same way that one lets every floating surface
 * read one published state instead of growing its own observer.
 *
 * The problem this fixes: the mobile purchase bar and the desktop compare
 * dock are otherwise visible from the moment the page loads — during the
 * hero, before any price context exists, competing with the hero's own
 * CTA. And once `OneFinalClose` (its own large CTA) is on screen, a second
 * floating CTA is redundant, not reassuring.
 *
 * `data-wariba-one-sticky` on `<html>`:
 *   - `pending` — before the configurator has been reached at all;
 *   - `active`  — reached (sticky once true; scrolling back up doesn't
 *                 un-reach it — this is a funnel position, not a viewport
 *                 check);
 *   - `final`   — the Final Close section is in view.
 *
 * Absent entirely on FLEX, INSTANT and `/offres` — this component only
 * mounts for ONE, so their existing always-visible-until-footer behaviour
 * (see `shell-3-4-5a.spec.ts`) is untouched.
 */
export function OneStickyCommerceCoordinator({
  configuratorAnchor,
  finalCloseId,
}: OneStickyCommerceCoordinatorProps) {
  useEffect(() => {
    const configurator = document.getElementById(configuratorAnchor);
    if (!configurator) return;

    const root = document.documentElement;
    let reachedConfigurator = false;
    let finalCloseVisible = false;

    const publish = () => {
      root.dataset.waribaOneSticky = finalCloseVisible
        ? 'final'
        : reachedConfigurator
          ? 'active'
          : 'pending';
    };

    /*
     * An instant jump — a deep link straight to `#configurer-one`, or a
     * refresh while already scrolled down — can land past the sentinel
     * before the observer's own callback has fired: the exact failure mode
     * fixed in `OfferConfigurator`'s `scrolledPastConfigurator`. Checking
     * position directly on mount, once, avoids repeating it here.
     */
    reachedConfigurator = configurator.getBoundingClientRect().top < window.innerHeight;
    publish();

    const configuratorObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reachedConfigurator = true;
          publish();
        }
      },
      { threshold: 0 },
    );
    configuratorObserver.observe(configurator);

    const finalClose = document.getElementById(finalCloseId);
    let finalCloseObserver: IntersectionObserver | undefined;
    if (finalClose) {
      const rect = finalClose.getBoundingClientRect();
      finalCloseVisible = rect.top < window.innerHeight && rect.bottom > 0;
      publish();

      finalCloseObserver = new IntersectionObserver(
        ([entry]) => {
          finalCloseVisible = entry?.isIntersecting ?? false;
          publish();
        },
        { threshold: 0 },
      );
      finalCloseObserver.observe(finalClose);
    }

    return () => {
      configuratorObserver.disconnect();
      finalCloseObserver?.disconnect();
      delete root.dataset.waribaOneSticky;
    };
  }, [configuratorAnchor, finalCloseId]);

  return null;
}
