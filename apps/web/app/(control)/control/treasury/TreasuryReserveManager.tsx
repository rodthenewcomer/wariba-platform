'use client';

import { useState, useTransition } from 'react';
import { Button, Input, Select, Text } from '@wariba/ui';
import { recordTreasuryReserveAction } from './actions';

export function TreasuryReserveManager() {
  const [entryType, setEntryType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await recordTreasuryReserveAction(entryType, amount, reason);
      setError(result.error ?? null);
      if (!result.error) {
        setAmount('');
        setReason('');
      }
    });
  };

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <Select
        label="Type d’écriture"
        value={entryType}
        onChange={(event) => setEntryType(event.target.value)}
      >
        <option value="deposit">Dépôt</option>
        <option value="withdrawal">Retrait</option>
        <option value="adjustment">Ajustement autorisé</option>
      </Select>
      <Input
        label="Montant USD"
        name="amount"
        inputMode="decimal"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      <Input
        label="Motif et preuve"
        name="reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button variant="primary" onClick={submit} disabled={isPending || !amount || !reason.trim()}>
        Enregistrer l’écriture immuable
      </Button>
      {error ? (
        <Text variant="body-sm" color="danger">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
