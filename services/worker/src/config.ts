import { z } from 'zod';
import { baseEnvironmentSchema, loadConfig } from '@wariba/config';

const workerEnvSchema = baseEnvironmentSchema.extend({
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(4002),
});

export type WorkerConfig = z.infer<typeof workerEnvSchema>;

export function loadWorkerConfig(
  source: Record<string, string | undefined> = process.env,
): WorkerConfig {
  return loadConfig(workerEnvSchema, source);
}
