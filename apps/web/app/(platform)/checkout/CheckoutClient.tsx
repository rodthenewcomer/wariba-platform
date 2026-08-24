'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Checkbox, Text } from '@wariba/ui';
import type { CheckoutContextDTO } from '@wariba/application';
import { formatFcfa, formatUsd } from '../../../lib/pricing-format';

export interface CheckoutClientProps {
  context: CheckoutContextDTO;
}

export function CheckoutClient({ context }: CheckoutClientProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const handleConfirm = async () => {
    if (!accepted) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCode: context.offer.code,
          idempotencyKey,
          acceptSimulatedAccountDisclosure: true,
        }),
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <Card padding="comfortable" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading-lg">
            Résumé de la commande
          </Text>
          <Text variant="body-sm" color="secondary">
            WARIBA ONE — {context.offer.code} — {formatUsd(context.offer.nominalBalance)} simulés
          </Text>
        </div>

        <div className="grid gap-4 border-y border-[color:var(--wariba-border-subtle)] py-5 sm:grid-cols-2">
          <div>
            <Text variant="label-sm" color="tertiary">
              Total à régler
            </Text>
            <Text variant="heading-md">{formatFcfa(context.offer.priceAmount)}</Text>
          </div>
          <div>
            <Text variant="label-sm" color="tertiary">
              Policy WARIBA ONE
            </Text>
            <Text variant="heading-sm">Version {context.policyVersion}</Text>
          </div>
        </div>

        <Alert level="information" title="Compte simulé">
          La taille nominale n&apos;est pas un dépôt vous appartenant. Aucun frais
          d&apos;activation, aucun capital réel et aucun paiement réel dans cette bêta privée.
        </Alert>

        <div>
          <Text as="h2" variant="heading-sm" className="mb-3">
            Règles essentielles
          </Text>
          <ul className="grid list-disc gap-2 pl-5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)] sm:grid-cols-2">
            <li>Objectif de profit réalisé : 10 %</li>
            <li>Perte quotidienne : 3 %, blocage jusqu’au prochain reset</li>
            <li>Perte maximale : 10 %, plancher recalculé en fin de journée</li>
            <li>Meilleur Jour : 50 %, ne termine jamais le compte</li>
            <li>Aucun nombre minimum de jours</li>
            <li>Aucune journée qualifiée exigée pendant l’évaluation</li>
          </ul>
        </div>

        <Checkbox
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          label={`J'accepte la divulgation de compte simulé liée aux règles WARIBA ONE ${context.policyVersion}.`}
          helperText="Cette acceptation est versionnée, horodatée et conservée comme preuve."
        />

        {error && (
          <Alert level="danger" title="Paiement impossible">
            {error}
          </Alert>
        )}

        <Button
          size="lg"
          loading={pending}
          disabled={!accepted || pending}
          onClick={handleConfirm}
          className="w-full"
        >
          Continuer vers le paiement
        </Button>
      </Card>
    </div>
  );
}
