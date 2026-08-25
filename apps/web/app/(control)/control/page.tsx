import { ControlDocumentLink as Link } from '../ControlDocumentLink';
import {
  Badge,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  Text,
} from '@wariba/ui';
import { buildControlOverviewView } from '@wariba/application';
import { requireControlArea } from '../../../lib/staff-auth';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export default async function ControlPage() {
  const session = await requireControlArea('overview');
  const overview = await buildControlOverviewView(getDb(), {
    staffId: session.userId,
    role: session.role,
  });

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Text as="h1" variant="heading-lg">
          Vue d’ensemble
        </Text>
        <Text variant="body-sm" color="secondary">
          Ce qui nécessite une attention humaine maintenant.
        </Text>
      </div>

      <section aria-labelledby="attention-title" className="flex flex-col gap-3">
        <Text as="h2" id="attention-title" variant="heading-sm">
          À traiter
        </Text>
        {overview.queues.length === 0 ? (
          <EmptyState
            title="Aucune file pour ce rôle"
            description="Votre rôle ne dispose d’aucune file opérationnelle sur cet écran."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overview.queues.map((queue) => (
              <Link
                key={queue.kind}
                href={queue.href}
                className="group rounded-[var(--wariba-radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-focus-ring)]"
              >
                <Card
                  padding="comfortable"
                  className="h-full transition-colors group-hover:border-[color:var(--wariba-border-default)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Text as="h3" variant="label-md">
                      {queue.label}
                    </Text>
                    <span className="wariba-data text-2xl font-semibold text-[color:var(--wariba-text-primary)]">
                      {queue.count}
                    </span>
                  </div>
                  <Text variant="body-sm" color="secondary">
                    Plus ancien : {queue.oldestLabel}
                  </Text>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <OverviewTable
          title="Affectés à moi"
          emptyTitle="Aucun dossier affecté"
          emptyDescription="Aucun dossier actif ne vous est actuellement affecté."
          items={overview.assigned}
        />
        <OverviewTable
          title="Dossiers les plus anciens"
          emptyTitle="Aucun dossier actif"
          emptyDescription="Aucun dossier accessible à votre rôle n’est en attente."
          items={overview.aging}
        />
      </div>

      <section aria-labelledby="decisions-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text as="h2" id="decisions-title" variant="heading-sm">
            Décisions opérateur récentes
          </Text>
          <Badge variant="neutral">{overview.decisions.length}</Badge>
        </div>
        {overview.decisions.length === 0 ? (
          <EmptyState
            title="Aucune décision récente"
            description="Aucune décision correspondant à vos autorisations n’a été enregistrée."
          />
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Décision</DataTableHeaderCell>
                <DataTableHeaderCell>Référence</DataTableHeaderCell>
                <DataTableHeaderCell>Opérateur</DataTableHeaderCell>
                <DataTableHeaderCell>Motif</DataTableHeaderCell>
                <DataTableHeaderCell>Date</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {overview.decisions.map((item, index) => (
                <DataTableRow key={`${item.action}-${item.occurredAt.toISOString()}-${index}`}>
                  <DataTableCell>{item.actionLabel}</DataTableCell>
                  <DataTableCell>
                    <span className="wariba-data">{item.publicId ?? '—'}</span>
                  </DataTableCell>
                  <DataTableCell>{item.actorEmail ?? 'Opérateur'}</DataTableCell>
                  <DataTableCell>
                    <span className="line-clamp-2 max-w-[52ch]">{item.reason ?? '—'}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="wariba-data">{item.occurredAtLabel}</span>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </section>
    </div>
  );
}

function OverviewTable({
  title,
  emptyTitle,
  emptyDescription,
  items,
}: {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  items: readonly {
    kind: string;
    publicId: string;
    href: string;
    kindLabel: string;
    statusLabel: string;
    ageLabel: string;
  }[];
}) {
  return (
    <section className="min-w-0 flex flex-col gap-3">
      <Text as="h2" variant="heading-sm">
        {title}
      </Text>
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Référence</DataTableHeaderCell>
              <DataTableHeaderCell>File</DataTableHeaderCell>
              <DataTableHeaderCell>Statut</DataTableHeaderCell>
              <DataTableHeaderCell>Âge</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {items.map((item) => (
              <DataTableRow key={`${item.kind}-${item.publicId}`}>
                <DataTableCell>
                  <Link
                    href={item.href}
                    className="wariba-data font-semibold underline-offset-2 hover:underline"
                  >
                    {item.publicId}
                  </Link>
                </DataTableCell>
                <DataTableCell>{item.kindLabel}</DataTableCell>
                <DataTableCell>{item.statusLabel}</DataTableCell>
                <DataTableCell>{item.ageLabel}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </section>
  );
}
