'use client';

import { useRef, useState } from 'react';
import { Button } from '@wariba/ui';
import { requestIdentityReviewAction } from './actions';

const GENERIC_ERROR = 'Impossible d’envoyer la demande pour le moment. Réessayez.';

export function IdentityReviewRequestForm({ accountId }: { accountId: string }) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);

    try {
      const result = await requestIdentityReviewAction(new FormData(event.currentTarget));
      window.location.assign(result.destination);
      return;
    } catch {
      setError(GENERIC_ERROR);
    }

    inFlight.current = false;
    setPending(false);
  };

  return (
    <form onSubmit={submit} aria-busy={pending}>
      <input type="hidden" name="accountId" value={accountId} />
      <Button type="submit" size="sm" disabled={pending} data-testid="kyc-action">
        {pending ? 'Envoi de la demande…' : 'Demander ma vérification'}
      </Button>
      {error ? (
        <p
          role="alert"
          className="mt-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-accent-red)]"
        >
          {error}
        </p>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {pending ? 'Envoi de votre demande de vérification.' : ''}
      </span>
    </form>
  );
}
