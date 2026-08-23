import { redirect } from 'next/navigation';
import { buildBillingView, SAVED_PAYMENT_METHODS_AVAILABLE } from '@wariba/application';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getDb } from '../../../lib/db';
import { ActionLink } from '../../../components/hub/Action';
import { HubEmptyState } from '../../../components/hub/HubEmptyState';
import { PageHeader } from '../../../components/hub/PageHeader';
import { StatusPill } from '../../../components/hub/StatusPill';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';
import { Stagger, StaggerItem } from '../../../components/motion/primitives';
import { HubHeaderSlot } from '../HubHeaderSlot';

export const dynamic = 'force-dynamic';

/**
 * What the trader has bought, and what it cost.
 *
 * ## Why there is no saved-cards section
 *
 * There is no stored-payment-method table, and there should not be one holding
 * card data: cards belong to the payment provider, and a platform that vaults
 * them has taken on PCI scope it has no reason to want. Rendering an empty
 * "Moyens de paiement" panel with an "Ajouter" button that cannot store
 * anything would be a control that lies about what happens when you press it.
 *
 * So this page shows what actually exists — orders, their status, the provider
 * that took the money, and receipts — and says plainly that saved methods
 * arrive with the provider integration.
 */
export default async function BillingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/facturation');

  const billing = await buildBillingView(getDb(), { userId: user.id });

  const addAccount = (
    <ActionLink href="/comptes/nouveau" icon="addAccount" size="sm" variant="secondary">
      Ajouter un compte
    </ActionLink>
  );

  if (billing.empty) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="billing"
          title="Aucun achat pour le moment."
          description="Vos commandes, reçus et paiements apparaîtront ici après votre première évaluation."
          action={
            <ActionLink href="/comptes/nouveau" icon="addAccount">
              Choisir une évaluation
            </ActionLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <HubHeaderSlot>{addAccount}</HubHeaderSlot>

      <PageHeader description="Toutes vos commandes WARIBA, leur statut et leurs reçus." />

      <Stagger className="flex flex-col gap-5">
        <StaggerItem>
          <Surface className="flex flex-col gap-4 p-5 sm:p-6">
            <SurfaceTitle>Total dépensé</SurfaceTitle>
            <p className="wariba-data text-[28px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--wariba-text-primary)]">
              {billing.totalSpentFormatted}
            </p>
            <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              {billing.orders.length} commande{billing.orders.length > 1 ? 's' : ''} · comptes payés
              et activés uniquement
            </p>
          </Surface>
        </StaggerItem>

        <StaggerItem>
          <Surface className="flex flex-col gap-4 p-5 sm:p-6">
            <SurfaceTitle>Commandes</SurfaceTitle>

            {/* A table on desktop, cards on a phone. The same rows either way —
                no column is dropped, the layout changes shape instead. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[color:var(--warix-border-subtle)]">
                    {['Date', 'Produit', 'Montant', 'Statut', 'Reçu'].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="py-2.5 pr-4 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {billing.orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[color:var(--warix-border-subtle)] last:border-0"
                    >
                      <td className="py-3 pr-4 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                        {order.dateLabel}
                      </td>
                      <td className="py-3 pr-4 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
                        {order.productLabel}
                      </td>
                      <td className="wariba-data py-3 pr-4 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
                        {order.amountFormatted}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusPill tone={order.statusTone} size="sm">
                          {order.statusLabel}
                        </StatusPill>
                      </td>
                      <td className="py-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                        {order.receiptDateLabel ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex list-none flex-col gap-2 p-0 md:hidden">
              {billing.orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-[10px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                        {order.productLabel}
                      </p>
                      <p className="mt-0.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                        {order.dateLabel}
                      </p>
                    </div>
                    <StatusPill tone={order.statusTone} size="sm">
                      {order.statusLabel}
                    </StatusPill>
                  </div>
                  <p className="wariba-data mt-2.5 text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                    {order.amountFormatted}
                  </p>
                </li>
              ))}
            </ul>
          </Surface>
        </StaggerItem>

        {SAVED_PAYMENT_METHODS_AVAILABLE ? null : (
          <StaggerItem>
            <Surface className="flex flex-col gap-2 p-5 sm:p-6">
              <SurfaceTitle>Moyens de paiement</SurfaceTitle>
              <p className="text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                WARIBA n’enregistre aucune donnée de carte. Le paiement est traité par le
                prestataire à chaque commande, et l’enregistrement d’un moyen de paiement arrivera
                avec son intégration.
              </p>
            </Surface>
          </StaggerItem>
        )}
      </Stagger>
    </div>
  );
}
