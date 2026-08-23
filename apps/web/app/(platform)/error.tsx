'use client';

import { useEffect } from 'react';
import { ActionLink, actionClassName } from '../../components/hub/Action';
import { HubIcon } from '../../components/hub/icons';
import { Surface } from '../../components/hub/Surface';
import { productCopy } from '../../lib/product-copy';
import { safeSupportReference } from '../../lib/support-reference';

/**
 * A failure on any Hub page, rendered inside the Hub.
 *
 * Deliberately not the full-page system state: the shell, the navigation and
 * the account context all still work, and replacing them because one page
 * failed would take away the trader's way out along with the thing that broke.
 * Every other destination stays one click away.
 *
 * The digest passes through the same guard the standalone 500 uses, so what
 * reaches the screen is an opaque correlation id and never a message, a path
 * or a stack.
 *
 * `reset()` re-renders the failed segment without a full page load, which is
 * the right first attempt for the transient failures that make up most of
 * these — a dropped connection, a read that raced a write.
 */
export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Operators need the real exception; the trader must never see it.
    console.error('hub.page_failed', error);
  }, [error]);

  const reference = safeSupportReference(error.digest);

  return (
    <div className="max-w-2xl">
      <Surface tone="red" data-testid="platform-error" className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--wariba-accent-red-wash)] text-[color:var(--wariba-accent-red)]"
          >
            <HubIcon role="warning" size={22} active />
          </span>
          <div className="min-w-0">
            <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              Cette page n’a pas pu s’afficher
            </p>
            <p className="mt-1 max-w-[56ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
              {/* Says the one thing a trader actually worries about here. */}
              Aucune donnée n’a été modifiée. Vos comptes et vos positions ne sont pas affectés.
            </p>
            {reference ? (
              <p
                data-testid="platform-error-reference"
                className="wariba-data mt-3 select-all text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]"
              >
                {productCopy.system.serverError.reference(reference)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reset} className={actionClassName('primary', 'sm')}>
            {productCopy.system.serverError.retry}
          </button>
          <ActionLink href="/hub" variant="secondary" size="sm">
            {productCopy.system.serverError.home}
          </ActionLink>
          <ActionLink href="/support" variant="ghost" size="sm">
            Contacter le support
          </ActionLink>
        </div>
      </Surface>
    </div>
  );
}
