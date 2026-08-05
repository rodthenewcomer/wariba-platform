import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getStaffRole, staffRoleSatisfies, type StaffRole } from '@wariba/application';
import { createSupabaseServerClient } from './supabase/server';
import { getDb } from './db';

export interface StaffSession {
  userId: string;
  email: string | null;
  role: StaffRole;
}

/**
 * Prompt 7 Appendix 07-B, gate 4 — /control's real authorization boundary.
 * `cache()` (React's per-request memoization, not a cross-request cache)
 * means the layout and a page can both call this without a second round
 * trip to Supabase/Postgres per request.
 *
 * Fails closed: any error resolving the role (including "the staff_members
 * table doesn't exist," the state before this migration has run) is
 * treated identically to "not staff" — never as access.
 */
const resolveStaffSession = cache(async (): Promise<StaffSession | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let role: StaffRole | null;
  try {
    role = await getStaffRole(getDb(), user.id);
  } catch {
    role = null;
  }
  if (!role) return null;

  return { userId: user.id, email: user.email ?? null, role };
});

/**
 * Redirects a non-staff visitor away from /control. middleware.ts already
 * sends a fully unauthenticated request to /login before this ever runs
 * (/control is in PROTECTED_PREFIXES) — what this adds is the actual role
 * check middleware can't do (app.staff_members lives outside PostgREST's
 * exposed schema, so it's only reachable via a direct Postgres connection,
 * not the Edge-Runtime-safe Supabase client middleware uses).
 *
 * Authenticated but not staff -> /hub (they're a real trader; /control was
 * never meant to be reachable from trader nav, so this is a quiet
 * redirect, not an error page that confirms the route exists).
 * Authenticated staff missing the specific `required` role for this
 * section -> /control (they're staff, just not for this section).
 */
export async function requireStaffRole(required?: StaffRole): Promise<StaffSession> {
  const session = await resolveStaffSession();
  if (!session) redirect('/hub');
  if (required && !staffRoleSatisfies(session.role, required)) redirect('/control');
  return session;
}
