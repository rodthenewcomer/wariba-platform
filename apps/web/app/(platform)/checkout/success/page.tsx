import { redirect } from 'next/navigation';

/*
 * Never prerendered — see the platform layout.
 *
 * Any page under `(platform)` renders `HubShell`, which builds a Supabase
 * server client and validates the full server config. A page without this
 * directive is therefore rendered at *build* time and drags DATABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY and the webhook secret into the build inputs —
 * which, in a container build, means passing secrets as build arguments that
 * stay readable in image history forever.
 *
 * Every one of these pages is per-user or per-order and has nothing static to
 * emit, so the directive costs nothing and removes the trap.
 */
export const dynamic = 'force-dynamic';

/**
 * Payment confirmation is asynchronous (the webhook may land a moment after
 * this redirect happens), so this route doesn't assert success itself — it
 * hands off to /bienvenue, which reads the account's actual current state
 * from the database rather than assuming activation already finished.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  redirect(order ? `/bienvenue?order=${order}` : '/bienvenue');
}
