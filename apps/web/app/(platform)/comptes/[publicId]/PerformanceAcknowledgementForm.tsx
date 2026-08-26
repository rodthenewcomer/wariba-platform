'use client';

import { useRef, useState } from 'react';
import { Button } from '@wariba/ui';
import { acknowledgePerformanceRulesAction } from './actions';

const GENERIC_ERROR = 'Impossible de continuer pour le moment. Réessayez.';

/**
 * The command commits first; only its returned canonical destination may
 * navigate. This deliberately avoids a Server Action redirect sharing
 * navigation ownership with the App Router.
 */
export function PerformanceAcknowledgementForm({ accountPublicId }: { accountPublicId: string }) {
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
      const result = await acknowledgePerformanceRulesAction(new FormData(event.currentTarget));
      if (result.destination) {
        window.location.assign(result.destination);
        return;
      }
      setError(result.error ?? GENERIC_ERROR);
    } catch {
      setError(GENERIC_ERROR);
    }

    inFlight.current = false;
    setPending(false);
  };

  return (
    <form
      onSubmit={submit}
      aria-busy={pending}
      className="rounded-[14px] border border-[color:var(--wariba-accent-emerald-edge)] bg-[color:var(--wariba-accent-emerald-wash)] p-5 sm:p-6"
      data-testid="performance-rules-acknowledgement"
    >
      <input type="hidden" name="accountPublicId" value={accountPublicId} />
      <label className="flex cursor-pointer items-start gap-3 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
        <input
          className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--wariba-accent-indigo)]"
          type="checkbox"
          name="acknowledged"
          value="yes"
          required
          disabled={pending}
        />
        <span>J’ai pris connaissance des règles de mon compte WARIBA Performance.</span>
      </label>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-[10px] border border-[color:var(--wariba-accent-red-edge)] bg-[color:var(--wariba-accent-red-wash)] px-3.5 py-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-accent-red)]"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="mt-5 min-h-11"
        data-testid="performance-rules-submit"
      >
        {pending ? 'Ouverture de votre compte…' : 'Continuer vers mon compte Performance'}
      </Button>
      <span className="sr-only" aria-live="polite">
        {pending ? 'Ouverture de votre compte Performance.' : ''}
      </span>
    </form>
  );
}
