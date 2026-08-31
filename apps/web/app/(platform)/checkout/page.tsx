import { getCanonicalV2Offer, getCommerceOrderStatusForUser } from '@wariba/application';
import { getDb } from '../../../lib/db';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { CheckoutClient, type CommerceCheckoutContext } from './CheckoutClient';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string; activation?: string }>;
}) {
  const { offer: offerId, activation: activationOrderId } = await searchParams;
  const db = getDb();
  let context: CommerceCheckoutContext | undefined;

  if (activationOrderId) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const order = user
      ? await getCommerceOrderStatusForUser(db, activationOrderId, user.id)
      : undefined;
    if (order?.orderKind === 'flex_activation') {
      const canonical = await getCanonicalV2Offer(db, `FLEX-${order.productCode.replace('K', '')}`);
      if (canonical) {
        context = {
          mode: 'flex_activation',
          offer: canonical,
          payableAmount: order.totalAmount,
          payableCurrency: order.totalCurrency,
          policyVersion: order.policyVersion,
          activationOrderId: order.id,
          activationDueAt: order.activationDueAt,
        };
      }
    }
  } else if (offerId) {
    const offer = await getCanonicalV2Offer(db, offerId);
    if (offer) {
      context = {
        mode: 'initial_purchase',
        offer,
        payableAmount: offer.upfrontPrice,
        payableCurrency: offer.priceCurrency,
        policyVersion: offer.policySemanticVersion,
        activationOrderId: null,
        activationDueAt: null,
      };
    }
  }

  if (!context) {
    return (
      <main
        data-wariba-section="commerce"
        data-theme="light"
        className="min-h-dvh bg-[color:var(--wariba-color-ink-975)] px-4 py-16"
      >
        <div className="mx-auto max-w-xl rounded-[var(--wariba-radius-xl)] border border-[color:var(--commerce-rule)] bg-[color:var(--wariba-color-ink-880)] p-6 sm:p-8">
          <p className="commerce-kicker">Checkout V2</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--wariba-color-ink-50)]">
            Offre introuvable
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]">
            Revenez au catalogue et choisissez l’une des quinze offres V2.
          </p>
          <a href="/offres" className="commerce-primary-action mt-7">
            Voir les offres
          </a>
        </div>
      </main>
    );
  }
  return <CheckoutClient context={context} />;
}
