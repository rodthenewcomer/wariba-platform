'use client';

import { useState, useTransition } from 'react';
import { Button, Dialog, Text } from '@wariba/ui';
import { assignTicketToSelfAction, replyToTicketAction, resolveTicketAction } from '../actions';

/**
 * The operator's controls on a request.
 *
 * A client component rather than one `<form action>` per button, for the same
 * reason `ControlPayoutRowActions` is: resolving needs a reason dialog, and
 * every action needs a pending and error state the panel itself can show.
 *
 * ## Reply vs. request information
 *
 * Two buttons on one composer, not two composers. The difference is what the
 * request's status becomes: a plain reply leaves it `under_review` (WARIBA is
 * still working it), asking for information moves it to `waiting_for_user`
 * (the trader is now the blocker, and their own page says so in words). An
 * operator who could only "reply" would leave every request looking like
 * WARIBA's turn forever.
 *
 * ## Buttons are not the boundary
 *
 * `canAct` only decides what renders. Every action re-checks the staff role
 * and its granular permission server-side — hiding a button has never stopped
 * anyone from calling the endpoint behind it.
 */
export function ControlTicketActions({
  publicId,
  canAct,
  assignedToMe,
  isSettled,
}: {
  publicId: string;
  canAct: boolean;
  assignedToMe: boolean;
  isSettled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState<'resolved' | 'closed'>('resolved');
  const [reason, setReason] = useState('');

  if (!canAct) {
    return (
      <Text variant="body-sm" color="secondary">
        Lecture seule : votre rôle ne permet pas d’agir sur cette demande.
      </Text>
    );
  }

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
    });
  };

  const send = (requestsInformation: boolean) => {
    run(async () => {
      const result = await replyToTicketAction(publicId, body, requestsInformation);
      if (!result.error) setBody('');
      return result;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {!isSettled ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pending || assignedToMe}
              onClick={() => run(() => assignTicketToSelfAction(publicId))}
              data-testid="control-ticket-assign"
            >
              {assignedToMe ? 'Affectée à vous' : 'Prendre en charge'}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="control-reply"
              className="text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-secondary)]"
            >
              Réponse au trader
            </label>
            <textarea
              id="control-reply"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              maxLength={4000}
              data-testid="control-reply-body"
              className="min-h-32 w-full resize-y rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-3 py-2 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-primary)]"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={pending || body.trim().length === 0}
                onClick={() => send(false)}
                data-testid="control-reply-send"
              >
                Répondre
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pending || body.trim().length === 0}
                onClick={() => send(true)}
                data-testid="control-reply-request-info"
              >
                Demander une précision
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => setResolveOpen(true)}
                data-testid="control-ticket-resolve-open"
              >
                Résoudre ou clôturer
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Text variant="body-sm" color="secondary">
          Cette demande est clôturée. Aucune action n’est disponible.
        </Text>
      )}

      {error ? (
        <Text variant="body-sm" color="danger" data-testid="control-ticket-error">
          {error}
        </Text>
      ) : null}

      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} title="Clore la demande">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Issue
            <select
              value={resolution}
              onChange={(event) => setResolution(event.target.value as 'resolved' | 'closed')}
              data-testid="control-resolution-select"
              className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-2 py-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]"
            >
              <option value="resolved">Résolue — le trader peut encore répondre</option>
              <option value="closed">Clôturée — le fil est fermé</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            {/* Required, and required for a reason: this is the sentence the
                audit event carries and the one the trader reads in the thread. */}
            Motif (consigné dans l’audit et visible par le trader)
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
              data-testid="control-resolution-reason"
              className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] px-3 py-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]"
            />
          </label>
          <Button
            size="sm"
            disabled={pending || reason.trim().length === 0}
            data-testid="control-resolution-confirm"
            onClick={() =>
              run(async () => {
                const result = await resolveTicketAction(publicId, resolution, reason);
                if (!result.error) {
                  setResolveOpen(false);
                  setReason('');
                }
                return result;
              })
            }
          >
            Confirmer
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
