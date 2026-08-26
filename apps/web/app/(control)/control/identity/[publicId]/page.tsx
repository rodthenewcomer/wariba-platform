import { ControlDocumentLink as Link } from '../../../ControlDocumentLink';
import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import { buildControlIdentityDetailView, staffCan } from '@wariba/application';
import { requireControlArea } from '../../../../../lib/staff-auth';
import { getDb } from '../../../../../lib/db';
import { EvidenceTable } from '../../../../../components/support/EvidenceTable';
import { IdentityReviewActions } from './IdentityReviewActions';

export const dynamic = 'force-dynamic';
export default async function IdentityDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const session = await requireControlArea('identity-reviews');
  const { publicId } = await params;
  const detail = await buildControlIdentityDetailView(getDb(), { publicId });
  if (!detail)
    return (
      <EmptyState
        title="Vérification introuvable"
        description="Cette référence n’existe pas."
        action={<Link href="/control/identity">Retour à la file</Link>}
      />
    );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Text as="h1" variant="heading-lg">
            <span className="wariba-data">{detail.publicId}</span>
          </Text>
          <Badge variant="neutral">{detail.statusLabel}</Badge>
        </div>
        <Link href="/control/identity">Retour à la file</Link>
      </div>
      <Card padding="comfortable">
        <div className="grid gap-6 md:grid-cols-2">
          <EvidenceTable
            caption="Trader"
            rows={[
              { label: 'Trader', value: detail.traderEmail },
              { label: 'Compte', value: detail.accountPublicId, numeric: true },
              { label: 'Programme', value: 'WARIBA Performance' },
              {
                label: 'Nominal',
                value: `${detail.nominalBalance} ${detail.currency}`,
                numeric: true,
              },
              { label: 'État du compte', value: detail.accountStatusLabel },
            ]}
          />
          <EvidenceTable
            caption="Vérification"
            rows={[
              { label: 'Motif', value: detail.reasonLabel },
              { label: 'Demandée le', value: detail.requestedAtLabel, numeric: true },
              { label: 'Dernière activité', value: detail.updatedAtLabel, numeric: true },
              { label: 'Opérateur', value: detail.assignedLabel },
              { label: 'Référence externe', value: detail.evidenceReference ?? '—', numeric: true },
            ]}
          />
        </div>
      </Card>
      {detail.decisionReason || detail.traderMessage ? (
        <Card padding="comfortable">
          <Text as="h2" variant="heading-sm">
            Dernière décision
          </Text>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <Text variant="label-sm" color="secondary">
                Motif interne
              </Text>
              <p className="mt-2 whitespace-pre-wrap text-[length:var(--wariba-font-size-body-sm)]">
                {detail.decisionReason ?? '—'}
              </p>
            </div>
            <div>
              <Text variant="label-sm" color="secondary">
                Message au trader
              </Text>
              <p className="mt-2 whitespace-pre-wrap text-[length:var(--wariba-font-size-body-sm)]">
                {detail.traderMessage ?? '—'}
              </p>
            </div>
          </div>
        </Card>
      ) : null}
      {detail.operatorHistory.length > 0 ? (
        <Card padding="comfortable">
          <Text as="h2" variant="heading-sm">
            Historique opérateur
          </Text>
          <ol className="mt-4 divide-y divide-[color:var(--wariba-border-subtle)]">
            {detail.operatorHistory.map((event, index) => (
              <li
                key={`${event.occurredAtLabel}-${index}`}
                className="grid gap-2 py-3 md:grid-cols-[180px_1fr_220px]"
              >
                <span className="font-semibold">{event.actionLabel}</span>
                <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                  {event.reason}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                  {event.actorLabel} · {event.occurredAtLabel}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Action opérateur
        </Text>
        <div className="mt-4">
          <IdentityReviewActions
            publicId={detail.publicId}
            version={detail.version}
            canAssign={staffCan(session.role, 'identity_review.assign')}
            canReview={staffCan(session.role, 'identity_review.review')}
            canDecide={staffCan(session.role, 'identity_review.decide')}
            assignedToMe={detail.assignedStaffId === session.userId}
            isLive={detail.isLive}
          />
        </div>
      </Card>
      <details className="rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] p-4">
        <summary className="cursor-pointer font-semibold">Détails techniques</summary>
        <div className="mt-3">
          <EvidenceTable
            caption="Métadonnées"
            rows={[
              { label: 'Version', value: String(detail.version), numeric: true },
              { label: 'Correlation ID', value: detail.correlationId, numeric: true },
            ]}
          />
        </div>
      </details>
    </div>
  );
}
