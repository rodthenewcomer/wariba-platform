import { NextResponse } from 'next/server';
import { correlationIdFromHeaders, CORRELATION_ID_HEADER } from '@wariba/observability';
import { buildAccountTelemetry, listAccountsForUser } from '@wariba/application';
import { createSupabaseServerClient } from '../../../../../../lib/supabase/server';
import { getDb } from '../../../../../../lib/db';

/**
 * The account's moving figures, for the Hub's refresh.
 *
 * ## Why an endpoint and not a WariX subscription
 *
 * §23's hierarchy prefers an existing authoritative stream, and WariX has one
 * — but it is a per-session WebSocket owned by the workstation, carrying tick
 * data the Hub has no use for. Subscribing the dashboard to it would import
 * WariX client internals into unrelated Hub components, which §2.2 forbids
 * explicitly, and would mean a trader with the Hub open in a second tab holds
 * a second market-data session. This reads the same read models the server
 * render used, over HTTP.
 *
 * ## Why the payload is small
 *
 * `buildAccountTelemetry` deliberately omits activity, positions detail and
 * the analytics pass. Balance, today's P&L, the two budgets and the objective
 * are what actually move intraday; the rest changes on a daily boundary or on
 * a state transition, and re-fetching a full analytics sweep every few seconds
 * to learn that a balance did not move is expensive and misleading in equal
 * measure.
 *
 * ## Authorisation
 *
 * The account is resolved through `listAccountsForUser` for the authenticated
 * caller, so an account id belonging to someone else is not found rather than
 * refused — the response cannot be used to discover whether an id exists.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  const correlationId = correlationIdFromHeaders(Object.fromEntries(request.headers.entries()));
  const headers = { [CORRELATION_ID_HEADER]: correlationId };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers });
  }

  const { accountId } = await context.params;
  const db = getDb();
  const accounts = await listAccountsForUser(db, { userId: user.id });
  const account = accounts.find((candidate) => candidate.id === accountId);

  if (!account) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers });
  }

  /*
   * The same precondition the dashboard branches on: these three statuses have
   * no risk-engine state, and the read models throw rather than invent one.
   * 409 rather than 404 — the account exists, it simply has no telemetry, and
   * the client stops polling instead of retrying a resource that will never
   * appear.
   */
  if (
    account.status === 'pending_activation' ||
    account.status === 'inactive' ||
    account.status === 'closed'
  ) {
    return NextResponse.json({ error: 'no_telemetry' }, { status: 409, headers });
  }

  try {
    const telemetry = await buildAccountTelemetry(db, { account, now: new Date() });
    return NextResponse.json(
      { data: telemetry, meta: { correlationId } },
      {
        headers: {
          ...headers,
          // Account telemetry is per-user and time-sensitive; a shared cache
          // holding it would serve one trader another's balance.
          'Cache-Control': 'private, no-store',
        },
      },
    );
  } catch {
    /*
     * Deliberately opaque. The internal message can name a policy version, an
     * account id or a database constraint, and this response is reachable by
     * anyone signed in.
     */
    return NextResponse.json({ error: 'telemetry_unavailable' }, { status: 503, headers });
  }
}
