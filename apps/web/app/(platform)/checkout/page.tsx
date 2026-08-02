'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Card, Text } from '@wariba/ui';

const PRODUCT_LABELS: Record<string, string> = {
  '5K': '5 000 USD',
  '10K': '10 000 USD',
  '25K': '25 000 USD',
  '50K': '50 000 USD',
  '100K': '100 000 USD',
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageContent />
    </Suspense>
  );
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productCode = searchParams.get('product') ?? '';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode, idempotencyKey: crypto.randomUUID() }),
      });
      const body = (await response.json()) as {
        data?: { orderId: string; redirectUrl: string };
        error?: { message: string };
      };
      if (!response.ok || !body.data) {
        setError(body.error?.message ?? 'Une erreur est survenue.');
        setPending(false);
        return;
      }
      router.push(`${body.data.redirectUrl}&order=${body.data.orderId}`);
    } catch {
      setError('Connexion impossible. Réessayez.');
      setPending(false);
    }
  };

  if (!PRODUCT_LABELS[productCode]) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <Alert level="danger" title="Offre introuvable">
          Retournez à la page des offres pour choisir une évaluation.
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <Card padding="comfortable" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading-lg">
            Résumé de la commande
          </Text>
          <Text variant="body-sm" color="secondary">
            WARIBA ONE — {PRODUCT_LABELS[productCode]}
          </Text>
        </div>

        <Alert level="information" title="Compte simulé">
          Ce paiement active un environnement de trading simulé. La taille nominale n&apos;est pas
          un dépôt vous appartenant. Aucun frais d&apos;activation.
        </Alert>

        {error && (
          <Alert level="danger" title="Paiement impossible">
            {error}
          </Alert>
        )}

        <Button size="lg" loading={pending} onClick={handleConfirm} className="w-full">
          Payer (sandbox)
        </Button>
      </Card>
    </div>
  );
}
