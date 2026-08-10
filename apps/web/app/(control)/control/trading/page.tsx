import { EmptyState, Text } from '@wariba/ui';
import { requireControlArea } from '../../../../lib/staff-auth';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

/**
 * Prompt 09 milestone 1 — the area exists and is authorized now, so its
 * boundary is provable before any data lands on it. Content arrives in the
 * milestone named below; the guard above is already the real one.
 */
export default async function ControlTradingPage() {
  await requireControlArea('trading');

  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Trading
      </Text>
      <EmptyState
        title="Trading"
        description="L’inspection des ordres et positions arrive avec le jalon 3 de Prompt 09."
      />
    </div>
  );
}
