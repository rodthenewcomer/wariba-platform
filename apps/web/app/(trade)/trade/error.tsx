'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Alert, Button, buttonClassNames } from '@wariba/ui';

/**
 * Design System §35 / UX Architecture §42.1 — titre / résumé / action / référence.
 * Trade-specific reassurance: the server is the sole authority on positions
 * and balance (Engineering Constitution §24), so a crash in this terminal's
 * render tree never puts an open position at risk — it just means this tab
 * can't currently show it.
 */
export default function TradeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('trade.render_failed', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl p-[var(--wariba-component-trade-panel-padding)]">
      <Alert level="danger" title="Le terminal de trading n’a pas pu s’afficher">
        <p>
          Une erreur est survenue pendant le chargement de WariX. Vos positions et votre solde sont
          gérés côté serveur — cette erreur ne les affecte pas.
        </p>
        {error.digest ? (
          <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-label-sm)]">
            Référence : {error.digest}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={reset}>
            Réessayer
          </Button>
          <Link href="/hub" className={buttonClassNames({ variant: 'secondary', size: 'sm' })}>
            Voir mon compte sur le Hub
          </Link>
        </div>
      </Alert>
    </div>
  );
}
