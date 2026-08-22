'use client';

import { useEffect } from 'react';
import { Alert, Button } from '@wariba/ui';
import { productCopy } from '../../../lib/product-copy';
import { safeSupportReference } from '../../../lib/support-reference';

/**
 * A failure inside the Hub, rendered inside the Hub.
 *
 * Deliberately not the full-page system state: the shell, the navigation and
 * the account context still work, and replacing all of them because one panel
 * failed would take away the trader's way out along with the thing that broke.
 *
 * The digest is passed through the same guard the standalone 500 uses, so
 * whatever the runtime hands us reaches the screen only if it is an opaque
 * correlation id — never a message, never a path.
 */
export default function HubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('hub.render_failed', error);
  }, [error]);

  const reference = safeSupportReference(error.digest);

  return (
    <div className="mx-auto max-w-3xl">
      <Alert level="danger" title="Le Hub n’a pas pu s’afficher">
        <p>
          Une erreur est survenue pendant le chargement de votre compte. Aucune donnée n’a été
          modifiée.
        </p>
        {reference ? (
          <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-label-sm)]">
            {productCopy.system.serverError.reference(reference)}
          </p>
        ) : null}
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={reset}>
            Réessayer
          </Button>
        </div>
      </Alert>
    </div>
  );
}
