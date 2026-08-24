'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { actionClassName } from '../../../components/hub/Action';
import { Surface } from '../../../components/hub/Surface';
import { createSupportTicketAction } from '../actions';

/**
 * The form that opens a request.
 *
 * ## The account selector is a list, never a field
 *
 * Options come from the server and contain only accounts this trader owns, so
 * naming somebody else's is not a validation failure — it is not expressible.
 * The server re-checks ownership anyway (`createSupportTicket`), because a
 * `<select>` is a suggestion to a browser, not a constraint on a request.
 *
 * ## No priority control
 *
 * Priority is an operator's triage decision. There is no field here, no grant
 * on the table and no path through the Server Action, which is why the absence
 * is a guarantee rather than an omission.
 *
 * ## Options arrive as props
 *
 * The category list and its French labels are resolved on the server and
 * handed down. A client component cannot import `@wariba/application` — it
 * pulls the database client in with it — and pre-computed props are the shape
 * every other WARIBA component takes anyway (Design System §48).
 *
 * ## No attachment control
 *
 * `SUPPORT_ATTACHMENTS = deferred`. A file picker that leads nowhere is the
 * kind of placebo this product has refused everywhere else, so there is none.
 */

export interface AccountOption {
  id: string;
  label: string;
}

export interface CategoryOption {
  value: string;
  label: string;
}

const FIELD =
  'min-h-12 w-full rounded-[10px] border border-[color:var(--warix-border-subtle)] ' +
  'bg-[color:var(--warix-surface-raised)] px-3.5 text-[length:var(--wariba-font-size-body-sm)] ' +
  'text-[color:var(--wariba-text-primary)] placeholder:text-[color:var(--wariba-text-tertiary)] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-[color:var(--wariba-border-focus)]';

const LABEL =
  'text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-secondary)]';

export function NewRequestForm({
  accounts,
  categories,
  defaultCategory,
  defaultAccountId,
}: {
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
  defaultCategory: string;
  defaultAccountId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(defaultCategory);
  const [accountId, setAccountId] = useState(defaultAccountId ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSupportTicketAction({
        category,
        accountId: accountId === '' ? null : accountId,
        subject,
        body,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/support/demandes/${result.publicId}`);
    });
  };

  return (
    <Surface className="p-5 sm:p-6">
      <form onSubmit={submit} className="flex flex-col gap-5" data-testid="new-request-form">
        <div className="flex flex-col gap-2">
          <label className={LABEL} htmlFor="support-category">
            Type de demande
          </label>
          <select
            id="support-category"
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={FIELD}
            data-testid="new-request-category"
          >
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {accounts.length > 0 ? (
          <div className="flex flex-col gap-2">
            <label className={LABEL} htmlFor="support-account">
              Compte concerné
            </label>
            <select
              id="support-account"
              name="accountId"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className={FIELD}
              data-testid="new-request-account"
            >
              <option value="">Aucun compte en particulier</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label}
                </option>
              ))}
            </select>
            <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              Rattacher un compte permet à l’opérateur de consulter directement la policy, les
              journées et les décisions enregistrées.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label className={LABEL} htmlFor="support-subject">
            Sujet
          </label>
          <input
            id="support-subject"
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={160}
            required
            placeholder="Ex. Ordre refusé sur XAUUSD ce matin"
            className={FIELD}
            data-testid="new-request-subject"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL} htmlFor="support-body">
            Votre message
          </label>
          <textarea
            id="support-body"
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            required
            rows={7}
            placeholder="Décrivez ce que vous avez fait, ce que vous attendiez, et ce qui s’est produit."
            className={`${FIELD} min-h-40 resize-y py-3 leading-relaxed`}
            data-testid="new-request-body"
          />
          <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            {body.length} / 4 000 caractères
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            data-testid="new-request-error"
            className="rounded-[10px] border border-[color:var(--wariba-accent-red-edge)] bg-[color:var(--wariba-accent-red-wash)] px-3.5 py-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-accent-red)]"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <button
            type="submit"
            disabled={pending}
            className={actionClassName('primary', 'md')}
            data-testid="new-request-submit"
          >
            {pending ? 'Envoi…' : 'Envoyer la demande'}
          </button>
          <a href="/support" className={actionClassName('ghost', 'md')}>
            Annuler
          </a>
        </div>
      </form>
    </Surface>
  );
}
