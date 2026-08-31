'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackCommerceEvent } from '../../../../components/commerce/commerce-analytics';

type PaymentState = 'ready' | 'submitting' | 'reconciling' | 'failed';

export default function SandboxPayClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order') ?? '';
  const [state, setState] = useState<PaymentState>('ready');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) setError('Identifiant de commande manquant.');
  }, [orderId]);

  const simulate = async (outcome: 'confirmed' | 'failed') => {
    setState('submitting');
    setError(null);
    try {
      const response = await fetch('/api/v1/checkout/sandbox-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, outcome }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: { message: string };
      } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? 'Le webhook de test n’a pas abouti.');
        setState('failed');
        return;
      }
      trackCommerceEvent('commerce_payment_result', { result: outcome, source: 'sandbox' });
      if (outcome === 'failed') {
        setError('Le paiement test a été refusé. Aucun compte n’a été créé.');
        setState('failed');
        return;
      }
      setState('reconciling');
      const statusResponse = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}`, {
        cache: 'no-store',
      });
      const statusBody = (await statusResponse.json().catch(() => null)) as {
        data?: { status: string };
      } | null;
      if (statusBody?.data?.status === 'fulfilled') {
        router.push(`/bienvenue?order=${orderId}`);
        return;
      }
      router.push(`/checkout/success?order=${orderId}`);
    } catch {
      setError('Connexion interrompue. Vérifiez le statut avant de réessayer.');
      setState('failed');
    }
  };

  const retry = async () => {
    setState('submitting');
    setError(null);
    const response = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'resume_order', orderId }),
    });
    const body = (await response.json().catch(() => null)) as {
      data?: { redirectUrl: string; orderId: string };
      error?: { message: string };
    } | null;
    if (!response.ok || !body?.data) {
      setError(body?.error?.message ?? 'La reprise du paiement est impossible.');
      setState('failed');
      return;
    }
    setState('ready');
  };

  return (
    <main
      data-wariba-section="commerce"
      data-theme="light"
      className="min-h-dvh bg-[color:var(--wariba-color-ink-975)] px-4 py-10 text-[color:var(--wariba-color-ink-50)] sm:py-16"
    >
      <div className="mx-auto max-w-2xl">
        <ol
          className="grid grid-cols-3 gap-2 text-xs font-semibold"
          aria-label="Progression du checkout"
        >
          <li className="text-[color:var(--wariba-color-ink-300)]">
            <span className="font-mono">01</span>
            <span className="ml-2 hidden sm:inline">Offre</span>
          </li>
          <li className="text-[color:var(--wariba-color-ink-300)]">
            <span className="font-mono">02</span>
            <span className="ml-2 hidden sm:inline">Vérification</span>
          </li>
          <li
            className="text-right text-[color:var(--wariba-color-cobalt-300)]"
            aria-current="step"
          >
            <span className="font-mono">03</span>
            <span className="ml-2 hidden sm:inline">Paiement</span>
          </li>
        </ol>

        <section className="mt-8 rounded-[var(--wariba-radius-xl)] border border-[color:var(--commerce-rule)] bg-[color:var(--wariba-color-ink-880)] p-6 sm:p-9">
          <p className="commerce-kicker">Environnement local · paiement test</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {state === 'reconciling'
              ? 'Confirmation reçue. Provisioning en cours.'
              : 'Simulez la réponse du prestataire.'}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]">
            Le navigateur ne confirmera jamais lui-même la commande. Ce bouton déclenche un webhook
            signé ; le serveur vérifie ensuite signature, montant, devise et idempotence.
          </p>

          <div className="mt-8 rounded-[var(--wariba-radius-lg)] border border-[color:var(--commerce-rule)] bg-[color:var(--wariba-color-ink-975)] p-4">
            <p className="text-xs text-[color:var(--wariba-color-ink-300)]">Commande</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold">{orderId || '—'}</p>
          </div>

          {state === 'reconciling' ? (
            <div
              role="status"
              className="mt-6 flex items-center gap-3 text-sm text-[color:var(--wariba-color-ink-200)]"
            >
              <span
                className="size-5 animate-spin rounded-full border-2 border-[color:var(--commerce-rule-strong)] border-t-[color:var(--wariba-color-cobalt-700)]"
                aria-hidden="true"
              />
              Création exactement une fois du compte et de son ledger…
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="wariba-reveal mt-6 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-accent-red-edge)] bg-[color:var(--wariba-accent-red-wash)] p-4 text-sm"
            >
              <strong>Le paiement n’a pas abouti.</strong>
              <p className="mt-1">{error}</p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {state === 'failed' ? (
              <button type="button" onClick={retry} className="commerce-primary-action flex-1">
                Réessayer la même commande
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={!orderId || state !== 'ready'}
                  onClick={() => simulate('confirmed')}
                  className="commerce-primary-action flex-1 disabled:opacity-45"
                >
                  Simuler la réussite
                </button>
                <button
                  type="button"
                  disabled={!orderId || state !== 'ready'}
                  onClick={() => simulate('failed')}
                  className="commerce-secondary-action flex-1 disabled:opacity-45"
                >
                  Simuler un refus
                </button>
              </>
            )}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]">
            Aucun moyen de paiement réel n’est appelé. Aucun numéro de carte, Mobile Money ou donnée
            bancaire n’est collecté.
          </p>
        </section>
      </div>
    </main>
  );
}
