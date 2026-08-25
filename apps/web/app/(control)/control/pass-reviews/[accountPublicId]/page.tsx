import { ControlDocumentLink as Link } from '../../../ControlDocumentLink';
import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import { buildControlPassReviewDetailView, staffCan } from '@wariba/application';
import { requireControlArea } from '../../../../../lib/staff-auth';
import { getDb } from '../../../../../lib/db';
import { EvidenceTable } from '../../../../../components/support/EvidenceTable';
import { ControlPassReviewActions } from './ControlPassReviewActions';

export const dynamic = 'force-dynamic';

export default async function PassReviewDetailPage({
  params,
}: {
  params: Promise<{ accountPublicId: string }>;
}) {
  const session = await requireControlArea('pass-reviews');
  const { accountPublicId } = await params;
  const detail = await buildControlPassReviewDetailView(getDb(), { accountPublicId });
  if (!detail) {
    return (
      <EmptyState
        title="Évaluation introuvable"
        description="Ce compte n’est pas dans le cycle de passage."
        action={<Link href="/control/pass-reviews">Retour à la file</Link>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Text as="h1" variant="heading-lg">
            <span className="wariba-data">{detail.accountPublicId}</span>
          </Text>
          <Badge variant={detail.lifecycleStatus === 'passed' ? 'success' : 'review'}>
            {detail.lifecycleStatusLabel}
          </Badge>
        </div>
        <Link href="/control/pass-reviews">Retour à la file</Link>
      </div>

      <Card padding="comfortable">
        <div className="grid gap-6 md:grid-cols-2">
          <EvidenceTable
            caption="Trader et compte"
            rows={[
              { label: 'Trader', value: detail.traderLabel },
              { label: 'Compte', value: detail.accountPublicId, numeric: true },
              { label: 'Programme', value: 'WARIBA ONE' },
              { label: 'Nominal', value: detail.nominalLabel, numeric: true },
              { label: 'Activation', value: detail.activatedAtLabel, numeric: true },
              { label: 'État', value: detail.lifecycleStatusLabel },
            ]}
          />
          <EvidenceTable
            caption="Références système"
            rows={[
              { label: 'Règles', value: `WARIBA ONE ${detail.policyVersion}`, numeric: true },
              { label: 'Entrée en traitement', value: detail.reviewEnteredAtLabel, numeric: true },
              { label: 'Finalisation', value: detail.passedAtLabel ?? 'En cours', numeric: true },
              {
                label: 'Compte Performance',
                value: detail.performanceAccountPublicId ?? 'Non créé',
                numeric: true,
              },
            ]}
          />
        </div>
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Contrôles du système
        </Text>
        <ul className="mt-4 divide-y divide-[color:var(--wariba-border-subtle)]">
          {detail.conditions.map((condition) => (
            <li
              key={condition.label}
              className="grid gap-2 py-3 sm:grid-cols-[24px_minmax(0,1fr)_minmax(180px,auto)]"
            >
              <span aria-label={condition.met ? 'Satisfait' : 'Non satisfait'}>
                {condition.met ? '✓' : '○'}
              </span>
              <span className="font-semibold text-[color:var(--wariba-text-primary)]">
                {condition.label}
              </span>
              <span className="wariba-data text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                {condition.detail}
              </span>
            </li>
          ))}
          <li className="grid gap-2 py-3 sm:grid-cols-[24px_minmax(0,1fr)_minmax(180px,auto)]">
            <span aria-label={detail.finalization.performanceCreated ? 'Satisfait' : 'En attente'}>
              {detail.finalization.performanceCreated ? '✓' : '○'}
            </span>
            <span className="font-semibold text-[color:var(--wariba-text-primary)]">
              Finalisation
            </span>
            <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
              {detail.finalization.label}
            </span>
          </li>
        </ul>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <EvidenceTable
            caption="Perte quotidienne"
            rows={[
              { label: 'Marge restante', value: detail.risk.dailyLossRemaining, numeric: true },
            ]}
          />
          <EvidenceTable
            caption="Perte maximale"
            rows={[
              { label: 'Marge restante', value: detail.risk.maximumLossRemaining, numeric: true },
            ]}
          />
          <EvidenceTable
            caption="Equity"
            rows={[{ label: 'Valeur actuelle', value: detail.risk.currentEquity, numeric: true }]}
          />
        </div>
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Suivi opérateur
        </Text>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <ControlPassReviewActions
            accountPublicId={detail.accountPublicId}
            canReview={staffCan(session.role, 'pass_review.review')}
            canEscalate={staffCan(session.role, 'pass_review.escalate')}
            resultFinalized={detail.operatorActionAuthorized}
            version={detail.operatorVersion}
          />
          <EvidenceTable
            caption="Dernière revue"
            rows={[
              { label: 'Statut', value: detail.operatorStatusLabel },
              { label: 'Opérateur', value: detail.assignedStaffEmail ?? 'Non affectée' },
              { label: 'Date', value: detail.operatorReviewedAtLabel ?? '—', numeric: true },
              { label: 'Motif', value: detail.operatorReason ?? '—' },
            ]}
          />
        </div>
      </Card>

      {detail.operatorHistory.length > 0 ? (
        <Card padding="comfortable">
          <Text as="h2" variant="heading-sm">
            Historique opérateur
          </Text>
          <ol className="mt-4 divide-y divide-[color:var(--wariba-border-subtle)]">
            {detail.operatorHistory.map((event, index) => (
              <li
                key={`${event.occurredAtLabel}-${index}`}
                className="grid gap-2 py-3 md:grid-cols-[190px_1fr_230px]"
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
    </div>
  );
}
