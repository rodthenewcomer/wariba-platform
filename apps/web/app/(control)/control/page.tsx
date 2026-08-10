import Link from 'next/link';
import { ReserveCoverage, Text, buttonClassNames } from '@wariba/ui';
import { buildControlReserveView } from '@wariba/application';
import { requireStaffRole } from '../../../lib/staff-auth';
import { getDb } from '../../../lib/db';

// requireStaffRole() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

export default async function ControlPage() {
  await requireStaffRole();
  const reserve = await buildControlReserveView(getDb());

  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Overview
      </Text>

      <div className="max-w-md">
        <ReserveCoverage
          reserveFormatted={reserve.reserveFormatted}
          projectedPayouts30dFormatted={reserve.projectedPayouts30dFormatted}
          coverageRatioFormatted={reserve.coverageRatioFormatted}
          zone={reserve.zone}
        />
      </div>

      <Link href="/control/payouts" className={buttonClassNames()}>
        Ouvrir la file de payout
      </Link>
      <Link href="/control/actuarial" className={buttonClassNames({ variant: 'secondary' })}>
        Ouvrir les scénarios actuariels
      </Link>
      <Link href="/control/treasury" className={buttonClassNames({ variant: 'secondary' })}>
        Ouvrir la trésorerie
      </Link>
    </div>
  );
}
