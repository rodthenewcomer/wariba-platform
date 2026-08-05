import { EmptyState, Text } from '@wariba/ui';
import { requireStaffRole } from '../../../../lib/staff-auth';

// requireStaffRole() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

export default async function ControlUsersPage() {
  await requireStaffRole('support');

  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="heading-lg">
        Users
      </Text>
      <EmptyState
        title="Aucun utilisateur"
        description="La vue utilisateur réelle arrive avec Prompt 09 (WARIBA Control)."
      />
    </div>
  );
}
