import { Alert, EmptyState, Text } from '@wariba/ui';

export default function PayoutsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Payouts
      </Text>

      <Alert level="information" title="Compte Performance requis">
        Le Payout Center s&apos;active après réussite de WARIBA ONE et l&apos;éligibilité au premier
        cycle. Formule, checklist et revue humaine arrivent avec Prompt 08 (Performance &amp;
        Payout).
      </Alert>

      <EmptyState
        title="Aucun payout disponible"
        description="Vous devez d'abord réussir WARIBA ONE puis atteindre le seuil du cycle Performance."
      />
    </div>
  );
}
