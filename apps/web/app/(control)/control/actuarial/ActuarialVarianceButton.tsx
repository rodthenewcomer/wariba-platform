'use client';

import { useState, useTransition } from 'react';
import { Button, Text } from '@wariba/ui';
import { recordActuarialVarianceAction } from './actions';

/**
 * Runs a MODEL vs ACTUAL comparison for one persisted scenario run.
 *
 * The button sends nothing but the run id — the model figures come from the
 * run's own snapshot and the actuals are measured server-side. Being able to
 * press it is not authority to press it: the Server Action re-checks
 * `actuarial.modify` itself.
 */
export function ActuarialVarianceButton({ scenarioRunId }: { scenarioRunId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const compare = () => {
    setError(null);
    startTransition(async () => {
      const result = await recordActuarialVarianceAction(scenarioRunId);
      setError(result.error ?? null);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={compare} disabled={isPending}>
        Comparer
      </Button>
      {error ? (
        <Text variant="body-sm" color="danger">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
