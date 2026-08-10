'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  replaceActuarialScenarioAssumptions,
  runStoredActuarialScenario,
  staffRoleSatisfies,
  authorizeSensitiveStaffAction,
} from '@wariba/application';
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
    });
    revalidatePath('/control/actuarial');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Scenario execution failed.' };
  }
}
