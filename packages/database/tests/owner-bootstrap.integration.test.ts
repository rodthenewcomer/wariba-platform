import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, type Db } from '../src/client';
import {
  bootstrapPlatformOwner,
  CANONICAL_OWNER_ROLE,
  type OwnerAuthAdmin,
} from '../src/owner-bootstrap';
import { CONTROL_PERMISSIONS, getStaffRole, staffCan } from '../src/staff';

const DATABASE_URL = process.env.DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('platform-owner bootstrap — canonical Auth/RBAC path', () => {
  let db: Db;
  const createdUserIds: string[] = [];

  const authAdmin: OwnerAuthAdmin = {
    async createUser({ email, password, emailConfirm }) {
      const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, email_confirm: emailConfirm }),
      });
      const body = (await response.json()) as { id?: unknown };
      if (!response.ok || typeof body.id !== 'string') {
        throw new Error(`Auth fixture creation failed with HTTP ${response.status}.`);
      }
      createdUserIds.push(body.id);
      return { id: body.id };
    },
  };

  beforeAll(() => {
    db = createDbClient(DATABASE_URL as string);
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await db.deleteFrom('audit.audit_events').where('target_id', '=', userId).execute();
      await db.deleteFrom('app.staff_members').where('user_id', '=', userId).execute();
      await db.deleteFrom('app.user_profiles').where('user_id', '=', userId).execute();
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    }
    await db.destroy();
  });

  it('creates once, reuses safely, audits the grant once, and preserves ordinary denial', async () => {
    const marker = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const ownerEmail = `owner-bootstrap-${marker}@wariba-test.invalid`;
    const password = `Owner-${randomUUID()}!`;
    const input = {
      email: ownerEmail,
      password,
      profile: { firstName: 'WARIBA', lastName: 'Owner', country: 'CI', language: 'fr' },
    };

    const first = await bootstrapPlatformOwner(db, authAdmin, input);
    const second = await bootstrapPlatformOwner(db, authAdmin, input);

    expect(first.authUser).toBe('created');
    expect(first.profile).toBe('created');
    expect(first.membership).toBe('created');
    expect(second.authUser).toBe('reused');
    expect(second.profile).toBe('reused');
    expect(second.membership).toBe('reused');
    expect(second.userId).toBe(first.userId);
    expect(await getStaffRole(db, first.userId)).toBe(CANONICAL_OWNER_ROLE);
    expect(first.effectivePermissions).toEqual(CONTROL_PERMISSIONS);
    expect(first.missingPermissions).toEqual([]);
    expect(CONTROL_PERMISSIONS.every((permission) => staffCan('super_admin', permission))).toBe(
      true,
    );

    const audit = await db
      .selectFrom('audit.audit_events')
      .select(['action', 'target_id'])
      .where('target_id', '=', first.userId)
      .where('action', '=', 'staff.owner_bootstrapped')
      .execute();
    expect(audit).toHaveLength(1);

    const traderEmail = `owner-bootstrap-trader-${marker}@wariba-test.invalid`;
    const trader = await authAdmin.createUser({ email: traderEmail, password, emailConfirm: true });
    expect(await getStaffRole(db, trader.id)).toBeNull();
  });
});
