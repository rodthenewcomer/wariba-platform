'use client';

import { Alert, Button } from '@wariba/ui';

export default function ControlError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl">
      <Alert level="danger" title="Impossible de charger cette file">
        Les données n’ont pas été affichées. Aucun dossier n’a été modifié.
      </Alert>
      <div className="mt-4">
        <Button variant="secondary" onClick={reset}>
          Réessayer
        </Button>
      </div>
    </div>
  );
}
