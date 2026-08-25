'use client';

import { useRef, useState } from 'react';
import type { ContestableDecisionOption } from '@wariba/application';
import { actionClassName } from '../../../../components/hub/Action';
import { Surface } from '../../../../components/hub/Surface';
import { openContestationAction } from '../../actions';

/**
 * Opening a contestation.
 *
 * ## The decision is chosen, not typed
 *
 * The options come from the server and are the decisions recorded against
 * *this* account for *this* trader. There is no identifier field: letting
 * someone type one would be an enumeration surface and would guarantee typos
 * in what is a formal dispute. A decision that already has a live contestation
 * is shown — with its reference — and cannot be selected, which is a clearer
 * answer than hiding it and leaving the trader wondering where it went.
 *
 * ## The evidence is shown before the box, not after
 *
 * A trader is contesting a specific calculation, so the rule, threshold,
 * observed value and time sit next to the choice. Asking someone to dispute
 * something they cannot see is how a queue fills with statements that do not
 * engage with the decision at all.
 */

const FIELD =
  'min-h-12 w-full rounded-[10px] border border-[color:var(--warix-border-subtle)] ' +
  'bg-[color:var(--warix-surface-raised)] px-3.5 text-[length:var(--wariba-font-size-body-sm)] ' +
  'text-[color:var(--wariba-text-primary)] placeholder:text-[color:var(--wariba-text-tertiary)] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-[color:var(--wariba-border-focus)]';

const LABEL =
  'text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-secondary)]';

export interface ReasonOption {
  value: string;
  label: string;
}

export function ContestationForm({
  accountId,
  decisions,
  reasons,
}: {
  accountId: string;
  decisions: readonly ContestableDecisionOption[];
  /** Resolved server-side: a client component cannot import the label maps. */
  reasons: readonly ReasonOption[];
}) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const selectable = decisions.filter((item) => item.existingContestationPublicId === null);
  const [targetId, setTargetId] = useState(selectable[0]?.targetId ?? '');
  const [reasonCategory, setReasonCategory] = useState<string>('rule_misapplied');
  const [statement, setStatement] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);

    try {
      const result = await openContestationAction({
        accountId,
        targetId,
        reasonCategory,
        traderStatement: statement,
      });
      if (result.error) {
        setError(result.error);
        inFlight.current = false;
        setPending(false);
        return;
      }
      if (!result.publicId) throw new Error('Missing contestation reference.');
      window.location.assign(`/support/contestations/${encodeURIComponent(result.publicId)}`);
    } catch {
      setError('Cette action n’a pas pu aboutir. Réessayez dans un instant.');
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <Surface className="p-5 sm:p-6">
      <form
        onSubmit={submit}
        aria-busy={pending}
        className="flex flex-col gap-5"
        data-testid="contestation-form"
      >
        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className={`${LABEL} mb-1`}>Décision contestée</legend>
          {decisions.map((decision) => {
            const locked = decision.existingContestationPublicId !== null;
            return (
              <label
                key={decision.targetId}
                data-testid="contestable-decision"
                data-locked={locked}
                className={`flex gap-3 rounded-[10px] border px-3.5 py-3 ${
                  locked
                    ? 'cursor-not-allowed border-[color:var(--warix-border-subtle)] opacity-60'
                    : 'cursor-pointer border-[color:var(--warix-border-subtle)] hover:border-[color:var(--wariba-accent-indigo-edge)]'
                } ${targetId === decision.targetId && !locked ? 'border-[color:var(--wariba-accent-indigo-edge)] bg-[color:var(--wariba-accent-indigo-wash)]' : ''}`}
              >
                <input
                  type="radio"
                  name="targetId"
                  value={decision.targetId}
                  checked={targetId === decision.targetId}
                  disabled={locked}
                  onChange={() => setTargetId(decision.targetId)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--wariba-accent-indigo)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
                    {decision.ruleLabel}
                  </span>
                  <span className="mt-1 block text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                    {decision.consequenceLabel} · {decision.occurredAtLabel}
                  </span>
                  <span className="wariba-data mt-1 block text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                    Seuil {decision.thresholdFormatted} · observé {decision.observedFormatted}
                  </span>
                  {locked ? (
                    <span className="mt-1.5 block text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-accent-amber)]">
                      Une contestation est déjà ouverte pour cette décision (
                      {decision.existingContestationPublicId}).
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label className={LABEL} htmlFor="contestation-reason">
            Motif
          </label>
          <select
            id="contestation-reason"
            value={reasonCategory}
            onChange={(event) => setReasonCategory(event.target.value)}
            className={FIELD}
            data-testid="contestation-reason"
          >
            {reasons.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL} htmlFor="contestation-statement">
            Votre explication
          </label>
          <textarea
            id="contestation-statement"
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
            rows={7}
            minLength={20}
            maxLength={4000}
            required
            placeholder="Expliquez précisément ce que vous contestez et pourquoi."
            className={`${FIELD} min-h-40 resize-y py-3 leading-relaxed`}
            data-testid="contestation-statement"
          />
          {/* Said plainly rather than discovered later. The statement is
              considered; it is not evidence, and the decision is reviewed
              against what WARIBA recorded at the time. */}
          <p className="max-w-[62ch] text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-tertiary)]">
            Votre explication est examinée par un opérateur au regard des preuves enregistrées par
            WARIBA au moment de la décision. Elle complète ces preuves, elle ne les remplace pas.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            data-testid="contestation-error"
            className="rounded-[10px] border border-[color:var(--wariba-accent-red-edge)] bg-[color:var(--wariba-accent-red-wash)] px-3.5 py-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-accent-red)]"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <button
            type="submit"
            disabled={pending || targetId === ''}
            className={actionClassName('primary', 'md')}
            data-testid="contestation-submit"
          >
            {pending ? 'Envoi…' : 'Ouvrir la contestation'}
          </button>
          <a href="/support" className={actionClassName('ghost', 'md')}>
            Annuler
          </a>
        </div>
      </form>
    </Surface>
  );
}
