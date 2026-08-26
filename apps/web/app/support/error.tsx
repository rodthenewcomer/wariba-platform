'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { buttonClassNames } from '@wariba/ui';
import { productCopy } from '../../lib/product-copy';
import { safeSupportReference } from '../../lib/support-reference';

/**
 * A failure on a Support page.
 *
 * `/support` lives outside `(platform)`, so it does not inherit the Hub's
 * error boundary — and it could not simply reuse it: this route renders inside
 * the marketing chrome for a visitor and inside the Hub for a trader
 * (DEC-3.2-01), and the Hub boundary paints the `--warix-*` ladder, which is
 * undefined under the marketing theme. Everything here draws semantic
 * `--wariba-*` tokens, so it is correct in either shell.
 *
 * ## What reaches the screen
 *
 * The digest, through `safeSupportReference`, and nothing else. Never
 * `error.message`: this is the *support* system, so the failure is most likely
 * to be read by someone who is already stuck, and handing them an exception
 * string helps nobody while shipping internals to the browser. The real
 * exception goes to the server log where an operator can find it by the same
 * reference the trader is holding.
 *
 * There is no "contact support" action, because that is where they already
 * are. Retrying and going back to Support are the two things that can help.
 */
export default function SupportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('support.page_failed', error);
  }, [error]);

  const reference = safeSupportReference(error.digest);

  return (
    <div
      data-testid="support-error"
      className="max-w-2xl rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-border-default)] bg-[color:var(--wariba-background-subtle)] p-6"
    >
      <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
        Cette page n’a pas pu s’afficher
      </p>
      <p className="mt-2 max-w-[56ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
        {/* The one thing a trader worries about at this moment. */}
        Aucune donnée n’a été modifiée. Vos demandes et vos contestations sont intactes.
      </p>
      {reference ? (
        <p
          data-testid="support-error-reference"
          className="wariba-data mt-3 select-all text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]"
        >
          {productCopy.system.serverError.reference(reference)}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className={buttonClassNames({ size: 'sm' })}>
          {productCopy.system.serverError.retry}
        </button>
        <Link href="/support" className={buttonClassNames({ size: 'sm', variant: 'secondary' })}>
          Retour au support
        </Link>
      </div>
    </div>
  );
}
