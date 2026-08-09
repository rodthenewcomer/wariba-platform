import { sql } from 'kysely';
import type { DbExecutor } from './client';

export class StaffActionRateLimitExceededError extends Error {
  constructor(readonly retryAfterMs: number) {
    super('Too many sensitive staff actions. Retry after the current rate-limit window.');
    this.name = 'StaffActionRateLimitExceededError';
  }
}

export interface ConsumeStaffActionRateLimitParams {
  actorId: string;
  action: string;
  limit: number;
  windowMs: number;
  now?: Date;
}

export async function consumeStaffActionRateLimit(
  db: DbExecutor,
  params: ConsumeStaffActionRateLimitParams,
): Promise<void> {
  if (!Number.isInteger(params.limit) || params.limit < 1 || params.windowMs < 1) {
    throw new Error('Invalid staff action rate-limit configuration.');
  }
  const now = params.now ?? new Date();
  const windowStartMs = Math.floor(now.getTime() / params.windowMs) * params.windowMs;
  const windowStart = new Date(windowStartMs);
  const result = await sql<{ attempt_count: number }>`
    insert into app.staff_action_rate_limits (
      actor_id,
      action,
      window_start,
      attempt_count,
      last_attempt_at
    ) values (
      ${params.actorId},
      ${params.action},
      ${windowStart},
      1,
      ${now}
    )
    on conflict (actor_id, action, window_start)
    do update set
      attempt_count = app.staff_action_rate_limits.attempt_count + 1,
      last_attempt_at = excluded.last_attempt_at
    returning attempt_count
  `.execute(db);
  const attemptCount = result.rows[0]?.attempt_count;
  if (attemptCount === undefined) throw new Error('Staff action rate limit was not recorded.');
  if (attemptCount > params.limit) {
    throw new StaffActionRateLimitExceededError(windowStartMs + params.windowMs - now.getTime());
  }
}
