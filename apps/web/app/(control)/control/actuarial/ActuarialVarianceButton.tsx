'use client';

import { useState, useTransition } from 'react';
import { Button, Text } from '@wariba/ui';
import { recordActuarialVarianceAction } from './actions';
import { useActuarialVariance } from './ActuarialVarianceStore';

/**
 * Runs a MODEL vs ACTUAL comparison for one persisted scenario run.
 *
 * The button sends nothing but the run id — the model figures come from the
 * run's own snapshot and the actuals are measured server-side. Being able to
 * press it is not authority to press it: the Server Action re-checks
 * `actuarial.modify` itself.
 *
 * On success it hands the ÉCART card the canonical record the server wrote, so
 * the operator sees the artifact they just created rather than the empty state
 * it replaced. There is no timer and no optimistic value: the only thing that
 * can reach the card is a row that is already in the database.
 */
export function ActuarialVarianceButton({ scenarioRunId }: { scenarioRunId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { setVariance } = useActuarialVariance();

  const compare = () => {
    setError(null);
    startTransition(async () => {
      const result = await recordActuarialVarianceAction(scenarioRunId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.variance) setVariance(result.variance);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        size="sm"
        onClick={compare}
        disabled={isPending}
        data-testid="actuarial-variance-compare"
      >
        Comparer
      </Button>
      {error ? (
        <Text variant="body-sm" color="danger" data-testid="actuarial-variance-error">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
