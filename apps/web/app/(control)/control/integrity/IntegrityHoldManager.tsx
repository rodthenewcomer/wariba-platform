'use client';

import { useState, useTransition } from 'react';
import { Button, Input, Text } from '@wariba/ui';
import { clearIntegrityHoldAction, placeIntegrityHoldAction } from './actions';

export function IntegrityHoldManager() {
  const [accountId, setAccountId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const execute = (mode: 'place' | 'clear') => {
    setError(null);
    startTransition(async () => {
      const result = await (mode === 'place' ? placeIntegrityHoldAction : clearIntegrityHoldAction)(
        accountId,
        reason,
      );
      setError(result.error ?? null);
      if (!result.error) setReason('');
    });
  };

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <Input
        label="ID interne du compte"
        name="accountId"
        value={accountId}
        onChange={(event) => setAccountId(event.target.value)}
      />
      <Input
        label="Motif et référence d’incident"
        name="reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          onClick={() => execute('place')}
          disabled={isPending || !accountId || !reason.trim()}
        >
          Poser un integrity hold
        </Button>
        <Button
          variant="secondary"
          onClick={() => execute('clear')}
          disabled={isPending || !accountId || !reason.trim()}
        >
          Réconcilier et lever le hold
        </Button>
      </div>
      {error ? (
        <Text variant="body-sm" color="danger">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
