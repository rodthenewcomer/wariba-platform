import { z } from 'zod';
import { baseEnvironmentSchema, loadConfig } from '@wariba/config';

const workerEnvSchema = baseEnvironmentSchema.extend({
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(4002),
  DATABASE_URL: z.string().min(1),
  // Prompt 01 reserved this name for the worker's poll cadence; Prompt 05 is
  // its first real consumer — the daily policy-risk finalization job (SOD
  // snapshot / EOD finalization / Maximum Loss floor ratchet / soft-lock
  // reset, plus advancing pass-eligible accounts out of pass_pending).
  // 5 minutes by default — frequent enough that an account crossing a UTC
  // day boundary doesn't sit unfinalized for long, without hammering the DB.
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
});

export type WorkerConfig = z.infer<typeof workerEnvSchema>;

export function loadWorkerConfig(
  source: Record<string, string | undefined> = process.env,
): WorkerConfig {
  return loadConfig(workerEnvSchema, source);
}
