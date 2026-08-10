'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button, Input, Select, Text } from '@wariba/ui';
import type { ScenarioAssumptions, ScenarioName } from '@wariba/domain';
import { executeActuarialScenarioAction, saveActuarialScenarioAction } from './actions';

interface ScenarioOption {
  scenarioName: ScenarioName;
  version: number;
  assumptions: ScenarioAssumptions;
  notes: string;
}

export function ActuarialScenarioManager({
  scenarios,
  defaultRunInput,
}: {
  scenarios: ScenarioOption[];
  defaultRunInput: object;
}) {
  const initial = scenarios.find((scenario) => scenario.scenarioName === 'base') ?? scenarios[0];
  const [scenarioName, setScenarioName] = useState<ScenarioName>(initial?.scenarioName ?? 'base');
  const selected = useMemo(
    () => scenarios.find((scenario) => scenario.scenarioName === scenarioName) ?? initial,
    [initial, scenarioName, scenarios],
  );
  const [assumptionsJson, setAssumptionsJson] = useState(
    JSON.stringify(selected?.assumptions ?? {}, null, 2),
  );
  const [changeReason, setChangeReason] = useState('');
  const [notes, setNotes] = useState(selected?.notes ?? '');
  const [runInputJson, setRunInputJson] = useState(JSON.stringify(defaultRunInput, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectScenario = (next: ScenarioName) => {
    const nextScenario = scenarios.find((scenario) => scenario.scenarioName === next);
    setScenarioName(next);
    setAssumptionsJson(JSON.stringify(nextScenario?.assumptions ?? {}, null, 2));
    setNotes(nextScenario?.notes ?? '');
    setChangeReason('');
    setError(null);
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveActuarialScenarioAction(
        scenarioName,
        assumptionsJson,
        changeReason,
        notes,
      );
      setError(result.error ?? null);
      if (!result.error) setChangeReason('');
    });
  };

  const execute = () => {
    setError(null);
    startTransition(async () => {
      const result = await executeActuarialScenarioAction(scenarioName, runInputJson);
      setError(result.error ?? null);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4">
        <Select
          label="Scenario"
          value={scenarioName}
          onChange={(event) => selectScenario(event.target.value as ScenarioName)}
        >
          {scenarios.map((scenario) => (
            <option key={scenario.scenarioName} value={scenario.scenarioName}>
              {scenario.scenarioName.toUpperCase()} · v{scenario.version}
            </option>
          ))}
        </Select>
        <label className="flex flex-col gap-2">
          <Text variant="label-sm">Persisted assumptions</Text>
          <textarea
            className="min-h-72 rounded-[var(--wariba-radius-md)] border border-[color:var(--wariba-border-default)] bg-[color:var(--wariba-background-surface)] p-3 font-mono text-sm text-[color:var(--wariba-text-primary)]"
            value={assumptionsJson}
            onChange={(event) => setAssumptionsJson(event.target.value)}
          />
        </label>
        <Input
          label="Change reason"
          name="changeReason"
          value={changeReason}
          onChange={(event) => setChangeReason(event.target.value)}
        />
        <Input
          label="Notes"
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <Button variant="primary" onClick={save} disabled={isPending || !changeReason.trim()}>
          Save new immutable version
        </Button>
      </section>

      <section className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <Text variant="label-sm">Run input snapshot</Text>
          <textarea
            className="min-h-96 rounded-[var(--wariba-radius-md)] border border-[color:var(--wariba-border-default)] bg-[color:var(--wariba-background-surface)] p-3 font-mono text-sm text-[color:var(--wariba-text-primary)]"
            value={runInputJson}
            onChange={(event) => setRunInputJson(event.target.value)}
          />
        </label>
        <Button variant="primary" onClick={execute} disabled={isPending}>
          Execute and preserve run
        </Button>
      </section>

      {error ? (
        <Text variant="body-sm" color="danger">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
