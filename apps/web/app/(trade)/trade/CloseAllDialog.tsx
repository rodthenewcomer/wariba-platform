'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Dialog,
  Text,
  type BadgeVariant,
} from '@wariba/ui';

export interface CloseAllOutcome {
  symbol: string | null;
  status: 'filled' | 'rejected';
  rejectionCode: string | null;
}

export interface CloseAllDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  positionCount: number;
  accountPublicId: string;
  pending: boolean;
  /** null while unconfirmed/in flight — once set, the dialog shows the result phase instead. */
  result: CloseAllOutcome[] | null;
}

const OUTCOME_LABEL: Record<CloseAllOutcome['status'], string> = {
  filled: 'Fermée',
  rejected: 'Échec',
};
const OUTCOME_VARIANT: Record<CloseAllOutcome['status'], BadgeVariant> = {
  filled: 'success',
  rejected: 'danger',
};

/**
 * UX Architecture §22.11 — action visible, confirmation showing the position
 * count, an option of reinforced confirmation on mobile, disabled the moment
 * it's triggered, and a detailed result afterward. Two Confirm buttons exist
 * (one per breakpoint, Tailwind picks which renders) rather than a JS media
 * query: the mobile one alone is gated on the extra checkbox, so the
 * reinforcement is genuinely mobile-only without duplicating this
 * component's disabled logic behind a hook.
 */
export function CloseAllDialog({
  open,
  onClose,
  onConfirm,
  positionCount,
  accountPublicId,
  pending,
  result,
}: CloseAllDialogProps) {
  const [mobileAcknowledged, setMobileAcknowledged] = useState(false);

  const handleClose = () => {
    setMobileAcknowledged(false);
    onClose();
  };

  if (result) {
    const failedCount = result.filter((outcome) => outcome.status === 'rejected').length;
    const closedCount = result.length - failedCount;
    return (
      <Dialog open={open} onClose={handleClose} title="Résultat — Tout fermer" size="sm">
        <div className="flex flex-col gap-4">
          <Text variant="body-sm" color="secondary">
            {closedCount} position{closedCount > 1 ? 's' : ''} fermée{closedCount > 1 ? 's' : ''}
            {failedCount > 0
              ? `, ${failedCount} échec${failedCount > 1 ? 's' : ''}`
              : ''}{' '}
            — compte {accountPublicId}.
          </Text>
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Résultat</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {result.map((outcome, index) => (
                <DataTableRow key={index}>
                  <DataTableCell>{outcome.symbol ?? '—'}</DataTableCell>
                  <DataTableCell align="right">
                    <Badge variant={OUTCOME_VARIANT[outcome.status]}>
                      {OUTCOME_LABEL[outcome.status]}
                    </Badge>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleClose}>Fermer</Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Tout fermer ?" size="sm">
      <div className="flex flex-col gap-4">
        <Text variant="body-sm" color="secondary">
          Cette action fermera {positionCount} position{positionCount > 1 ? 's' : ''} ouverte
          {positionCount > 1 ? 's' : ''} sur le compte {accountPublicId}, immédiatement et sans
          confirmation supplémentaire par position.
        </Text>

        <div className="lg:hidden">
          <Checkbox
            label="Je confirme vouloir fermer toutes mes positions ouvertes."
            checked={mobileAcknowledged}
            onChange={(event) => setMobileAcknowledged(event.target.checked)}
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose} disabled={pending}>
          Annuler
        </Button>
        <Button
          variant="destructive"
          className="hidden lg:inline-flex"
          onClick={onConfirm}
          loading={pending}
        >
          Confirmer
        </Button>
        <Button
          variant="destructive"
          className="lg:hidden"
          onClick={onConfirm}
          loading={pending}
          disabled={!mobileAcknowledged}
        >
          Confirmer
        </Button>
      </div>
    </Dialog>
  );
}
