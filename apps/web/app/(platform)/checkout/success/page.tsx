import { redirect } from 'next/navigation';

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
