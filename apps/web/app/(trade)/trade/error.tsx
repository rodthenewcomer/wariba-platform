'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, WariXEmptyState, buttonClassNames } from '@wariba/ui';

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
      <WariXEmptyState
        tone="danger"
        title="WariX ne peut pas s’afficher"
        description="Une erreur est survenue pendant le chargement. Vos positions et votre solde restent gérés côté serveur et ne sont pas affectés."
        action={
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <Button variant="secondary" size="sm" onClick={reset}>
              Réessayer
            </Button>
            <Link href="/hub" className={buttonClassNames({ variant: 'secondary', size: 'sm' })}>
              Voir mon compte sur le Hub
            </Link>
            {error.digest ? (
              <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
                Référence : {error.digest}
              </span>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
