'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  recordActuarialVariance,
  replaceActuarialScenarioAssumptions,
  runStoredActuarialScenario,
  staffRoleSatisfies,
  authorizeSensitiveStaffAction,
} from '@wariba/application';
import type { VarianceCoverage } from '@wariba/domain';
import { requireStaffRole } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

const scenarioNameSchema = z.enum(['conservative', 'base', 'aggressive', 'stress', 'custom']);
const productCodeSchema = z.enum(['5K', '10K', '25K', '50K', '100K']);
const rateTupleSchema = z.tuple([z.string(), z.string(), z.string(), z.string(), z.string()]);
const runInputSchema = z.object({
  purchasesByProduct: z
    .object({
      '5K': z.number().int().nonnegative().optional(),
      '10K': z.number().int().nonnegative().optional(),
      '25K': z.number().int().nonnegative().optional(),
      '50K': z.number().int().nonnegative().optional(),
      '100K': z.number().int().nonnegative().optional(),
    })
    .strict(),
  products: z.array(
    z.object({
      productCode: productCodeSchema,
      collectedPrice: z.string(),
      capsByRank: rateTupleSchema,
      splitByRank: rateTupleSchema,
    }),
  ),
  pspFeeRate: z.string(),
});

export interface ActuarialActionResult {
  error?: string;
}

/**
 * The canonical comparison, in a shape that survives the Server Action
 * boundary.
 *
 * Deliberately the record the server just wrote, not a client-side
 * reconstruction of it: the panel renders exactly what the database holds, so
 * what an operator sees immediately after the write and what they see after a
 * reload are the same row by construction.
 */
export interface ActuarialVarianceDTO {
  id: string;
  scenarioRunId: string;
  scenarioName: string;
  scenarioVersion: number;
  coverage: VarianceCoverage;
  modelCohortSize: number;
  actualSampleSize: number;
  /** ISO 8601. Formatted for display by the panel, in UTC. */
  executedAt: string;
  metrics: readonly {
    metric: string;
    modelValue: string;
    actualValue: string;
    variance: string;
    relativeVariance: string | null;
  }[];
}

export interface RecordActuarialVarianceResult extends ActuarialActionResult {
  variance?: ActuarialVarianceDTO;
}

async function requireActuarialStaff() {
  const session = await requireStaffRole();
  if (!staffRoleSatisfies(session.role, 'risk') && !staffRoleSatisfies(session.role, 'finance')) {
    throw new Error('Risk or Finance authorization is required.');
  }
  return session;
}

export async function saveActuarialScenarioAction(
  scenarioNameInput: string,
  assumptionsJson: string,
  changeReason: string,
  notes: string,
): Promise<ActuarialActionResult> {
  try {
    const session = await requireActuarialStaff();
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'actuarial.modify',
    });
    const scenarioName = scenarioNameSchema.parse(scenarioNameInput);
    await replaceActuarialScenarioAssumptions(getDb(), {
      scenarioName,
      assumptions: JSON.parse(assumptionsJson) as unknown,
      changeReason,
      notes,
      changedBy: session.userId,
      changedByRole: session.role,
      correlationId: randomUUID(),
    });
    revalidatePath('/control/actuarial');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Scenario update failed.' };
  }
}

export async function executeActuarialScenarioAction(
  scenarioNameInput: string,
  runInputJson: string,
): Promise<ActuarialActionResult> {
  try {
    const session = await requireActuarialStaff();
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'actuarial.modify',
      limit: 20,
    });
    const scenarioName = scenarioNameSchema.parse(scenarioNameInput);
    const input = runInputSchema.parse(JSON.parse(runInputJson) as unknown);
    const purchasesByProduct: Partial<Record<z.infer<typeof productCodeSchema>, number>> = {};
    for (const productCode of productCodeSchema.options) {
      const purchases = input.purchasesByProduct[productCode];
      if (purchases !== undefined) purchasesByProduct[productCode] = purchases;
    }
    await runStoredActuarialScenario(getDb(), {
      scenarioName,
      purchasesByProduct,
      products: input.products,
      pspFeeRate: input.pspFeeRate,
      executedBy: session.userId,
      // Risk and finance both hold actuarial.modify — the audit trail
      // records which one actually ran it.
      executedByRole: session.role,
    });
    revalidatePath('/control/actuarial');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Scenario execution failed.' };
  }
}

const runIdSchema = z.string().uuid();

/**
 * Compares one persisted scenario run against measured actuals.
 *
 * The only input is which run to compare. The MODEL side is read from that
 * run's own immutable snapshot and the ACTUAL side is measured server-side,
 * so nothing about the resulting variance can be steered from the browser.
 * The comparison writes a new artifact; it never edits either side.
 */
export async function recordActuarialVarianceAction(
  scenarioRunId: string,
): Promise<RecordActuarialVarianceResult> {
  try {
    const session = await requireActuarialStaff();
    await authorizeSensitiveStaffAction(getDb(), {
      actorId: session.userId,
      actorRole: session.role,
      permission: 'actuarial.modify',
      limit: 20,
    });
    const run = await recordActuarialVariance(getDb(), {
      scenarioRunId: runIdSchema.parse(scenarioRunId),
      executedBy: session.userId,
      executedByRole: session.role,
      correlationId: randomUUID(),
    });
    // Still revalidated: the history table and the validation banner are server
    // -rendered from the same rows, and they must not lag behind the panel.
    revalidatePath('/control/actuarial');
    return {
      variance: {
        id: run.id,
        scenarioRunId: run.scenarioRunId,
        scenarioName: run.scenarioName,
        scenarioVersion: run.scenarioVersion,
        coverage: run.coverage,
        modelCohortSize: run.modelCohortSize,
        actualSampleSize: run.actualSampleSize,
        executedAt: run.executedAt.toISOString(),
        metrics: run.metrics.map((metric) => ({
          metric: metric.metric,
          modelValue: metric.modelValue,
          actualValue: metric.actualValue,
          variance: metric.variance,
          relativeVariance: metric.relativeVariance,
        })),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Variance comparison failed.' };
  }
}
