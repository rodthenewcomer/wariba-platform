import { redirect } from 'next/navigation';
import { Text } from '@wariba/ui';
import { getLatestAccountForUser } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { loadWebConfig } from '../../../lib/config';
import { TradeClient } from './TradeClient';

// Live trading state (account, positions, WS URL) — never statically
// cached from build time. Also avoids requiring runtime secrets at build
// time (CI runs `pnpm build` with no env vars set, same as offres/page.tsx).
export const dynamic = 'force-dynamic';

export default async function TradePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/trade');
  }

  const db = getDb();
  const account = await getLatestAccountForUser(db, { userId: user.id });

  if (!account || account.status !== 'active') {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <Text as="h1" variant="heading-lg">
          Aucun compte actif
        </Text>
        <Text variant="body-sm" color="secondary">
          Vous n&apos;avez pas encore de compte WARIBA ONE actif. Consultez les offres pour en
          activer un.
        </Text>
      </div>
    );
  }

  return <TradeClient accountId={account.id} wsUrl={loadWebConfig().NEXT_PUBLIC_REALTIME_WS_URL} />;
}
