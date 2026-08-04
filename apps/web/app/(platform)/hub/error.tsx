'use client';

import { useEffect } from 'react';
import { Alert, Button } from '@wariba/ui';

/** Design System §35 / UX Architecture §42.1 — titre / résumé / action / référence. */
export default function HubError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('hub.render_failed', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl">
      <Alert level="danger" title="Le Hub n’a pas pu s’afficher">
        <p>Une erreur est survenue pendant le chargement de votre compte. Aucune donnée n’a été modifiée.</p>
        {error.digest ? (
          <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-label-sm)]">
            Référence : {error.digest}
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
