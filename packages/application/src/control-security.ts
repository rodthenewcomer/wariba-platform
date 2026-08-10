import {
  consumeStaffActionRateLimit,
  staffCan,
  type ControlPermission,
  type Db,
  type StaffRole,
} from '@wariba/database';

export interface AuthorizeSensitiveStaffActionParams {
  actorId: string;
  actorRole: StaffRole;
  permission: ControlPermission;
  limit?: number;
  windowMs?: number;
}

export async function authorizeSensitiveStaffAction(
  db: Db,
  params: AuthorizeSensitiveStaffActionParams,
): Promise<void> {
  if (!staffCan(params.actorRole, params.permission)) {
    throw new Error('Staff role is not authorized for this sensitive action.');
  }
  await consumeStaffActionRateLimit(db, {
    actorId: params.actorId,
    action: params.permission,
    limit: params.limit ?? 10,
    windowMs: params.windowMs ?? 60_000,
  });
}
