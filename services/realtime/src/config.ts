import { z } from 'zod';
import { baseEnvironmentSchema, loadConfig } from '@wariba/config';

const realtimeEnvSchema = baseEnvironmentSchema.extend({
  REALTIME_PORT: z.coerce.number().int().positive().default(4001),
});

export type RealtimeConfig = z.infer<typeof realtimeEnvSchema>;

export function loadRealtimeConfig(
  source: Record<string, string | undefined> = process.env,
): RealtimeConfig {
  return loadConfig(realtimeEnvSchema, source);
}
