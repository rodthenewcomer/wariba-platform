'use client';

import { useState } from 'react';
import { Alert, Button, Text } from '@wariba/ui';
import {
  identityEvidenceRequirement,
  type IdentityDecisionStatus,
} from '@wariba/application/presentation';
import { assignIdentityToSelfAction, updateIdentityAction } from '../actions';

export function IdentityReviewActions({
  publicId,
  version,
  canAssign,
  canReview,
  canDecide,
  assignedToMe,
  isLive,
}: {
  publicId: string;
  version: number;
  canAssign: boolean;
  canReview: boolean;
  canDecide: boolean;
  assignedToMe: boolean;
  isLive: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<IdentityDecisionStatus>('under_review');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [evidence, setEvidence] = useState('');
  const decision = nextStatus === 'verified' || nextStatus === 'unable_to_verify';
  const allowed = decision ? canDecide : canReview;
  /*
   * B2 — the same contract the command enforces, so the button and the server
   * cannot disagree about what a decision needs behind it. A refusal may stand
   * on a specific written reason; a verification may not.
   */
  const requirement = identityEvidenceRequirement(nextStatus);
  const evidenceMissing =
    requirement === 'required'
      ? evidence.trim().length === 0
      : requirement === 'required_or_detailed_reason'
        ? evidence.trim().length === 0 && reason.trim().length < 40
        : false;
  const run = async (action: () => Promise<{ error?: string }>) => {
    setError(null);
    setPending(true);
    try {
      const result = await action();
      if (result.error) setError(result.error);
      else window.location.reload();
    } finally {
      setPending(false);
    }
  };
  if (!isLive)
    return (
      <Text variant="body-sm" color="secondary">
        Cette vérification est terminée. Son résultat et son historique restent consultables.
      </Text>
    );
  if (!canReview && !canDecide)
    return (
      <Text variant="body-sm" color="secondary">
        Lecture seule : votre rôle ne permet pas de traiter une vérification d’identité.
      </Text>
    );
  return (
    <div className="flex flex-col gap-4">
      <Alert level="information" title="Aucun document dans WARIBA">
        Consignez uniquement une référence de preuve externe. Ne copiez ni pièce d’identité, ni
        selfie, ni donnée biométrique.
      </Alert>
      {canAssign ? (
        <div>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || assignedToMe}
            onClick={() => void run(() => assignIdentityToSelfAction(publicId, version))}
          >
            {assignedToMe ? 'Affectée à vous' : 'Prendre en charge'}
          </Button>
        </div>
      ) : null}
      <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        Action
        <select
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value as typeof nextStatus)}
          className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-2 py-1.5 text-[color:var(--wariba-text-primary)]"
        >
          <option value="under_review">Poursuivre l’examen</option>
          <option value="needs_information">Demander une information</option>
          <option value="verified">Confirmer la vérification</option>
          <option value="unable_to_verify">Vérification non aboutie</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        Motif interne de la décision
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={1000}
          className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-3 py-2 text-[color:var(--wariba-text-primary)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        Message visible par le trader
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          maxLength={1000}
          className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-3 py-2 text-[color:var(--wariba-text-primary)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        Référence de preuve externe{' '}
        {requirement === 'required'
          ? '(requise)'
          : requirement === 'required_or_detailed_reason'
            ? '(requise, ou motif détaillé)'
            : '(facultative)'}
        <input
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          maxLength={200}
          className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-3 py-2 text-[color:var(--wariba-text-primary)]"
        />
      </label>
      <div>
        <Button
          size="sm"
          disabled={
            pending ||
            !allowed ||
            reason.trim().length < 10 ||
            message.trim().length < 10 ||
            evidenceMissing
          }
          onClick={() =>
            void run(() =>
              updateIdentityAction(publicId, version, nextStatus, reason, message, evidence),
            )
          }
        >
          Enregistrer
        </Button>
      </div>
      {error ? (
        <Text variant="body-sm" color="danger" data-testid="identity-action-error">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
