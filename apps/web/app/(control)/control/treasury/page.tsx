import { Card, Text } from '@wariba/ui';
import { buildControlReserveView } from '@wariba/application';
import { getDb } from '../../../../lib/db';
import { requireStaffRole } from '../../../../lib/staff-auth';
import { TreasuryReserveManager } from './TreasuryReserveManager';

export const dynamic = 'force-dynamic';

export default async function ControlTreasuryPage() {
  await requireStaffRole('finance');
  const reserve = await buildControlReserveView(getDb());
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Text as="h1" variant="heading-lg">
          Treasury
        </Text>
        <Text variant="body-sm" color="secondary">
          Réserve {reserve.reserveFormatted} · Projection 30 jours{' '}
          {reserve.projectedPayouts30dFormatted} · Couverture {reserve.coverageRatioFormatted}
        </Text>
      </div>
      <Card padding="comfortable" className="flex flex-col gap-4">
        <Text as="h2" variant="heading-sm">
          Écriture de réserve
        </Text>
        <TreasuryReserveManager />
      </Card>
    </div>
  );
}
