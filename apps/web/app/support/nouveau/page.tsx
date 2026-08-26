import { redirect } from 'next/navigation';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  listAccountsForUser,
  type SupportTicketCategory,
} from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { PageHeader } from '../../../components/hub/PageHeader';
import { NewRequestForm, type AccountOption } from './NewRequestForm';

export const dynamic = 'force-dynamic';

function isCategory(value: string | undefined): value is SupportTicketCategory {
  return value !== undefined && (SUPPORT_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Nouvelle demande.
 *
 * ## Context arrives pre-filled, and is verified before it is
 *
 * A trader reaching this page from a breached account, an order or a payout
 * should not have to retype which account they mean. So `?category=` and
 * `?account=` pre-fill the form — but both are query parameters, which is to
 * say attacker-controlled. The category is checked against the closed set, and
 * the account is only pre-selected if it appears in *this user's* own account
 * list. A parameter naming somebody else's account resolves to nothing
 * selected; it never selects it and never confirms it exists.
 */
export default async function NewSupportRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; account?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/support/nouveau');

  const params = await searchParams;
  const accounts = await listAccountsForUser(getDb(), { userId: user.id });

  const options: readonly AccountOption[] = accounts.map((account) => ({
    id: account.id,
    label: `${account.publicId} · ${account.programType === 'WARIBA_PERFORMANCE' ? 'Performance' : 'Evaluation'}`,
  }));

  // Membership in the trader's own list is the check. Not a shape test, not a
  // lookup that would tell the caller whether the id exists.
  const requestedAccount = params.account;
  const defaultAccountId =
    requestedAccount && options.some((option) => option.id === requestedAccount)
      ? requestedAccount
      : null;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader description="Une demande est suivie sous une référence. Un opérateur WARIBA y répond dans le fil de la demande — jamais par un autre canal." />
      <NewRequestForm
        accounts={options}
        categories={SUPPORT_CATEGORIES.map((value) => ({
          value,
          label: SUPPORT_CATEGORY_LABELS[value],
        }))}
        defaultCategory={isCategory(params.category) ? params.category : 'general'}
        defaultAccountId={defaultAccountId}
      />
      <p className="text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-tertiary)]">
        Ne partagez jamais de mot de passe, de code de connexion ou de donnée bancaire. Aucun délai
        de réponse n’est affiché tant qu’un SLA opérationnel n’a pas été mesuré.
      </p>
    </div>
  );
}
