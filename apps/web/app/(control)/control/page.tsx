import { Alert, EmptyState, ReserveCoverage, Text } from '@wariba/ui';

export default function ControlPage() {
  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Overview
      </Text>

      <Alert level="information" title="Aucun RBAC actif — shell de fondation">
        Ce dashboard affiche la structure visuelle avec des données DEMO. L&apos;authentification
        staff, le sous-domaine dédié et les permissions réelles arrivent avec Prompt 09 (WARIBA
        Control).
      </Alert>

      <div className="max-w-md">
        <ReserveCoverage
          reserveFormatted="0 USD (DEMO)"
          projectedPayouts30dFormatted="0 USD (DEMO)"
          coverageRatioFormatted="—"
          zone="normal"
        />
      </div>

      <EmptyState
        title="Aucune file de payout"
        description="La file d'approbation payout arrive avec Prompt 08 et Prompt 09."
      />
    </div>
  );
}
