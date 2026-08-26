'use client';

import { useState } from 'react';
import { Alert, Button, Text } from '@wariba/ui';
import type { ContestationDecision } from '@wariba/application';
import {
  assignContestationToSelfAction,
  executeContestationReplacementAction,
  recordContestationDecisionAction,
  takeContestationReviewAction,
} from '../actions';

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
  {
    value: 'correction_required',
    label: 'Correction requise',
    help: 'WARIBA confirme une erreur. Le compte et les preuves d’origine restent inchangés.',
  },
];

export function ControlContestationDecision({
  publicId,
  canReview,
  canResolve,
  canCorrect,
  canRemediate,
  isLive,
  status,
  evidenceAvailable,
  assignedToMe,
  version,
  originalAccountPublicId,
  replacementAccountPublicId,
  replacementProgramLabel,
  replacementNominalLabel,
}: {
  publicId: string;
  canReview: boolean;
  canResolve: boolean;
  canCorrect: boolean;
  canRemediate: boolean;
  isLive: boolean;
  status: string;
  evidenceAvailable: boolean;
  assignedToMe: boolean;
  version: number;
  originalAccountPublicId: string | null;
  replacementAccountPublicId: string | null;
  replacementProgramLabel: string | null;
  replacementNominalLabel: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState<ContestationDecision>('upheld');

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    setPending(true);
    try {
      const result = await fn();
      if (result.error) setError(result.error);
      else {
        setReason('');
        window.location.reload();
      }
    } finally {
      setPending(false);
    }
  };

  if (status === 'decision_corrected') {
    return (
      <div className="flex flex-col gap-3" data-testid="contestation-remediation-completed">
        <Alert level="success" title="Correction terminée">
          Le compte de remplacement a été créé. Le compte d’origine et ses éléments enregistrés sont
          restés inchangés.
        </Alert>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Remplacement
            </dt>
            <dd className="wariba-data font-semibold">{replacementAccountPublicId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Compte d’origine — historique conservé
            </dt>
            <dd className="wariba-data">{originalAccountPublicId ?? '—'}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (status === 'finance_compliance_review') {
    return (
      <Alert level="warning" title="Examen Finance et Conformité requis">
        Une conséquence financière ou un parcours Performance empêche toute correction automatique.
        Aucun compte, crédit ou payout n’a été créé.
      </Alert>
    );
  }

  if (status === 'correction_required') {
    if (!canRemediate) {
      return (
        <Text variant="body-sm" color="secondary">
          Correction confirmée. Seuls les rôles Risque et Conformité autorisés peuvent créer le
          compte de remplacement.
        </Text>
      );
    }
    return (
      <div className="flex max-w-[720px] flex-col gap-4" data-testid="contestation-remediation">
        <Alert level="warning" title="Correction à exécuter">
          Créez un seul compte de remplacement. Cette action ne réactive pas le compte d’origine et
          ne copie aucun résultat de trading.
        </Alert>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Programme
            </dt>
            <dd className="font-semibold">{replacementProgramLabel ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Nominal
            </dt>
            <dd className="wariba-data font-semibold">{replacementNominalLabel ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              Compte d’origine
            </dt>
            <dd className="wariba-data">{originalAccountPublicId ?? '—'}</dd>
          </div>
        </dl>
        <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          Motif d’exécution
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={1000}
            className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-3 py-2 text-[color:var(--wariba-text-primary)]"
            data-testid="contestation-remediation-reason"
          />
        </label>
        <div>
          <Button
            size="sm"
            disabled={pending || reason.trim().length < 10}
            data-testid="contestation-remediation-confirm"
            onClick={() =>
              void run(() => executeContestationReplacementAction(publicId, reason, version))
            }
          >
            {pending ? 'Création…' : 'Créer le compte de remplacement'}
          </Button>
        </div>
        {error ? (
          <Text variant="body-sm" color="danger" data-testid="contestation-decision-error">
            {error}
          </Text>
        ) : null}
      </div>
    );
  }

  if (!isLive) {
    return (
      <Text variant="body-sm" color="secondary">
        Cette contestation est close. L’issue enregistrée est définitive et les preuves d’origine
        sont inchangées.
      </Text>
    );
  }

  if (!canReview && !canResolve && !canCorrect) {
    return (
      <Text variant="body-sm" color="secondary">
        Lecture seule : l’examen des contestations relève des rôles risk et compliance.
      </Text>
    );
  }

  if (!evidenceAvailable) {
    return (
      <div className="flex flex-col gap-3">
        <Alert level="warning" title="Action bloquée">
          Les preuves liées à cette contestation sont indisponibles. Rechargez les éléments avant
          toute revue ou décision.
        </Alert>
        {canReview ? (
          <div>
            <Button
              variant="secondary"
              size="sm"
              disabled={pending || assignedToMe}
              data-testid="contestation-assign"
              onClick={() => void run(() => assignContestationToSelfAction(publicId, version))}
            >
              {assignedToMe ? 'Affectée à vous' : 'Prendre en charge'}
            </Button>
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

  return (
    <div className="flex flex-col gap-4">
      <Alert level="information" title="Historique d’origine protégé">
        Une correction ne modifie jamais le compte terminé ni les éléments enregistrés. Si une
        erreur WARIBA est confirmée, la suite autorisée est un compte de remplacement distinct.
      </Alert>

      {canReview ? (
        <div>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || assignedToMe}
            data-testid="contestation-assign"
            onClick={() => void run(() => assignContestationToSelfAction(publicId, version))}
          >
            {assignedToMe ? 'Affectée à vous' : 'Prendre en charge'}
          </Button>
        </div>
      ) : null}

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
              void run(() =>
                takeContestationReviewAction(publicId, 'under_review', reason, version),
              )
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
              void run(() =>
                takeContestationReviewAction(publicId, 'needs_information', reason, version),
              )
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
              {DECISIONS.filter(
                (option) => option.value !== 'correction_required' || canCorrect,
              ).map((option) => (
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
                void run(() =>
                  recordContestationDecisionAction(publicId, decision, reason, version),
                )
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
