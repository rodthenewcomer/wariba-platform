'use client';

import { useState, useTransition } from 'react';
import { Button, Dialog, Input, Text } from '@wariba/ui';
import {
  approvePayoutAction,
  rejectPayoutAction,
  settlePayoutAction,
  submitPayoutAction,
  reversePayoutAction,
  setKycVerifiedAction,
  setPayoutMethodConfiguredAction,
} from './actions';

export interface ControlPayoutRowActionsProps {
  payoutRequestId: string;
  accountId: string;
  canApproveOrReject: boolean;
  canSubmit: boolean;
  canSettle: boolean;
  canReverse: boolean;
  kycVerified: boolean;
  payoutMethodConfigured: boolean;
  staffCanReviewFinance: boolean;
  staffCanManageCompliance: boolean;
  reversalReason: string | null;
}

/**
 * Prompt 08 Phase G — per-row staff actions for the payout review queue.
 * A client component (not a plain <form action={...}> per button) because
 * reject needs an intermediate reason dialog and every action needs a
 * pending/error state the row itself can show — the same reasoning
 * TradeClient.tsx's own dialogs (CloseAllDialog etc.) already follow.
 */
export function ControlPayoutRowActions({
  payoutRequestId,
  accountId,
  canApproveOrReject,
  canSubmit,
  canSettle,
  canReverse,
  kycVerified,
  payoutMethodConfigured,
  staffCanReviewFinance,
  staffCanManageCompliance,
  reversalReason,
}: ControlPayoutRowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseEvidence, setReverseEvidence] = useState('');

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const result = await approvePayoutAction(payoutRequestId);
      if (result.error) setError(result.error);
    });
  };

  const settle = () => {
    setError(null);
    startTransition(async () => {
      const result = await settlePayoutAction(payoutRequestId);
      if (result.error) setError(result.error);
    });
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitPayoutAction(payoutRequestId);
      if (result.error) setError(result.error);
    });
  };

  const confirmReject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectPayoutAction(payoutRequestId, rejectReason);
      if (result.error) {
        setError(result.error);
        return;
      }
      setRejectOpen(false);
      setRejectReason('');
    });
  };

  const confirmReverse = () => {
    setError(null);
    startTransition(async () => {
      const result = await reversePayoutAction(payoutRequestId, reverseReason, reverseEvidence);
      if (result.error) {
        setError(result.error);
        return;
      }
      setReverseOpen(false);
      setReverseReason('');
      setReverseEvidence('');
    });
  };

  const toggleKyc = () => {
    setError(null);
    startTransition(async () => {
      const result = await setKycVerifiedAction(accountId, !kycVerified);
      if (result.error) setError(result.error);
    });
  };

  const togglePayoutMethod = () => {
    setError(null);
    startTransition(async () => {
      const result = await setPayoutMethodConfiguredAction(accountId, !payoutMethodConfigured);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {staffCanManageCompliance ? (
          <>
            <Button variant="ghost" size="sm" onClick={toggleKyc} disabled={isPending}>
              {kycVerified ? 'KYC : révoquer' : 'KYC : vérifier'}
            </Button>
            <Button variant="ghost" size="sm" onClick={togglePayoutMethod} disabled={isPending}>
              {payoutMethodConfigured
                ? 'Moyen de paiement : retirer'
                : 'Moyen de paiement : configurer'}
            </Button>
          </>
        ) : null}
        {staffCanReviewFinance && canApproveOrReject ? (
          <>
            <Button variant="primary" size="sm" onClick={approve} disabled={isPending}>
              Approuver
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRejectOpen(true)}
              disabled={isPending}
            >
              Refuser
            </Button>
          </>
        ) : null}
        {staffCanReviewFinance && canSettle ? (
          <Button variant="primary" size="sm" onClick={settle} disabled={isPending}>
            Marquer comme versé
          </Button>
        ) : null}
        {staffCanReviewFinance && canSubmit ? (
          <Button variant="primary" size="sm" onClick={submit} disabled={isPending}>
            Soumettre au prestataire
          </Button>
        ) : null}
        {staffCanReviewFinance && canReverse ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setReverseOpen(true)}
            disabled={isPending}
          >
            Reversal
          </Button>
        ) : null}
      </div>
      {reversalReason ? (
        <Text variant="body-sm" color="secondary">
          Motif : {reversalReason}
        </Text>
      ) : null}
      {error ? (
        <Text variant="body-sm" color="danger">
          {error}
        </Text>
      ) : null}

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Refuser la demande de payout"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRejectOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={confirmReject} disabled={isPending}>
              Confirmer le refus
            </Button>
          </div>
        }
      >
        <Input
          label="Motif du refus"
          type="text"
          name="rejectReason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          helperText="Visible côté staff uniquement — expliquez pourquoi cette demande est refusée."
        />
      </Dialog>
      <Dialog
        open={reverseOpen}
        onClose={() => setReverseOpen(false)}
        title="Reversal du payout"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReverseOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmReverse}
              disabled={isPending || !reverseReason.trim()}
            >
              Confirmer le reversal
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Motif obligatoire"
            name="reverseReason"
            value={reverseReason}
            onChange={(event) => setReverseReason(event.target.value)}
          />
          <Input
            label="Référence de preuve"
            name="reverseEvidence"
            value={reverseEvidence}
            onChange={(event) => setReverseEvidence(event.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
}
