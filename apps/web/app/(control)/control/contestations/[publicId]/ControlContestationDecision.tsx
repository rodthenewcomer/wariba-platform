'use client';

import { useState, useTransition } from 'react';
import { Alert, Button, Text } from '@wariba/ui';
import type { ContestationDecision } from '@wariba/application';
import { recordContestationDecisionAction, takeContestationReviewAction } from '../actions';

/**
 * The decision panel.
 *
 * ## Two outcomes, and the missing third is stated
 *
 * `Décision maintenue` and `Dossier escaladé` are what an operator may record.
 * There is no "annuler la décision", because WARIBA has no command that could
 * carry one out — `breached` is terminal in the evaluation-account state
 * machine, and offering a button that records an outcome the platform cannot
 * perform would tell a trader their account was restored when it was not.
 *
 * The panel says so in a notice rather than leaving an operator to wonder why
 * the option is missing and go looking for it in another surface. That is also
 * the honest answer to "what if the decision really was wrong": escalate, and
 * a corrective transition gets designed, audited and authorised properly.
 *
 * ## The reason is required, in both directions
 *
 * It is what the audit event carries and what the trader reads in their own
 * thread. A decision with an empty reason is refused by
 * `recordStaffAuditEvent` anyway; asking for it here means the operator finds
 * out before they have written the rest.
 */

const DECISIONS: readonly { value: ContestationDecision; label: string; help: string }[] = [
  {
    value: 'upheld',
    label: 'Décision maintenue',
    help: 'Les preuves confirment la décision. Le compte reste dans son état actuel.',
  },
  {
    value: 'requires_escalation',
    label: 'Dossier escaladé',
    help: 'Le dossier dépasse ce qu’un opérateur peut trancher seul. Aucun état financier n’est modifié.',
  },
];

export function ControlContestationDecision({
  publicId,
  canReview,
  canResolve,
  isLive,
}: {
  publicId: string;
  canReview: boolean;
  canResolve: boolean;
  isLive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState<ContestationDecision>('upheld');

  if (!isLive) {
    return (
      <Text variant="body-sm" color="secondary">
        Cette contestation est close. L’issue enregistrée est définitive et les preuves d’origine
        sont inchangées.
      </Text>
    );
  }

  if (!canReview && !canResolve) {
    return (
      <Text variant="body-sm" color="secondary">
        Lecture seule : l’examen des contestations relève des rôles risk et compliance.
      </Text>
    );
  }

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      else setReason('');
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Alert level="information" title="Aucune réversion automatique">
        Un breach enregistré ne peut pas être annulé dans cette version : la machine d’états ne
        prévoit aucune sortie de l’état <span className="wariba-data">breached</span>. Si la
        décision vous paraît erronée, escaladez le dossier — une correction administrative devra
        faire l’objet d’une transition explicite et auditée.
      </Alert>

      <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        Motif (consigné dans l’audit et visible par le trader)
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          maxLength={1000}
          data-testid="contestation-decision-reason"
          className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-3 py-2 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-primary)]"
        />
      </label>

      {canReview ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || reason.trim().length === 0}
            data-testid="contestation-take-review"
            onClick={() =>
              run(() => takeContestationReviewAction(publicId, 'under_review', reason))
            }
          >
            Prendre en examen
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || reason.trim().length === 0}
            data-testid="contestation-request-info"
            onClick={() =>
              run(() => takeContestationReviewAction(publicId, 'needs_information', reason))
            }
          >
            Demander un complément
          </Button>
        </div>
      ) : null}

      {canResolve ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Issue
            <select
              value={decision}
              onChange={(event) => setDecision(event.target.value as ContestationDecision)}
              data-testid="contestation-decision-select"
              className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-2 py-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]"
            >
              {DECISIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Text variant="body-sm" color="secondary">
            {DECISIONS.find((option) => option.value === decision)?.help}
          </Text>
          <div>
            <Button
              size="sm"
              disabled={pending || reason.trim().length === 0}
              data-testid="contestation-decision-confirm"
              onClick={() =>
                run(() => recordContestationDecisionAction(publicId, decision, reason))
              }
            >
              Enregistrer la décision
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <Text variant="body-sm" color="danger" data-testid="contestation-decision-error">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
