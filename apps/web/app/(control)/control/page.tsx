import { Alert, EmptyState, ReserveCoverage, Text } from '@wariba/ui';
import { requireStaffRole } from '../../../lib/staff-auth';

// requireStaffRole() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

export default async function ControlPage() {
  await requireStaffRole();

  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Overview
      </Text>

      <Alert level="information" title="Données DEMO — RBAC actif, contenu réel à venir">
        L&apos;authentification staff et les permissions par rôle sont actives (Prompt 7 Appendix
        07-B). Les chiffres ci-dessous restent des données DEMO ; les vraies requêtes arrivent avec
        Prompt 09 (WARIBA Control).
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
