'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { trackCommerceEvent } from '../../../components/commerce/commerce-analytics';
import {
  FAMILY_META,
  formatMultiple,
  formatNominal,
  formatRate,
  formatXof,
} from '../../../components/commerce/offer-ui';

export interface CommerceCheckoutContext {
  mode: 'initial_purchase' | 'flex_activation';
  offer: CanonicalOfferReadModel;
  payableAmount: string;
  payableCurrency: string;
  policyVersion: string;
  activationOrderId: string | null;
  activationDueAt: string | null;
}

export function CheckoutClient({ context }: { context: CommerceCheckoutContext }) {
  const router = useRouter();
  const meta = FAMILY_META[context.offer.productFamily];
  const evaluation = context.offer.evaluationRules;
  const performance = context.offer.performanceRules;
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const submit = async () => {
    if (!accepted || pending) return;
    setPending(true);
    setError(null);
    trackCommerceEvent('commerce_checkout_submitted', {
      offerId: context.offer.offerId,
      source: context.mode,
    });
    try {
      const payload =
        context.mode === 'initial_purchase'
          ? {
              kind: 'initial_purchase' as const,
              offerId: context.offer.offerId,
              idempotencyKey,
              acceptSimulatedAccountDisclosure: true,
            }
          : {
              kind: 'flex_activation' as const,
              activationOrderId: context.activationOrderId,
              acceptSimulatedAccountDisclosure: true,
            };
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as {
        data?: { orderId: string; redirectUrl: string };
        error?: { message: string };
      } | null;
      if (!response.ok || !body?.data) {
        setError(body?.error?.message ?? 'Le checkout ne peut pas continuer pour le moment.');
        setPending(false);
        return;
      }
      trackCommerceEvent('commerce_payment_started', { offerId: context.offer.offerId });
      const separator = body.data.redirectUrl.includes('?') ? '&' : '?';
      router.push(`${body.data.redirectUrl}${separator}order=${body.data.orderId}`);
    } catch {
      setError('Connexion interrompue. Votre commande n’a pas été dupliquée : réessayez.');
      setPending(false);
    }
  };

  return (
    <main
      data-wariba-section="commerce"
      data-theme="light"
      className="min-h-dvh bg-[color:var(--wariba-color-ink-975)] pb-36 text-[color:var(--wariba-color-ink-50)] lg:pb-16"
    >
      <div className="border-b border-[color:var(--commerce-rule)] bg-[color:var(--wariba-color-ink-880)]">
        <div className="commerce-shell py-5">
          <ol
            className="grid grid-cols-3 gap-2 text-xs font-semibold"
            aria-label="Progression du checkout"
          >
            <li className="text-[color:var(--wariba-color-ink-300)]">
              <span className="font-mono">01</span>
              <span className="ml-2 hidden sm:inline">Offre</span>
            </li>
            <li className="text-[color:var(--wariba-color-cobalt-300)]" aria-current="step">
              <span className="font-mono">02</span>
              <span className="ml-2 hidden sm:inline">Vérification</span>
            </li>
            <li className="text-right text-[color:var(--wariba-color-ink-300)]">
              <span className="font-mono">03</span>
              <span className="ml-2 hidden sm:inline">Paiement</span>
            </li>
          </ol>
        </div>
      </div>

      <div className="commerce-shell grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <div className="min-w-0">
          <p className="commerce-kicker">
            {context.mode === 'flex_activation'
              ? 'Activation FLEX'
              : `WARIBA ${meta.short} · ${context.offer.sizeCode}`}
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            {context.mode === 'flex_activation'
              ? 'Votre Evaluation est réussie. Vérifiez la dernière étape.'
              : 'Vérifiez les règles avant de continuer.'}
          </h1>
          <p className="commerce-lead mt-5 max-w-2xl">
            Cette acceptation est horodatée et liée à la policy {context.policyVersion}. Le prix et
            les règles ne sont jamais recalculés dans le navigateur.
          </p>

          <section
            className="mt-10 border-t border-[color:var(--commerce-rule)] pt-8"
            aria-labelledby="order-title"
          >
            <h2 id="order-title" className="text-xl font-semibold">
              Votre sélection
            </h2>
            <dl className="mt-5 grid gap-px overflow-hidden rounded-[var(--wariba-radius-lg)] border border-[color:var(--commerce-rule)] bg-[color:var(--commerce-rule)] sm:grid-cols-3">
              <div className="commerce-stat">
                <dt>Parcours</dt>
                <dd>{meta.short}</dd>
              </div>
              <div className="commerce-stat">
                <dt>Compte simulé</dt>
                <dd>{formatNominal(context.offer.nominalBalance)}</dd>
              </div>
              <div className="commerce-stat">
                <dt>Départ</dt>
                <dd>{context.offer.entryPhase === 'evaluation' ? 'Evaluation' : 'Performance'}</dd>
              </div>
            </dl>
          </section>

          <section
            className="mt-10 border-t border-[color:var(--commerce-rule)] pt-8"
            aria-labelledby="rules-title"
          >
            <h2 id="rules-title" className="text-xl font-semibold">
              Règles essentielles
            </h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {evaluation ? (
                <div className="commerce-checkout-rule">
                  <dt>Objectif réalisé</dt>
                  <dd>{formatRate(evaluation.profitTargetRate)}</dd>
                </div>
              ) : null}
              <div className="commerce-checkout-rule">
                <dt>Perte quotidienne</dt>
                <dd>{formatRate(evaluation?.dailyLossRate ?? performance.dailyLossRate)}</dd>
              </div>
              <div className="commerce-checkout-rule">
                <dt>Perte maximale</dt>
                <dd>{formatRate(evaluation?.maximumLossRate ?? performance.maximumLossRate)}</dd>
              </div>
              <div className="commerce-checkout-rule">
                <dt>Best Day maximum</dt>
                <dd>
                  {formatRate(evaluation?.bestDayMaximumRate ?? performance.bestDayMaximumRate)}
                </dd>
              </div>
              <div className="commerce-checkout-rule">
                <dt>Buffer Performance</dt>
                <dd>{formatRate(performance.permanentBufferRate)}</dd>
              </div>
              <div className="commerce-checkout-rule">
                <dt>Exposition brute max.</dt>
                <dd>{formatMultiple(performance.grossExposureMaximumMultiple)}</dd>
              </div>
            </dl>
          </section>

          {context.offer.productFamily === 'WARIBA_FLEX' ? (
            <section
              className="mt-10 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-accent-copper-edge)] bg-[color:var(--wariba-accent-copper-wash)] p-5 sm:p-6"
              aria-labelledby="flex-price-title"
            >
              <h2 id="flex-price-title" className="text-base font-semibold">
                Le calendrier FLEX, sans surprise
              </h2>
              {context.mode === 'initial_purchase' ? (
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-color-ink-200)]">
                  Vous réglez {formatXof(context.offer.upfrontPrice)} aujourd’hui. En cas de
                  réussite, l’activation sera de {formatXof(context.offer.activationPrice)}. Ce
                  montant est figé dès cet achat ; le total si réussite est{' '}
                  {formatXof(context.offer.totalPriceIfSuccess)}.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-color-ink-200)]">
                  Le montant de {formatXof(context.payableAmount)} est celui figé lors de votre
                  achat initial, pas le prix du catalogue actuel.
                  {context.activationDueAt
                    ? ` L’activation reste disponible jusqu’au ${new Date(context.activationDueAt).toLocaleDateString('fr-FR', { dateStyle: 'long', timeZone: 'UTC' })}.`
                    : ''}
                </p>
              )}
            </section>
          ) : null}

          <label className="mt-10 flex cursor-pointer gap-4 rounded-[var(--wariba-radius-lg)] border border-[color:var(--commerce-rule-strong)] bg-[color:var(--wariba-color-ink-880)] p-5">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 size-5 shrink-0 accent-[color:var(--wariba-color-cobalt-700)]"
            />
            <span className="text-sm leading-relaxed text-[color:var(--wariba-color-ink-200)]">
              J’accepte la divulgation de compte simulé et les règles WARIBA {meta.short} version{' '}
              {context.policyVersion}. Je comprends que le nominal n’est pas un dépôt et qu’aucun
              résultat n’est garanti.
            </span>
          </label>

          {error ? (
            <div
              role="alert"
              className="wariba-reveal mt-5 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-accent-red-edge)] bg-[color:var(--wariba-accent-red-wash)] p-4 text-sm text-[color:var(--wariba-color-ink-100)]"
            >
              <strong>Impossible de continuer.</strong>
              <p className="mt-1">{error}</p>
            </div>
          ) : null}
        </div>

        <aside
          className="commerce-checkout-summary hidden lg:block"
          aria-label="Total de la commande"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--wariba-color-ink-300)]">
            Total à régler
          </p>
          <p className="mt-3 font-mono text-3xl font-semibold">
            {formatXof(context.payableAmount)}
          </p>
          <p className="mt-2 text-xs text-[color:var(--wariba-color-ink-300)]">
            Prix serveur · {context.payableCurrency} · policy {context.policyVersion}
          </p>
          <button
            type="button"
            disabled={!accepted || pending}
            onClick={submit}
            className="commerce-primary-action mt-7 w-full disabled:cursor-not-allowed disabled:opacity-45"
            data-testid="checkout-submit"
          >
            {pending ? 'Préparation sécurisée…' : 'Continuer vers le paiement test'}
          </button>
          <p className="mt-4 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]">
            Aucun paiement réel dans l’environnement local. La confirmation passera néanmoins par le
            webhook signé et le même contrôle d’idempotence.
          </p>
        </aside>
      </div>

      <div className="commerce-mobile-paybar lg:hidden" aria-label="Total de la commande">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--wariba-color-ink-300)]">
            Total à régler
          </p>
          <p className="truncate font-mono text-lg font-semibold">
            {formatXof(context.payableAmount)}
          </p>
        </div>
        <button
          type="button"
          disabled={!accepted || pending}
          onClick={submit}
          className="commerce-primary-action shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-45"
          data-testid="checkout-submit-mobile"
        >
          {pending ? 'Préparation…' : 'Continuer'}
        </button>
      </div>
    </main>
  );
}
