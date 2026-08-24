'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { actionClassName } from '../../../../components/hub/Action';
import { replyToSupportTicketAction } from '../../actions';

/**
 * The reply box, rendered only when the request accepts one.
 *
 * A closed request shows no composer at all rather than a disabled one — a
 * greyed-out box invites the trader to work out why they cannot type, and the
 * page already says the request is closed in words.
 */
export function ReplyComposer({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await replyToSupportTicketAction(publicId, { body });
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody('');
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" data-testid="reply-composer">
      <label
        className="text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-secondary)]"
        htmlFor="support-reply"
      >
        Répondre
      </label>
      <textarea
        id="support-reply"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={4}
        maxLength={4000}
        required
        placeholder="Ajoutez une précision ou répondez à l’opérateur."
        data-testid="reply-body"
        className="min-h-28 w-full resize-y rounded-[10px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] px-3.5 py-3 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-primary)] placeholder:text-[color:var(--wariba-text-tertiary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
      />
      {error ? (
        <p
          role="alert"
          data-testid="reply-error"
          className="rounded-[10px] border border-[color:var(--wariba-accent-red-edge)] bg-[color:var(--wariba-accent-red-wash)] px-3.5 py-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-accent-red)]"
        >
          {error}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={pending}
          className={actionClassName('primary', 'md')}
          data-testid="reply-submit"
        >
          {pending ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
    </form>
  );
}
