import { sql } from 'kysely';
import type { Db } from './client';
import type { StaffRole } from './schema';

/**
 * Prompt 09 milestone 5 — the staff directory.
 *
 * Read-only, with no write path anywhere: Prompt 09 authorizes no staff role
 * mutation, no invitation, no removal and no impersonation, so no such
 * permission and no Server Action exists. Access management being visible is
 * not the same as access management being operable, and the surface says so.
 *
 * The identity projection is the minimum an internal directory needs: staff
 * row id, user id, email, role, who granted it and when. `auth.users` is
 * mapped narrowly on purpose (id, email, created_at) — this module does not
 * widen it, and no password, token, provider or session metadata is
 * reachable through it.
 *
 * SEC-017: a `staff_members` row is *authority*. An `auth.users` row is
 * *historical identity*. Someone can stop being staff while their identity
 * remains referenced by immutable actuarial and audit artifacts — that is
 * retention working as designed, not a lingering grant. This query returns
 * authority; identity without a grant simply does not appear.
 */
export interface ControlStaffFilters {
  role?: StaffRole;
  /** Matches the staff member's email or user id as literal text. */
  query?: string;
}

export interface ControlStaffMember {
  id: string;
  userId: string;
  email: string | null;
  role: StaffRole;
  grantedByUserId: string | null;
  grantedByEmail: string | null;
  grantedAt: Date;
  userCreatedAt: Date;
}

export interface ControlStaffPage {
  members: readonly ControlStaffMember[];
  total: number;
  page: number;
  pageSize: number;
  /** Grants per role across the whole directory, not just this page. */
  countsByRole: Readonly<Record<string, number>>;
}

export const CONTROL_TEAM_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function searchStaffDirectory(
  db: Db,
  params: { filters?: ControlStaffFilters; page?: number; pageSize?: number } = {},
): Promise<ControlStaffPage> {
  const filters = params.filters ?? {};
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? CONTROL_TEAM_PAGE_SIZE));

  let base = db
    .selectFrom('app.staff_members')
    .innerJoin('auth.users', 'auth.users.id', 'app.staff_members.user_id');

  if (filters.role) base = base.where('app.staff_members.role', '=', filters.role);

  const trimmed = filters.query?.trim();
  if (trimmed) {
    // Escaped: a `%` typed into the search box means that character.
    const pattern = `%${trimmed.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    base = base.where((eb) => {
      const matches = [eb(sql<string>`coalesce(auth.users.email, '')`, 'ilike', pattern)];
      // Only compared as a uuid when it *is* one — a partial string against
      // a uuid column is a Postgres error, not an empty result.
      if (UUID_PATTERN.test(trimmed)) {
        matches.push(eb('app.staff_members.user_id', '=', trimmed));
      }
      return eb.or(matches);
    });
  }

  const [rows, totals, roleCounts] = await Promise.all([
    base
      .select([
        'app.staff_members.id',
        'app.staff_members.user_id',
        'app.staff_members.role',
        'app.staff_members.granted_by',
        'app.staff_members.created_at',
        'auth.users.email',
        'auth.users.created_at as user_created_at',
      ])
      .orderBy('app.staff_members.created_at', 'desc')
      .orderBy('app.staff_members.id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute(),
    base.select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
    db
      .selectFrom('app.staff_members')
      .select((eb) => ['role', eb.fn.countAll().as('count')])
      .groupBy('role')
      .execute(),
  ]);

  // Resolved separately so the grantor's address never widens the join's
  // projection — it is a label, not a second directory entry.
  const grantorIds = [...new Set(rows.map((row) => row.granted_by).filter((id) => id !== null))];
  const grantors =
    grantorIds.length === 0
      ? []
      : await db
          .selectFrom('auth.users')
          .select(['id', 'email'])
          .where('id', 'in', grantorIds)
          .execute();
  const grantorEmails = new Map(grantors.map((grantor) => [grantor.id, grantor.email]));

  return {
    members: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      role: row.role,
      grantedByUserId: row.granted_by,
      grantedByEmail: row.granted_by ? (grantorEmails.get(row.granted_by) ?? null) : null,
      grantedAt: row.created_at,
      userCreatedAt: row.user_created_at,
    })),
    total: Number(totals?.count ?? 0),
    page,
    pageSize,
    countsByRole: Object.fromEntries(roleCounts.map((row) => [row.role, Number(row.count)])),
  };
}
