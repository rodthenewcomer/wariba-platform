'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Card, Text } from '@wariba/ui';

/**
 * Simulates the PSP's hosted payment page. Confirming here does NOT
 * directly confirm the order — it asks the server to simulate the PSP
 * sending its webhook, exactly the same signed-webhook path a real PSP
 * would use. The browser never marks a payment confirmed; see
 * app/api/v1/checkout/sandbox-pay/route.ts and the webhook handler.
 */
export default function SandboxPayPage() {
  return (
    <Suspense fallback={null}>
      <SandboxPayPageContent />
    </Suspense>
  );
}

function SandboxPayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order') ?? '';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = async (outcome: 'confirmed' | 'failed') => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/checkout/sandbox-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, outcome }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message: string };
        } | null;
        setError(body?.error?.message ?? 'Une erreur est survenue.');
        setPending(false);
        return;
      }
      router.push(
        outcome === 'confirmed'
          ? `/checkout/success?order=${orderId}`
          : `/checkout/echec?order=${orderId}`,
      );
    } catch {
      setError('Connexion impossible. Réessayez.');
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <Card padding="comfortable" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading-lg">
            Paiement sandbox
          </Text>
          <Text variant="body-sm" color="secondary">
            Page de test — aucun paiement réel n&apos;est traité.
          </Text>
        </div>

        {error && (
          <Alert level="danger" title="Erreur">
            {error}
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            loading={pending}
            onClick={() => simulate('confirmed')}
            className="w-full"
          >
            Simuler un paiement réussi
          </Button>
          <Button
            size="lg"
            variant="secondary"
            loading={pending}
            onClick={() => simulate('failed')}
            className="w-full"
          >
            Simuler un échec
          </Button>
        </div>
      </Card>
    </div>
  );
}
