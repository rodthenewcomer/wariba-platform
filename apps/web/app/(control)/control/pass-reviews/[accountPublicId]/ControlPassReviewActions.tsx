'use client';

import { useState } from 'react';
import { Alert, Button, Text } from '@wariba/ui';
import type { PassReviewOperatorStatus } from '@wariba/application';
import { recordPassReviewAction } from '../actions';

export function ControlPassReviewActions({
  accountPublicId,
  canReview,
  canEscalate,
  resultFinalized,
  version,
}: {
  accountPublicId: string;
  canReview: boolean;
  canEscalate: boolean;
  resultFinalized: boolean;
  version: number;
}) {
  const [status, setStatus] = useState<PassReviewOperatorStatus>('reviewed');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!resultFinalized) {
    return (
      <Alert level="information" title="Finalisation automatique en cours">
        Le résultat n’est pas encore finalisé. Control ne peut ni l’accélérer ni le remplacer.
      </Alert>
    );
  }
  if (!canReview && !canEscalate) {
    return (
      <Text variant="body-sm" color="secondary">
        Lecture seule : cette revue relève des rôles Risque et Conformité.
      </Text>
    );
  }

  const submit = async () => {
    setError(null);
    setPending(true);
    try {
      const result = await recordPassReviewAction(accountPublicId, status, reason, version);
      if (result.error) setError(result.error);
      else window.location.reload();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      <Alert level="information" title="Le passage est déjà finalisé">
        Cette action consigne une revue postérieure. Elle ne modifie ni le résultat, ni le compte
        Performance, ni une valeur financière.
      </Alert>
      <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        Suite opérateur
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as PassReviewOperatorStatus)}
          className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-3 py-2 text-[color:var(--wariba-text-primary)]"
          data-testid="pass-review-action-select"
        >
          {canReview ? <option value="reviewed">Marquer comme revue</option> : null}
          {canEscalate ? (
            <option value="integrity_escalated">Signaler un doute d’intégrité</option>
          ) : null}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        Motif
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Décrivez les éléments contrôlés et la suite retenue."
          className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-3 py-2 text-[color:var(--wariba-text-primary)]"
          data-testid="pass-review-action-reason"
        />
      </label>
      <div>
        <Button
          size="sm"
          disabled={pending || reason.trim().length < 10}
          onClick={() => void submit()}
          data-testid="pass-review-action-confirm"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer la revue'}
        </Button>
      </div>
      {error ? (
        <Text variant="body-sm" color="danger" data-testid="pass-review-action-error">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
