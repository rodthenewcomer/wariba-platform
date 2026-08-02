import { EmptyState, Text } from '@wariba/ui';

export default function ControlPayoutsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Payout queue
      </Text>
      <EmptyState
        title="Aucune demande de payout"
        description="La file de revue payout arrive avec Prompt 08 et Prompt 09."
      />
    </div>
  );
}
