import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import type { Db } from './client';
import { CONTROL_PERMISSIONS, staffCan } from './staff';
import type { StaffRole } from './schema';

/** The highest role already defined by WARIBA's canonical Control matrix. */
export const CANONICAL_OWNER_ROLE = 'super_admin' satisfies StaffRole;

export interface OwnerAuthAdmin {
  createUser(params: {
    email: string;
    password: string;
    emailConfirm: true;
  }): Promise<{ id: string }>;
}

export interface BootstrapPlatformOwnerParams {
  email: string;
  password: string;
  profile: {
    firstName: string;
    lastName: string;
    country: string;
    language: string;
  };
  correlationId?: string;
  now?: () => Date;
}

export interface BootstrapPlatformOwnerResult {
  userId: string;
  authUser: 'created' | 'reused';
  profile: 'created' | 'reused';
  membership: 'created' | 'promoted' | 'reused';
  role: typeof CANONICAL_OWNER_ROLE;
  effectivePermissions: readonly string[];
  missingPermissions: readonly string[];
}

function requireValue(value: string, name: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} is required.`);
  return trimmed;
}

/**
 * Idempotently creates or links WARIBA's platform owner.
 *
 * Supabase Auth is deliberately reached through a server-only adapter. The
 * database transaction owns only WARIBA records: profile, canonical staff
 * membership and the audit event. A failed transaction may leave a valid Auth
 * identity behind, but the next invocation reuses it and repairs the missing
 * WARIBA records without creating a duplicate.
 */
export async function bootstrapPlatformOwner(
  db: Db,
  authAdmin: OwnerAuthAdmin,
  params: BootstrapPlatformOwnerParams,
): Promise<BootstrapPlatformOwnerResult> {
  const email = requireValue(params.email, 'WARIBA_OWNER_EMAIL').toLowerCase();
  const password = requireValue(params.password, 'WARIBA_OWNER_PASSWORD');
  const firstName = requireValue(params.profile.firstName, 'WARIBA_OWNER_FIRST_NAME');
  const lastName = requireValue(params.profile.lastName, 'WARIBA_OWNER_LAST_NAME');
  const country = requireValue(params.profile.country, 'WARIBA_OWNER_COUNTRY').toUpperCase();
  const language = requireValue(params.profile.language, 'WARIBA_OWNER_LANGUAGE').toLowerCase();
  if (country.length !== 2) throw new Error('WARIBA_OWNER_COUNTRY must be a two-letter code.');
  if (language.length < 2 || language.length > 5) {
    throw new Error('WARIBA_OWNER_LANGUAGE must contain 2 to 5 characters.');
  }

  const effectivePermissions = CONTROL_PERMISSIONS.filter((permission) =>
    staffCan(CANONICAL_OWNER_ROLE, permission),
  );
  const missingPermissions = CONTROL_PERMISSIONS.filter(
    (permission) => !staffCan(CANONICAL_OWNER_ROLE, permission),
  );
  if (missingPermissions.length > 0) {
    throw new Error(
      `Canonical ${CANONICAL_OWNER_ROLE} role is missing ${missingPermissions.length} Control permissions.`,
    );
  }

  let authUser = await db
    .selectFrom('auth.users')
    .select('id')
    .where(sql<boolean>`lower(email) = ${email}`)
    .executeTakeFirst();
  let authState: BootstrapPlatformOwnerResult['authUser'] = 'reused';
  if (!authUser) {
    authUser = await authAdmin.createUser({ email, password, emailConfirm: true });
    authState = 'created';
  }

  const now = params.now?.() ?? new Date();
  const correlationId = params.correlationId ?? randomUUID();
  const records = await db.transaction().execute(async (trx) => {
    const profile = await trx
      .insertInto('app.user_profiles')
      .values({
        user_id: authUser.id,
        first_name: firstName,
        last_name: lastName,
        country,
        language,
      })
      .onConflict((conflict) => conflict.column('user_id').doNothing())
      .returning('user_id')
      .executeTakeFirst();

    const existingMembership = await trx
      .selectFrom('app.staff_members')
      .select(['id', 'role'])
      .where('user_id', '=', authUser.id)
      .executeTakeFirst();

    let membership: BootstrapPlatformOwnerResult['membership'];
    if (!existingMembership) {
      await trx
        .insertInto('app.staff_members')
        .values({ user_id: authUser.id, role: CANONICAL_OWNER_ROLE, granted_by: null })
        .execute();
      membership = 'created';
    } else if (existingMembership.role !== CANONICAL_OWNER_ROLE) {
      await trx
        .updateTable('app.staff_members')
        .set({ role: CANONICAL_OWNER_ROLE, granted_by: null })
        .where('id', '=', existingMembership.id)
        .executeTakeFirstOrThrow();
      membership = 'promoted';
    } else {
      membership = 'reused';
    }

    if (membership !== 'reused') {
      await trx
        .insertInto('audit.audit_events')
        .values({
          actor_type: 'system',
          actor_id: null,
          role: CANONICAL_OWNER_ROLE,
          permission: null,
          action: 'staff.owner_bootstrapped',
          target_type: 'staff_member',
          target_id: authUser.id,
          before_json: existingMembership ? { role: existingMembership.role } : null,
          after_json: {
            role: CANONICAL_OWNER_ROLE,
            effectivePermissions,
          },
          reason: 'Explicit one-off WARIBA platform-owner bootstrap.',
          source: 'owner_bootstrap',
          correlation_id: correlationId,
          occurred_at: now,
        })
        .execute();
    }

    return {
      profile: profile ? ('created' as const) : ('reused' as const),
      membership,
    };
  });

  return {
    userId: authUser.id,
    authUser: authState,
    profile: records.profile,
    membership: records.membership,
    role: CANONICAL_OWNER_ROLE,
    effectivePermissions,
    missingPermissions,
  };
}
