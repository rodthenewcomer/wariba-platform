import { Card, Text } from '@wariba/ui';

export default function ControlLoading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <Text as="h1" variant="heading-lg">
        Chargement
      </Text>
      <Card padding="comfortable">
        <Text variant="body-sm" color="secondary">
          Chargement des dossiers opérationnels…
        </Text>
      </Card>
    </div>
  );
}
