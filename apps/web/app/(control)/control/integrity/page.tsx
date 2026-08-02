import { EmptyState, Text } from '@wariba/ui';

export default function ControlIntegrityPage() {
  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Integrity
      </Text>
      <EmptyState
        title="Aucun signal"
        description="Les signaux d'intégrité et la revue humaine arrivent avec Prompt 09."
      />
    </div>
  );
}
